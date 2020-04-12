import { ErrorMapper } from "utils/ErrorMapper";
import BootstrapRoom from "./Global/BootstrapRoom";
import garbageCollect from "./GarbageCollector";
import GlobalController from "./Global/GlobalController";
import Intel from "./Intel";
import CreepsIndex from "./population/CreepsIndex";
import RoomController from './room/RoomController';
import {factory} from "./utils/ConfigLog4J";

const logger = factory.getLogger("root");

logger.info('REBOOTED');
let roomControllers: RoomController[] = [];
const globalController = new GlobalController();

export const loop = ErrorMapper.wrapLoop(() => {
  garbageCollect();
  CreepsIndex.getInstance().init();

  // Create new RoomControllers if needed
  if (roomControllers.length === 0 || Game.time % 100 === 0) {
    roomControllers = [];
    Object.keys(Game.rooms).forEach((roomName:string ) => {
      const room = Game.rooms[roomName];
      if (room && room.controller && room.controller.my) {
        roomControllers.push(new RoomController(roomName));
      }
    });
  }

  // tick RoomControllers
  try {
    roomControllers.forEach((r: RoomController) => {
      try {
        r.tick();
      } catch (ex) {
        console.log(JSON.stringify(ex.stack));
      }
    });
  }catch(err){
    const error:Error = err;
    console.log(JSON.stringify(err.stack));
  }

  globalController.tick(roomControllers);

  CreepsIndex.getInstance().resolve();
});
