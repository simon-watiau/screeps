import _ from "lodash";
import {Logger} from "typescript-logging";
import Banker from "../Banker";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepByRole from "../utils/creeps/getCreepByRole";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import findStorage from "../utils/findStorage";
import findTerminal from "../utils/findTerminal";
import drawingOpts from "../utils/PathDrawing";
import Tower from "./Tower";

export default class RoomEquilibrium {
  public static ROLE = 'equilibrium';
  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("logistic." + roomName);
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("no controller");
    }
  }

  public getOtherStorages(): StructureStorage[] {
    const storages: StructureStorage[] = [];
    Object.values(Game.rooms).forEach(value => {
      if (this.roomName !== value.name) {
        const roomStorage = findStorage(value);
        if (roomStorage) {
          storages.push(roomStorage);
        }
      }
    });
    return storages;
  }

  public getMyStorage(): StructureStorage|undefined {
    return findStorage(this.getRoom());
  }

  public getMyTerminal(): StructureTerminal|undefined {
    return findTerminal(this.getRoom());
  }

  public shouldGive(resource: ResourceConstant): boolean {
    const myStorage = this.getMyStorage();
    if (!myStorage) {
      return false;
    }
    const usage = myStorage.store.getUsedCapacity(resource);
    return this.getOtherStorages().filter(value => value.store.getUsedCapacity(resource) < (usage - 500)).length !== 0;
  }

  public shouldTake(resource: ResourceConstant): boolean {
    const myStorage = this.getMyStorage();
    if (!myStorage) {
      return false;
    }
    const usage = myStorage.store.getUsedCapacity(resource);
    return this.getOtherStorages().filter(value => value.store.getUsedCapacity(resource) > (usage + 500)).length !== 0;
  }

  public getSource(resource: ResourceConstant): StructureStorage|StructureTerminal|undefined {
    if (this.shouldGive(resource)) {
      return this.getMyStorage();
    }
    if (this.shouldTake(resource)) {
      return this.getMyTerminal();
    }
    return undefined;
  }


  public getDestination(resource: ResourceConstant): StructureStorage|StructureTerminal|undefined {
    if (this.shouldGive(resource)) {
      return this.getMyTerminal();
    }
    if (this.shouldTake(resource)) {
      return this.getMyStorage();
    }
    return undefined;
  }

  public getLogistic(): Creep|undefined {
    return getCreepByRole(RoomEquilibrium.ROLE, this.roomName);
  }

  public share() {
    let source;
    let destination;
    let resource: ResourceConstant|undefined;

    for (const r of RESOURCES_ALL) {
      destination = this.getDestination(r);
      source = this.getSource(r);
      resource = r;
      if (source && destination) {
        break;
      }
    }
    if (this.roomName === 'W9N6') {
      console.log('READY', resource);
    }
    const scoot = this.getLogistic();
    if (!source || !destination || !resource) {
      if (this.roomName === 'W9N6') {
        console.log('ABORT');
      }
      return;
    }



    if (!scoot) {
      const index = CreepsIndex.getInstance();

      index.requestLogistic(new RoomPosition(10, 10, this.roomName), creep => {
        creep.memory.role = getCreepRole(RoomEquilibrium.ROLE, this.roomName);
      });

      return;
    }

    if ((scoot.store.getFreeCapacity() === 0 ||(scoot.store.getUsedCapacity() !== 0 && source.store.getUsedCapacity(resource) === 0)) && scoot.memory.objective === RoomEquilibrium.OBJECTIVE_REFILL) {
      scoot.memory.objective = RoomEquilibrium.OBJECTIVE_FILL;
    }

    if (scoot.store.getUsedCapacity() === 0 && (!scoot.memory.objective || scoot.memory.objective === RoomEquilibrium.OBJECTIVE_FILL)) {

      scoot.memory.objective = RoomEquilibrium.OBJECTIVE_REFILL;
    }

    if (scoot.memory.objective === RoomEquilibrium.OBJECTIVE_REFILL) {
      scoot.say('REFILL');
      if (scoot.withdraw(source, resource) === ERR_NOT_IN_RANGE) {
        const moveRes = scoot.moveTo(destination, {visualizePathStyle: drawingOpts('#ffce0b')});
      }
    }

    if (scoot.memory.objective === RoomEquilibrium.OBJECTIVE_FILL) {
      scoot.say('FILL');
      const types = Object.keys(scoot.store);
      if (scoot.transfer(destination, types[0] as ResourceConstant) === ERR_NOT_IN_RANGE) {
        scoot.moveTo(destination, {visualizePathStyle: drawingOpts('#ffce0b')});
      }
    }
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }
}
