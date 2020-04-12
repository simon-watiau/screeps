import Intel from "../Intel";
import RoomController from "../room/RoomController";
import BootstrapRoom from "./BootstrapRoom";
import GlobalStrategist from "./GlobalStrategist";

export default class GlobalController {
  private bootstrap: BootstrapRoom|undefined;
  private globalStrategist: GlobalStrategist;

  public intel: Intel = new Intel();

  constructor() {
    this.globalStrategist = new GlobalStrategist(this);
  }

  public checkForBootstrap() {
    Object.keys(Game.rooms).forEach((roomName:string ) => {
      const room = Game.rooms[roomName];
      if (room && room.controller && room.controller.my) {
        if (room.find(FIND_MY_SPAWNS).length === 0) {
          if (!this.bootstrap) {
            this.bootstrap = new BootstrapRoom(room.name);
          }
        }
      }
    });
  }

  public tickBootstrapIfNeeded() {
    if (this.bootstrap) {
      if (this.bootstrap.latestState === BootstrapRoom.STATE_DONE) {
        this.bootstrap = undefined;
      } else {
        this.bootstrap.tick();
      }
    }
  }

  public tick(controllers: RoomController[]) {
    if (Game.time % 100 === 0) {
      this.checkForBootstrap();
    }

    this.tickBootstrapIfNeeded();

    this.globalStrategist.updateStrategy();
    this.intel.scan();
  }
}
