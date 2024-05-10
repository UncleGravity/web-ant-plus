import { useEffect, useState } from "react";
import {
  GarminStick3,
  HeartRateSensorTx,
  SpeedSensorTx,
  CadenceSensorTx,
  BicyclePowerSensorTx
} from "../../src";
import { Constants } from "../../src/Constants";
import { GarminStick2 } from "../../src/GarminStick2";
import { Messages } from "../../src/Messages";
import "./App.css";
import reactLogo from "./assets/react.svg";

// choose the stick type you want to use
const STICK: typeof GarminStick2 | typeof GarminStick3 = GarminStick3;

function App() {
  const [stick, setStick] = useState<GarminStick2 | GarminStick3>();
  const [transmitHRM, setTransmitHRM] = useState<HeartRateSensorTx>();
  const [transmitSpeed, setTransmitSpeed] = useState<SpeedSensorTx>();
  const [transmitCadence, setTransmitCadence] = useState<CadenceSensorTx>();
  const [transmitPower, setTransmitPower] = useState<BicyclePowerSensorTx>();
  const [connected, setConnected] = useState(stick?.isScanning());

  useEffect(() => {
    if (!stick) {
      setStick(new STICK());
      return;
    } else {
      console.log("stick available: ", stick);
    }

    // START HEART RATE SENSOR
    if (transmitHRM) {
      transmitHRM.on("attached", () => {
        console.log("transmitHRM attached")
        transmitHRM.start(); /////////////////// HRM GO
      });
      transmitHRM.on("detached", () =>
        console.log("transmitHRM detached")
      );
    } else {
      console.log("setting transmitHRM");
      setTransmitHRM(new HeartRateSensorTx(stick));
    }

    // START SPEED SENSOR
    if (transmitSpeed) {
      transmitSpeed.on("attached", () => {
        console.log("transmitSpeed attached")
        transmitSpeed.start(); /////////////////// SPEED GO
      });

      transmitSpeed.on("detached", () =>
        console.log("transmitSpeed detached")
      );
    } else {
      setTransmitSpeed(new SpeedSensorTx(stick));
    }

    // START CADENCE SENSOR
    if (transmitCadence) {
      transmitCadence.on("attached", () => {
        console.log("transmitCadence attached")
        transmitCadence.start(); /////////////////// CADENCE GO
      });
    } else {
      setTransmitCadence(new CadenceSensorTx(stick));
    }

    // START BICYCLE POWER SENSOR
    if (transmitPower) {
      transmitPower.on("attached", () => {
        console.log("transmitPower attached")
        transmitPower.start(); /////////////////// POWER GO
      });
    } else {
      setTransmitPower(new BicyclePowerSensorTx(stick));
    }

  }, [stick, transmitHRM, transmitSpeed, transmitCadence]);

  async function handleClickSearchDevice() {
    console.log("searching...");

    try {
      if (!stick) {
        throw new Error("stick not found");
      } else {
        console.log("stick found, continuing search");
        console.log(stick);
      }

      stick.once("startup", async () => {
        try {
          console.log("Stick startup", stick);
          transmitHRM ? await transmitHRM.attachSensor(1, 0xdead) : null;
          transmitSpeed ? await transmitSpeed.attachSensor(5, 0xdaad) : null;
          transmitCadence ? await transmitCadence.attachSensor(4, 0xf00d) : null;
          transmitPower ? await transmitPower.attachSensor(0, 0xbeef) : null;
          setConnected(true);
        } catch (error) {
          throw error;
        }
      });

      stick.once("shutdown", async () => {
        console.log("Stick shutdown");
      });

      await stick.open();

    } catch (error) {
      console.error(error);
    }
  }

  function handleClickClose() {
    console.log("closing...");
    try {
      (async () => {
        const close = await stick?.reset();
        await stick?.close();
        console.log("close", close);
      })();
      setConnected(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="App">
      <div>
        <a href="https://reactjs.org" target="_blank">
          <img
            src={reactLogo}
            className="logo react"
            alt="React logo"
          />
        </a>
      </div>
      <h1
        style={{
          display: "flex",
          alignItems: "start"
        }}
      >
        WebUSB ANT+
        <span
          style={{
            fontSize: "0.5em"
          }}
        >
          ®
        </span>
      </h1>
      <div className="card">
        {connected ? (
          <>
            <button type="button" onClick={handleClickClose}>
              Disconnect
            </button>
          </>
        ) : (
          <button type="button" onClick={handleClickSearchDevice}>
            Search ANT+ Receiver
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
