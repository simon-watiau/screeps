import _ from "lodash";
import {Logger} from "typescript-logging";
import Banker from "../Banker";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";
import Tower from "./Tower";

export default class MineralLogistic {
  public static ROLE = 'mineral_logistic';


  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;
  private logger: Logger;

  private static META_DESTINATION = 'destination';

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("mineral_logistic." + roomName);
  }

  public getLogistics(): Creep[] {
    return getCreepsByRole(MineralLogistic.ROLE, this.roomName);
  }

  public move(count: number) {
    if (count === 0) {
      return;
    }

    const scoots = this.getLogistics();

    if (scoots.length < count) {
      const destination = this.getDestination();
      const index = CreepsIndex.getInstance();

      index.requestLogistic(new RoomPosition(10, 10, this.roomName), creep => {
        creep.memory.role = getCreepRole(MineralLogistic.ROLE, this.roomName);
      });
    }

    scoots.forEach((scoot: Creep) => {
      if (!scoot.memory.meta) {
        scoot.memory.meta = {};
        scoot.memory.meta[MineralLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.store.getFreeCapacity() === 0 && scoot.memory.objective === MineralLogistic.OBJECTIVE_REFILL) {
        scoot.memory.objective = MineralLogistic.OBJECTIVE_FILL;
        scoot.memory.meta[MineralLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.store.getUsedCapacity() === 0 && (!scoot.memory.objective || scoot.memory.objective === MineralLogistic.OBJECTIVE_FILL)) {

        scoot.memory.objective = MineralLogistic.OBJECTIVE_REFILL;
        scoot.memory.meta[MineralLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.memory.objective === MineralLogistic.OBJECTIVE_REFILL) {
        scoot.say("-fill");

        const source = this.getCreepSource(scoot);
        if (!source) {
          scoot.say('source ?');
          return;
        }
        const types = Object.keys(source.store).filter(value => value !== RESOURCE_ENERGY);
        if (types.length === 0) {
          throw new Error('no content');
        }
        const type = types[0];

        if (scoot.withdraw(source, type as ResourceConstant) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(source, {visualizePathStyle: drawingOpts('#ffce0b')});
        }
      }

      if (scoot.memory.objective === MineralLogistic.OBJECTIVE_FILL) {
        scoot.say("+fill");
        const destination = this.getCreepDestination(scoot);
        if (!destination) {
          scoot.say('dest ?');
          return;
        }

        const types = Object.keys(scoot.store);
        if (types.length === 0) {
          throw new Error('no content');
        }
        const type = types[0];

        if (scoot.transfer(destination, type as ResourceConstant) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(destination, {visualizePathStyle: drawingOpts('#ffce0b')});
        }
      }
    });
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  private getSpawn(): StructureSpawn|undefined {
    const spawns = this.getRoom().find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
      return undefined;
    }

    return spawns[0];
  }

  private getDestination() : StructureStorage|undefined {
    const controller = this.getRoom().controller;
    const banker = Banker.getInstance(this.roomName);

    // move to storage
    const storages = this.getRoom().find<StructureStorage>(FIND_MY_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_STORAGE && a.store.getFreeCapacity() > 0
    });

    if (storages.length > 0) {
      return storages[0];
    }

    return undefined;
  }

  private getSource() : StructureContainer|undefined {
    const controller = this.getRoom().controller;

    if (!controller) {
      throw new Error("No controller in this room");
    }

     const sources = this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => {
        return a.structureType === STRUCTURE_CONTAINER &&
          (a.store.getUsedCapacity() - a.store.getUsedCapacity(RESOURCE_ENERGY)) > 0
      }
     });

    sources.sort((s1: StructureContainer, s2:StructureContainer): number => {
     return (s2.store.getUsedCapacity() - s2.store.getUsedCapacity(RESOURCE_ENERGY)) - (s1.store.getUsedCapacity() - s1.store.getUsedCapacity(RESOURCE_ENERGY));
    });

    if (sources.length > 0) {
      return sources[0];
    }

    return undefined;
  }

  private getCreepSource(creep: Creep): StructureContainer|Tombstone|undefined {
    let source = Game.getObjectById<StructureContainer|Tombstone|undefined>(creep.memory.meta[MineralLogistic.META_DESTINATION]);
    if (source && (source.store.getUsedCapacity() - source.store.getUsedCapacity(RESOURCE_ENERGY)) > creep.store.getFreeCapacity()) {
      return source;
    }

    source = this.getSource();
    if (source) {
      creep.memory.meta[MineralLogistic.META_DESTINATION] = source.id;
    }

    return source
  }

  private getCreepDestination(creep: Creep): StructureStorage|undefined {
    let destination = Game.getObjectById<StructureStorage|undefined>(creep.memory.meta[MineralLogistic.META_DESTINATION]);
    if (destination) {
      return destination;
    }

    destination = this.getDestination();
    if (destination) {
      creep.memory.meta[MineralLogistic.META_DESTINATION] = destination.id;
    }

    return destination;
  }
}
