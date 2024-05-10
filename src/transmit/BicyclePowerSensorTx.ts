import { Messages } from "../Messages";
import { AntPlusSensor } from "../sensors/AntPlusSensor";
import { Page, PageState } from "../ant";
import { GarminStick3 } from "../GarminStick3";
import { GarminStick2 } from "../GarminStick2";
import { BicyclePowerSensorState } from "../sensors/BicyclePowerSensorState";
import { updateBicyclePowerSensorState } from "../lib/UpdateState";

const CHANNEL = 0;
const DEVICEID = 0xbeef;
const PERIOD = 8182;
const DEVICE_TYPE = 11;
let toggle_bit = 0x80;

export class BicyclePowerSensorTx extends AntPlusSensor {
  private state?: BicyclePowerSensorState;
  private power_accumulated = 0;
  private power_event_count = 0;

  public async attachSensor(channel: number, deviceID: number) {
    await super.attach({
      channel: CHANNEL,
      type: "transmit",
      deviceID: DEVICEID,
      deviceType: DEVICE_TYPE,
      transmissionType: 1,
      timeout: 255,
      period: PERIOD
    });
    this.state = new BicyclePowerSensorState(DEVICEID);
  }

  protected updateState(deviceId: number, data: DataView) {
    if (!this.state) {
      throw new Error("BicyclePowerSensor: not attached");
    }
    this.emit("powerData", this.state.updateState(data));
  }

  public broadcast(power: number, cadence: number) {
    var data: number[] = []; // Explicitly
    data.push(CHANNEL);
    data.push(0x10); // power only
    this.power_event_count++;
    this.power_event_count = this.power_event_count % 255; // rollover 255
    data.push(this.power_event_count);
    data.push(0xff); // pedal power not-used
    data.push(cadence); // cadence
    this.power_accumulated += power;
    this.power_accumulated = this.power_accumulated % 65536;
    // console.log("Event: %s \t Power: %sw \t Cadence: %srpm", this.power_event_count, power, cadence);

    data = data.concat(Messages.intToLEHexArray(this.power_accumulated, 2));
    data = data.concat(Messages.intToLEHexArray(power, 2));

    this.send(Messages.buildMessage(data, 0x4e));
    // console.log("HeartRateSensorTx broadcast", data);
  }

  public start() {
    var power_instant = Math.round(Math.random() * 40 + 300);
    // var cadence = Math.round(Math.random() * 10 + 80);
    this.broadcast(power_instant, 0xff);
    setTimeout(() => this.start(), 248);
  }
}

// Usage example
// if (!module.parent) {
//   const stick = new GarminStick3();
//   let hrmModule: HRM;

//   setTimeout(function a() {
//     if (!stick.open()) {
//       console.log("ANT+ USB stick not found");
//       process.exit();
//     } else {
//       console.log("Found GarminStick3");
//       setTimeout(function b() {
//         hrmModule = new HRM(stick);
//         setTimeout(function c() {
//           hrmModule.broadcast(Math.floor(75 + Math.random() * 75), PAGE_HR);
//           setTimeout(c, 248);
//         }, 2000);
//       }, 2000);
//     }
//   }, 2000);
// }
