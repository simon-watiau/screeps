import _ from "lodash";
import {Logger} from "typescript-logging";
import Banker from "../Banker";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";
import Tower from "./Tower";

export default class RemoteHarvester {
  public static ROLE = 'remote_harvester';

  private static OBJECTIVE_STORE = "filling";
  private static OBJECTIVE_HARVEST = "refill";

  public position: RoomPosition;
  private logger: Logger;
  private harvesterCount: number = 1;
  private fineTuned: boolean = false;
  private refreshTick:number;
  private closestStorage: Id<StructureStorage>|undefined;

  constructor(position: RoomPosition) {
    this.position = position;
    this.logger = factory.getLogger("remote_harvester." + this.getTargetPositionAtString());
    this.refreshTick = Math.floor(Math.random() * Math.floor(10));
    const storages:StructureStorage[] = [];

    Object.values(Game.rooms).forEach((r: Room) => {
      const foundStorages = r.find<StructureStorage>(FIND_MY_STRUCTURES, {filter: (s: any) => s.structureType === STRUCTURE_STORAGE});
      if (foundStorages.length > 0) {
        storages.push(foundStorages[0]);
      }
    });

    let distance = Number.MAX_SAFE_INTEGER;
    storages.forEach((s: StructureStorage) => {
      const newDistance = Game.map.getRoomLinearDistance(this.position.roomName, s.pos.roomName);
      if (newDistance < distance) {
        this.closestStorage = s.id;
        distance = newDistance;
      }
    });

    if (!this.closestStorage) {
      throw new Error("No storage");
    }
  }

  private getTargetPositionAtString() : string {
    return this.position.x + "-" + this.position.y + '-' + this.position.roomName;
  }

  private getStorage(): StructureStorage {
      const storage = Game.getObjectById(this.closestStorage as Id<StructureStorage>);
      if (!storage) {
        throw new Error("No storage");
      }

      return storage;
  }

  private getSource():Source {
    const foundSources = this.position.lookFor(LOOK_SOURCES);

    if (foundSources.length === 0) {
      throw new Error("Source not found");
    }

    return foundSources[0];
  }

  public getHarvesters(): Creep[] {
    return  getCreepsByRole(RemoteHarvester.ROLE, this.getTargetPositionAtString());
  }

  public harvest() {
    const scoots = this.getHarvesters();
    if (scoots.length < this.harvesterCount) {
      const index = CreepsIndex.getInstance();

      index.requestRemoteHarvester(this.position, creep => {
        creep.memory.role = getCreepRole(RemoteHarvester.ROLE, this.getTargetPositionAtString());
      });
    }

    scoots.forEach((scoot: Creep) => {
      if (scoot.store.getCapacity() === 0 && (scoot.ticksToLive || Number.MAX_SAFE_INTEGER) < 200) {
        scoot.suicide();
        return;
      }
      if (scoot.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && scoot.memory.objective === RemoteHarvester.OBJECTIVE_HARVEST) {
        scoot.memory.objective = RemoteHarvester.OBJECTIVE_STORE;
      }

      if (scoot.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (!scoot.memory.objective || scoot.memory.objective === RemoteHarvester.OBJECTIVE_STORE)) {

        scoot.memory.objective = RemoteHarvester.OBJECTIVE_HARVEST;
      }

      if (scoot.memory.objective === RemoteHarvester.OBJECTIVE_HARVEST) {
        scoot.say("-remote");

        if (scoot.room.name === this.position.roomName) {
          const source = this.getSource();
          if (!this.fineTuned && Game.time % this.refreshTick === 0) {
            this.fineTuned = true;
            this.harvesterCount = Math.max(1, Math.round(PathFinder.search(this.getSource().pos, this.getStorage().pos).path.length / 10));
          }
          if (scoot.harvest(source) === ERR_NOT_IN_RANGE) {
            scoot.moveTo(source, {visualizePathStyle: drawingOpts('#ff5ee1')});
          }
        } else {
          scoot.moveTo(this.position, {visualizePathStyle: drawingOpts('#ff5ee1')});
        }
      }

      if (scoot.memory.objective === RemoteHarvester.OBJECTIVE_STORE) {
        scoot.say("+remote");
        const destination = this.getStorage();

        if (scoot.transfer(destination, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(destination, {visualizePathStyle: drawingOpts('#ff5ee1')});
        }
      }
    });
  }
}
