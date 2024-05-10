import { Messages } from "../Messages";
import { AntPlusSensor } from "../sensors/AntPlusSensor";
import { HeartRateSensorState } from "../sensors/HeartRateSensorState";
import { Page, PageState } from "../ant";
import { GarminStick3 } from "../GarminStick3";
import { GarminStick2 } from "../GarminStick2";

const CHANNEL = 1;
const DEVICEID = 0xdead;
const PERIOD = 8070;
const DEVICE_TYPE = 0x78;
let toggle_bit = 0x80;

export class HeartRateSensorTx extends AntPlusSensor {
  private event_count = 0;
  private event_time = 0;
  private state?: HeartRateSensorState;
  private page: Page = {
    oldPage: -1,
    pageState: PageState.INIT_PAGE
  };

  // constructor(stick: GarminStick2 | GarminStick3) {
  //   super(stick);

  //   stick.on("startup", async () => {
  //     await stick.write(Messages.assignChannel(CHANNEL, "transmit"));
  //     await stick.write(Messages.setDevice(CHANNEL, DEVICEID, 0x78, 1337));
  //     await stick.write(Messages.setFrequency(CHANNEL, 57));
  //     await stick.write(Messages.setPeriod(CHANNEL, 8070));
  //     await stick.write(Messages.openChannel(CHANNEL));
  //     console.log("HeartRateSensorTx initialized");

  //     setTimeout(() => {
  //       setInterval(() => {
  //         console.log("Broadcasting HRM data");
  //         this.broadcast(Math.floor(75 + Math.random() * 75));
  //       }, 248);
  //     }, 2000);
  //   });

  //   stick.on("shutdown", () => {
  //     console.log("HeartRateSensorTx shutdown");
  //   });
  // }

  public async attachSensor(channel: number, deviceID: number) {
    await super.attach({
      channel: CHANNEL,
      type: "transmit",
      deviceID: DEVICEID,
      deviceType: DEVICE_TYPE,
      transmissionType: 0,
      timeout: 255,
      period: PERIOD
    });
    this.state = new HeartRateSensorState(DEVICEID);
  }

  protected updateState(deviceId: number, data: DataView) {
    console.log("HeartRateSensorTx updateState", data);
    if (!this.state) {
      throw new Error("HeartRateSensorTx: not attached");
    }
    this.state.DeviceID = deviceId;
    const updatedState = this.state.updateState(data, this.page);
    this.emit("hbdata", updatedState);
    this.emit("hbData", updatedState);
  }

  public broadcast(hr: number) {
    this.event_count++;
    this.event_count = this.event_count % 255;
    this.event_time = Date.now() % 64000;

    if (this.event_count % 4 == 0) {
      toggle_bit = toggle_bit ^ 0x80;
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
    data.push(this.event_count);
    data.push(hr);

    this.send(Messages.buildMessage(Array.from(new Uint8Array(data)), 0x4e));
    // console.log("HeartRateSensorTx broadcast", data);
  }

  public start() {
    this.broadcast(Math.floor(75 + Math.random() * 75));
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
