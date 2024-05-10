import { Messages } from "../Messages";
import { AntPlusSensor } from "../sensors/AntPlusSensor";
import { CadenceSensorState } from "../sensors/CadenceSensorState";
import { Page, PageState } from "../ant";
import { GarminStick3 } from "../GarminStick3";
import { GarminStick2 } from "../GarminStick2";

const CHANNEL = 4;
const DEVICEID = 0xf00d;
const PERIOD = 8102;
const DEVICE_TYPE = 0x7a;
let toggle_bit = 0x80;

export class CadenceSensorTx extends AntPlusSensor {
  private event_count = 0;
  private event_time = 0;
  private state?: CadenceSensorState;
  private page: Page = {
    oldPage: -1,
    pageState: PageState.INIT_PAGE
  };

  public async attachSensor(channel: number, deviceID: number) {
    await super.attach({
      channel: CHANNEL,
      type: "transmit",
      deviceID: DEVICEID,
      deviceType: DEVICE_TYPE,
      transmissionType: 1337,
      timeout: 2000,
      period: PERIOD
    });
    this.state = new CadenceSensorState(DEVICEID);
  }

  protected updateState(deviceId: number, data: DataView) {
    console.log("CadenceSensorTx updateState", data);
    if (!this.state) {
      throw new Error("CadenceSensorTx: not attached");
    }
    this.state.DeviceID = deviceId;
    const updatedState = this.state.updateState(data);
    this.emit("hbdata", updatedState);
    this.emit("hbData", updatedState);
  }

  public broadcast(cadence: number) {
    this.event_count++;
    this.event_count = this.event_count % 255;
    this.event_time = Date.now() % 64000;

    if (this.event_count % 4 == 0) {
      toggle_bit = toggle_bit ^ 0x80;
    }
    if (this.event_count % 65 == 0) {
      /*send 4 background data pages, then back to main*/
    }

    const data: number[] = [];
    data.push(CHANNEL);
    data.push(this.page.pageState | toggle_bit);

    data.push(0xff);
    data.push(0xff);
    data.push(0xff);

    data.push(
      ...Messages.intToLEHexArray(
        Math.floor((this.event_time / 1000) * 1024),
        2
      )
    );
    data.push(cadence);

    this.send(Messages.buildMessage(data, 0x4e));
    // console.log("CadenceSensorTx broadcast", data);
  }

  // CADENCE
  private cadence_cum_rev = 0;
  private cadence_current_rpm = 75;
  private cadence_isIncrementing = 0;
  public start() {
    if (this.cadence_current_rpm >= 100) {
      this.cadence_isIncrementing = -1;
    } else if (this.cadence_current_rpm <= 75) {
      this.cadence_isIncrementing = 1;
    }
    this.cadence_current_rpm += this.cadence_isIncrementing;
    this.cadence_cum_rev = (this.cadence_cum_rev + 1) % 65536;
    this.broadcast(this.cadence_cum_rev);
    setTimeout(
      () => {
        this.start();
      },
      Math.floor(this.rpm_to_ms(this.cadence_current_rpm))
    );
  }

  private rpm_to_ms(rpm: number) {
    // (1000/ms)*60 = rpm
    return (1000 * 60) / rpm;
  }
}
