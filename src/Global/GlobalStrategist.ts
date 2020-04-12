import GlobalController from "./GlobalController";

export default class GlobalStrategist {
  private controller: GlobalController;

  constructor(controller:GlobalController) {
    this.controller = controller;
  }

  public updateStrategy() {
    this.hasHarvestablePower();
  }

  private hasHarvestablePower() {
    const lastStates = this.controller.intel.getLastStates();

    Object.keys(lastStates).forEach(roomName => {
      const state:IntelState = lastStates[roomName];
      const currentPower = state.powerTTL - (Game.time - state.timestamp);

      if (currentPower > 0) {
        console.log("ROOM", roomName, "HAS POWER OF", currentPower);
      }
    });
  }
}
