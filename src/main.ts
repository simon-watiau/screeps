import { ErrorMapper } from "utils/ErrorMapper";
import garbageCollect from "./GarbageCollector";
import RoomController from './room/RoomController';
import {factory} from "./utils/ConfigLog4J";

const logger = factory.getLogger("root");
let r : RoomController|undefined;
if (!Memory.terraformedRoom) {
  Memory.terraformedRoom = {};
}

logger.info('REBOOTED');

export const loop = ErrorMapper.wrapLoop(() => {
  garbageCollect();

  if (!r) {
    r = new RoomController(Game.spawns.Spawn1.room.name);
  }
  try {
    r.tick();
  }catch(err){
    const error:Error = err;
      console.log(error.stack);
  }

});
