import { ErrorMapper } from "utils/ErrorMapper";
import MapRoom from "./attack/behaviour/MapRoom";
import RemoteHarvester from "./behaviour/RemoteHarvester";
import BootstrapRoom from "./BootstrapRoom";
import garbageCollect from "./GarbageCollector";
import CreepsIndex from "./population/CreepsIndex";
import RoomController from './room/RoomController';
import {factory} from "./utils/ConfigLog4J";
import flagsConstants from "./utils/flagsConstants";

const logger = factory.getLogger("root");

if (!Memory.terraformedRoom) {
  Memory.terraformedRoom = {};
}

logger.info('REBOOTED');
const roomControllers: RoomController[] = [];
let bootstrap: BootstrapRoom|undefined;
const mappers: MapRoom[] = [];
const remoteHarvesters: RemoteHarvester[] = [];

Object.keys(Game.rooms).forEach((roomName:string ) => {
  const room = Game.rooms[roomName];
  if (room && room.controller && room.controller.my) {
    roomControllers.push(new RoomController(roomName));

    if (room.find(FIND_MY_SPAWNS).length === 0) {
      if (!bootstrap) {
        bootstrap = new BootstrapRoom(room.name);
      }
    }
  }
});

MapRoom.getAllPosToBeMapped().forEach((pos: RoomPosition) => {
  mappers.push(new MapRoom(pos));
});

export const loop = ErrorMapper.wrapLoop(() => {
  garbageCollect();
  CreepsIndex.getInstance().init();
  try {
    roomControllers.forEach((r: RoomController) => {
      try {
        r.tick();
      } catch (ex) {
        console.log(JSON.stringify(ex.stack));
      }
    });

    if (bootstrap) {
      if (bootstrap.latestState === BootstrapRoom.STATE_DONE) {
        bootstrap = undefined;
      } else {
        bootstrap.tick();
      }
    }

    mappers.forEach((mapper: MapRoom) => {
      mapper.tick();
    });

  }catch(err){
    const error:Error = err;
    console.log(JSON.stringify(err.stack));
  }

  if (remoteHarvesters.length === 0 || Game.time % 50 === 0) {
    const harvestedPositions = remoteHarvesters.map((r: RemoteHarvester) => r.position);

    flagsConstants.getRemoteSourcesPos().filter(pos => {
      let harvested = false;

      harvestedPositions.forEach(value => {
        harvested = harvested || (value.x === pos.x && value.y === pos.y && value.roomName === pos.roomName)
      });

      return !harvested;
    }).forEach((p: RoomPosition) => {
      try {
        remoteHarvesters.push(new RemoteHarvester(p));
      } catch (e) {
        console.log(JSON.stringify(e.stack));
      }
    });
  }

  remoteHarvesters.forEach(value => {
    value.harvest();
  });

  CreepsIndex.getInstance().resolve();
});
