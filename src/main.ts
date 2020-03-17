import { ErrorMapper } from "utils/ErrorMapper";
import garbageCollect from "./GarbageCollector";
import RoomController from './room/RoomController';
import {factory} from "./utils/ConfigLog4J";

const logger = factory.getLogger("root");

if (!Memory.terraformedRoom) {
  Memory.terraformedRoom = {};
}

logger.info('REBOOTED');
const roomControllers: RoomController[] = [];
Object.keys(Game.rooms).forEach((roomName:string ) => {
  const room = Game.rooms[roomName];
  if (room && room.controller && room.controller.my) {
    roomControllers.push(new RoomController(roomName));
  }
});

export const loop = ErrorMapper.wrapLoop(() => {
  garbageCollect();

  try {
    roomControllers.forEach((r: RoomController) => {
      try {
        r.tick();
      } catch (ex) {
        console.log(ex);
      }
    });
  }catch(err){
    const error:Error = err;
      console.log(error.stack);
  }

});
