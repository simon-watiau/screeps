import CreepsIndex from "./population/CreepsIndex";
import cachedData from "./utils/cachedData";
import getCreepRole from "./utils/creeps/getCreepRole";
import getCreepsByRole from "./utils/creeps/getCreepsByRole";

export default class Intel {
  public static MAX_INTEL_COUNT = 5;
  public static DELAY_UNTIL_REVISIT = 100;
  public static ROLE = 'mapper';
  public static OBJECTIVE_NOTHING = 'nothing';
  public static META_NEXT_EXIT = 'next_exit';
  public static META_MAP = 'map';

  constructor() {
   if (!Memory.intel) {
     Memory.intel = {
       rooms: {}
     }
   }
 }

 public scan() {
   const mappers = getCreepsByRole(Intel.ROLE);
   const roomsBeingMapped = this.roomsBeingMapped(mappers);

   const plan = this.computeVisitPlan()
         .filter(value => !roomsBeingMapped.includes(value));

   if (mappers.length < plan.length) {
     CreepsIndex.getInstance().requestMapper(
       new RoomPosition(20,20, plan[0]),
       (c:Creep) => {
          c.memory.role = getCreepRole(Intel.ROLE);
        }
      );
   }

   mappers.forEach(creepMapper => {

     if (creepMapper.spawning) {
       return;
     }

     if (creepMapper.room.name === creepMapper.memory.objective) {
       creepMapper.memory.objective = Intel.OBJECTIVE_NOTHING;
     }

     if (
       !creepMapper.memory.objective ||
       creepMapper.memory.objective === Intel.OBJECTIVE_NOTHING
     ) {
       // @ts-ignore
       let distance = Infinity;
       let bestRoom;

       plan.forEach((el) => {
         const newDistance = Game.map.getRoomLinearDistance(creepMapper.pos.roomName, el);
         if (newDistance < distance) {
           distance = newDistance;
            bestRoom = el;
         }
       });

       if (!bestRoom) {
         return;
       }
       const index = plan.indexOf(bestRoom, 0);
       if (index > -1) {
         plan.splice(index, 1);
       }
       creepMapper.memory.objective = bestRoom;
       creepMapper.memory.meta = creepMapper.memory.meta || {};


     }

     let nextExit = creepMapper.memory.meta[Intel.META_NEXT_EXIT];

     if (!nextExit || creepMapper.pos.roomName !== nextExit.roomName) {
       const route = Game.map.findRoute(creepMapper.room, creepMapper.memory.objective, {
         routeCallback: (roomName, fromRoomName) =>{
           if(!this.allowMovingInRoom(roomName)) {
             return Infinity;
           }
           return 1;
         }});

       if (route === ERR_NO_PATH) {
         creepMapper.memory.objective = Intel.OBJECTIVE_NOTHING;
         Intel.pushState(
           creepMapper.memory.objective,
           {
             isHostile: false,
             isReachable: false,
             powerTTL: 0,
             timestamp: Game.time
           }
         );

         return;
       }

       const exit = creepMapper.pos.findClosestByRange(route[0].exit);
       if (exit) {
         creepMapper.memory.meta[Intel.META_NEXT_EXIT] = {
           roomName: exit.roomName,
           x: exit.x,
           y: exit.y,
         };
       }
     }

     nextExit = creepMapper.memory.meta[Intel.META_NEXT_EXIT];

   if (nextExit) {
       creepMapper.moveTo(
         new RoomPosition(nextExit.x, nextExit.y, nextExit.roomName),
         {
         costCallback:(roomName, costMatrix) => {
           const data = cachedData('intel-matrix-move-in-' + roomName,
             () => {
               [0,49].forEach(a => {
                 for (let b = 0; b <= 49; b++) {
                   costMatrix.set(a, b, 255);
                   costMatrix.set(b, a, 255);
                 }
               });
               return costMatrix.serialize();
             },
             0
             );

           return PathFinder.CostMatrix.deserialize(data);
         }
       });
     }
   });

   Object.values(Game.rooms).forEach(value => {
     Intel.pushState(
       value.name,
       {
         isHostile: this.isRoomHostile(value),
         isReachable: true,
         powerTTL: this.getPowertTLL(value),
         timestamp: Game.time,
       });
   });
 }

