import _ from "lodash";
import {Logger} from "typescript-logging";
import Banker from "../Banker";
import CreepsIndex from "../population/CreepsIndex";
import cachedData from "../utils/cachedData";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";
import Tower from "./Tower";
import undefinedError = Mocha.utils.undefinedError;

export default class EnergyLogistic {
  public static ROLE = 'logistic';
  public static MAX_PER_POS = 4;
  public static REFRESH_SOURCES_CACHES = 4;
  public static REFRESH_DESTINATIONS_CACHES = 6;
  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  private static META_DESTINATION = 'destination';

  public roomName: string;
  private logger: Logger;
  private controllerContainerId: Id<StructureContainer>|undefined;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("logistic." + roomName);
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("no controller");
    }

    const closeContainers = controller.pos.findInRange<StructureContainer>(FIND_STRUCTURES,4, {filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER});

    if (closeContainers.length !== 0) {
      this.controllerContainerId = closeContainers[0].id;
    }
  }

  public getLogistics(): Creep[] {
    return  getCreepsByRole(EnergyLogistic.ROLE, this.roomName).sort((a,b) => {
      if (a.name > b.name) {
        return -1;
      } else if (a.name < b.name) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  public move(count: number) {
    if (count === 0) {
      return;
    }

    const scoots = this.getLogistics();

    if (scoots.length < count) {
      const index = CreepsIndex.getInstance();

      index.requestLogistic(new RoomPosition(10, 10, this.roomName), creep => {
        creep.memory.role = getCreepRole(EnergyLogistic.ROLE, this.roomName);
        creep.memory.meta = {};
        creep.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
      });
    }

    scoots.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      if ((scoot.ticksToLive || 0) < 80 && scoot.store.getUsedCapacity() === 0) {
        scoot.say('BYE');
        scoot.suicide();
        return;
      }
      if (!scoot.memory.meta) {
        scoot.memory.meta = {};
        scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && scoot.memory.objective === EnergyLogistic.OBJECTIVE_REFILL) {
        scoot.memory.objective = EnergyLogistic.OBJECTIVE_FILL;
        scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (!scoot.memory.objective || scoot.memory.objective === EnergyLogistic.OBJECTIVE_FILL)) {

        scoot.memory.objective = EnergyLogistic.OBJECTIVE_REFILL;
        scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
      }

      if (scoot.memory.objective === EnergyLogistic.OBJECTIVE_REFILL) {
        scoot.say("-fill");
        const destination = this.getCreepDestination(scoot, false);

        if (!destination) {
          scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
          scoot.say("dest ?");
          return;
        }

        const source = this.getCreepSource(scoot, destination);
        if (!source) {
          scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
          scoot.say(destination.id);
          return;
        }

        if (scoot.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          const moveRes = scoot.moveTo(source, {visualizePathStyle: drawingOpts('#ffce0b')});
        }
      }

      if (scoot.memory.objective === EnergyLogistic.OBJECTIVE_FILL) {
        scoot.say("+fill");
        const destination = this.getCreepDestination(scoot);

        if (!destination) {
          scoot.memory.meta[EnergyLogistic.META_DESTINATION] = undefined;
          scoot.say("dest ?");
          return;
        }

        if (scoot.transfer(destination, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
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

  private doesControllerNeedCash():boolean {
    const controller = this.getRoom().controller;
    if (!controller) {
      return false;
    }

    switch (controller.level) {
      case 1:
        return controller.ticksToDowngrade < 20000 * 0.4;
      case 2:
        return controller.ticksToDowngrade < 10000 * 0.6;
      case 3:
        return controller.ticksToDowngrade < 20000;
      case 4:
        return controller.ticksToDowngrade < 40000;
      case 5:
        return controller.ticksToDowngrade < 80000;
      case 6:
        return controller.ticksToDowngrade < 120000;
      case 7:
        return controller.ticksToDowngrade < 150000;
      case 8:
        return controller.ticksToDowngrade < 200000 * 0.5;
      default:
        return true;
    }
  }

  private getDestinations(): Array<Id<AnyStoreStructure>> {
    return cachedData<Array<Id<AnyStoreStructure>>>(
      'logistics-destination-'+ this.roomName,
      () => {
        const destinations: Array<Id<AnyStoreStructure>> = [];

        const controller = this.getRoom().controller;
        const banker = Banker.getInstance(this.roomName);

        const controllerNeedCash = this.doesControllerNeedCash();

        // send to towers
        let towers = this.getRoom().find<StructureTower>(FIND_STRUCTURES, {
          filter: (a: any) => a.structureType === STRUCTURE_TOWER && a.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        towers = towers.sort((t1, t2) => t2.store.getFreeCapacity(RESOURCE_ENERGY) - t1.store.getFreeCapacity(RESOURCE_ENERGY));

        towers.forEach(value => {
          const skipTower = Tower.atRepairThreshold(value) &&
            !Tower.asEmergencyRepairs(value) &&
            (banker.needCash() || controllerNeedCash);
          if (!skipTower) {
            destinations.push(value.id);
          }
        });

        // send to spawn and extensions
        const spawn = this.getSpawn();
        if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
          destinations.push(spawn.id);
        }

        this.getRoom().find<StructureExtension>(FIND_STRUCTURES, {
          filter: (a: any) => a.structureType === STRUCTURE_EXTENSION &&
            a.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).forEach(value => {
          destinations.push(value.id);
        });

        if (controller) {
          const container = controller.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
            filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getFreeCapacity(RESOURCE_ENERGY) > 500
          });
          if (container) {
            destinations.push(container.id);
          }
        }

        // move to storage
        const storages = this.getRoom().find<StructureStorage>(FIND_MY_STRUCTURES, {
          filter: (a: any) => a.structureType === STRUCTURE_STORAGE && a.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (storages.length > 0) {
          destinations.push(storages[0].id);
        }

        return destinations;
      },
      5
    );
  }

  private getSources(): Array<Id<AnyStoreStructure>> {
    return cachedData<Array<Id<AnyStoreStructure>>>('logistics-sources-' + this.roomName, () => {
      const sources: Array<Id<AnyStoreStructure>> = [];

      const controller = this.getRoom().controller;

      if (!controller) {
        throw new Error("No controller in this room");
      }

      this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
        filter: (a: any) => {
          return ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(a.structureType) && a.store.getUsedCapacity(RESOURCE_ENERGY) > 100 && a.pos.getRangeTo(controller) > 4);
        }
      }).sort((s1: StructureContainer, s2:StructureContainer): number => {
        return s2.store.getUsedCapacity(RESOURCE_ENERGY)/s2.store.getCapacity(RESOURCE_ENERGY) - s1.store.getUsedCapacity(RESOURCE_ENERGY)/s1.store.getCapacity(RESOURCE_ENERGY);
      }).forEach(value => {
        sources.push(value.id);
      });

      return sources;
    }, 3);
  }

  private computeAffectedLogistics(id: Id<AnyStoreStructure>): number {
      return this.getLogistics().filter((c: Creep) => {
       return  c.memory.meta && c.memory.meta[EnergyLogistic.META_DESTINATION] === id;
     }).length;
  }

  private getCreepSource(creep: Creep, destination: AnyStoreStructure|null): AnyStoreStructure|undefined {
    const source = Game.getObjectById<AnyStoreStructure|null>(creep.memory.meta[EnergyLogistic.META_DESTINATION]);
    const sources = this.getSources();
    if (
      source &&
      sources.includes(creep.memory.meta[EnergyLogistic.META_DESTINATION]) &&
      (!destination || source.id !== destination.id)
    ) {
      return source;
    }

    let bestSource: AnyStoreStructure|undefined;
    for (let i =0 ; i < sources.length && !bestSource; i ++) {
      const cursor = sources[i];
      if (
        this.computeAffectedLogistics(cursor) < 4 &&
        (!destination || cursor !== destination.id) &&
       (
         !destination ||
         destination instanceof Spawn ||
         destination instanceof StructureExtension ||
           cursor !== this.controllerContainerId
       )
      ) {
          bestSource = Game.getObjectById(cursor) as AnyStoreStructure;
      }
    }

    if (bestSource) {
      creep.memory.meta[EnergyLogistic.META_DESTINATION] = bestSource.id;
    }

    return bestSource;
  }

  private getCreepDestination(creep: Creep, affect: boolean = true): AnyStoreStructure|undefined {
    const destination = Game.getObjectById<AnyStoreStructure|null>(creep.memory.meta[EnergyLogistic.META_DESTINATION]);
    const destinations = this.getDestinations();
    if (affect &&
        destination &&
      destinations.includes(creep.memory.meta[EnergyLogistic.META_DESTINATION])
    ) {
      return destination;
    }

    let bestDestination: AnyStoreStructure|undefined;
    for (let i =0 ; i< destinations.length && !bestDestination; i ++) {
      const cursor = destinations[i];

      if (
        this.computeAffectedLogistics(cursor) < EnergyLogistic.MAX_PER_POS
      ) {
        bestDestination = Game.getObjectById(cursor) as AnyStoreStructure;
      }
    }

    if (bestDestination && affect) {
      creep.memory.meta[EnergyLogistic.META_DESTINATION] = bestDestination.id;
    }

    return bestDestination;
  }
}
