import { Messages } from "../Messages";
import { AntPlusSensor } from "../sensors/AntPlusSensor";
import { SpeedSensorState } from "../sensors/SpeedSensorState";
import { updateSpeedSensorState } from "../lib/UpdateState";
import { Page, PageState } from "../ant";

const CHANNEL = 5;
const DEVICEID = 0xdaad; // hardcoded for NOW
const PERIOD = 8118;
const DEVICE_TYPE = 0x7b;
let toggle_bit = 0x80;

export class SpeedSensorTx extends AntPlusSensor {
  wheelCircumference = 2.199; // default 70cm wheel
  private event_count = 0;

  private state?: SpeedSensorState;
  private page: Page = {
    oldPage: -1,
    pageState: PageState.INIT_PAGE
  };

  public setWheelCircumference(wheelCircumference: number) {
    this.wheelCircumference = wheelCircumference;
  }

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
    this.state = new SpeedSensorState(DEVICEID);
  }

  protected updateState(deviceId: number, data: DataView) {
    console.log("SpeedSensorTx updateState", data);
    if (!this.state) {
      throw new Error("SpeedSensorTx: not attached");
    }
    this.state.DeviceID = deviceId;
    const updatedState = this.state.updateState(data, this.wheelCircumference);
    if (updatedState) {
      this.emit("speedData", updatedState);
    }
  }

  public broadcast(cumulativeRevolution: number) {
    this.event_count++;
    this.event_count = this.event_count % 255;
    var event_time = Date.now() % 64000;

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

    const timeData = Messages.intToLEHexArray(
      Math.floor((event_time / 1000) * 1024),
      2
    );
    data.push(...timeData);

    const revolutionData = Messages.intToLEHexArray(
      Math.floor(cumulativeRevolution),
      2
    );
    data.push(...revolutionData);

    this.send(Messages.buildMessage(data, 0x4e));
    // console.log("SpeedSensorTx broadcast", data);
  }

  private cumulativeRevolution = 0;
  public start() {
    // console.log("Broadcasting speed");
    this.cumulativeRevolution = (this.cumulativeRevolution + 4) % 65536;
    this.broadcast(this.cumulativeRevolution);
    setTimeout(() => this.start(), 500);
  }
}