  private findCloseRooms(roomName: string): string[] {
    return cachedData<string[]>('closeRooms-' + roomName,
      () => {
        const roomRegex = /^W([0-9]+)N([0-9]+)$/g;
        const matches = roomRegex.exec(roomName);
        const rooms = [];
        if (matches !== null) {
          const w:number = Number(matches[1]);
          const n:number = Number(matches[2]);

          if (w <= 9) {
            rooms.push('W' + (w + 1) + 'N' + (n));
          }
          if (w >= 1) {
            rooms.push('W' + (w - 1) + 'N' + (n));
          }

          if (n <= 9) {
            rooms.push('W' + (w) + 'N' + (n + 1));
          }
          if (n >= 1) {
            rooms.push('W' + (w) + 'N' + (n - 1));
          }
        }

        return rooms;
      },
      10000
    );
  }

  private computeVisitPlan(): string[] {
    const myRooms = Intel.getMyRooms();
    const exclude = {
      excluded: myRooms
    };
    let targets: string[] = [];
    myRooms.forEach(value => {
      targets = targets.concat(this.computeToBeMapped(value, exclude));
    });
    targets = Array.from(new Set(targets));

    return targets;
  }

  private computeToBeMapped(roomName: string, excludeRooms: any): string[] {
    let nextRooms: string[] = [];

    const closeRooms = this.findCloseRooms(roomName);
    excludeRooms.excluded = excludeRooms.excluded.concat(roomName);

      closeRooms.filter(value => !excludeRooms.excluded.includes(value))
      .forEach(value => {
        if (Intel.wasRoomVisitedLately(value)) {
          nextRooms = nextRooms.concat(this.computeToBeMapped(value, excludeRooms));
        } else {
          excludeRooms.excluded.push(value);
          nextRooms.push(value);
        }
    });

    return nextRooms;
  }

  private static getMyRooms(): string[] {
    return Object.values(Game.rooms).filter(value => value.controller && value.controller.my).map(value => value.name);
  }

  private static wasRoomVisitedLately(roomName: string): boolean {
    const roomIntels = Memory.intel.rooms[roomName];
    return roomIntels &&  (Game.time - roomIntels[roomIntels.length-1].timestamp >= Intel.DELAY_UNTIL_REVISIT);
  }

  private isRoomHostile(room: Room): boolean {
    return room.getEventLog().filter(value => value.event === EVENT_ATTACK).length !== 0;
  }

  private allowMovingInRoom(roomName: string) : boolean {
    const roomIntels = Memory.intel.rooms[roomName];
    if (!roomIntels || roomIntels.length === 0) {
      return true;
    }

    return !roomIntels[roomIntels.length -1].isHostile && roomIntels[roomIntels.length -1].isReachable;
  }

  public static pushState(roomName: string, state: IntelState) {
    if (!Memory.intel.rooms[roomName]) {
      Memory.intel.rooms[roomName] = [];
    }
    const roomIntels = Memory.intel.rooms[roomName];

    const lastIntel = roomIntels[roomIntels.length - 1] || undefined;
    if (!lastIntel || Game.time - lastIntel.timestamp > this.DELAY_UNTIL_REVISIT || (!lastIntel.isHostile && state.isHostile)) {
      roomIntels.push(state);
    }

    if (roomIntels.length > this.MAX_INTEL_COUNT) {
      roomIntels.shift();
    }
  }

  public getLastStates(): {[roomName: string]: IntelState } {
    let result = {};

    if (!Memory.intel || !Memory.intel.rooms) {
      return result;
    }
    Object.keys(Memory.intel.rooms).forEach(roomName => {
      const intels = Memory.intel.rooms[roomName];
      if (intels.length !== 0) {
        result = {
          ...result,
          [roomName]: intels[intels.length - 1]
        };
      }
    });

    return result;
  }

  private roomsBeingMapped(mappers: Creep[]) {
    return mappers.filter(value => !!value.memory.objective).map(value => value.memory.objective);
  }

  private getPowertTLL(value: Room) {
    const powerBanks = value.find<StructurePowerBank>(FIND_STRUCTURES, {filter: (v) => v.structureType === STRUCTURE_POWER_BANK});
    if (powerBanks.length === 0) {
      return 0;
    }

    return powerBanks[0].ticksToDecay;
  }
}
