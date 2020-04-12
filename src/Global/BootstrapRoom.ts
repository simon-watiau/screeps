import _ from "lodash";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import findCloseBuildSite from "../utils/findCloseBuildSite";

export default class BootstrapRoom extends StateMachine{
  public static CENTER = 25;
  public static CONST_BUILDER_COUNT = 3;

  public static ROLE_BUILDER = 'builder';
  public static STATE_INIT = 'init';

  public static STATE_PLACE_SPAWN = 'spawn';
  public static STATE_SPAWN_BOOSTRAP = 'spawn b';
  public static STATE_BUILD = 'build';
  public static STATE_DONE = 'done';
  public static STATE_CHARGE = 'charge';

  private static OBJECTIVE_REFILL = 'refill';
  private static OBJECTIVE_BUILD = 'build';


  constructor(roomName: string) {
    super(
      BootstrapRoom.getStateMachineName(roomName),
      factory.getLogger("bootstrap." + roomName),
      roomName,
      BootstrapRoom.STATE_INIT
    );
  }

  public static getStateMachineName(name: string): string {
    return "bootstrap." + name;
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  private getController(): StructureController {
    const room = Game.rooms[this.roomName];
    if (!room.controller) {
      throw new Error("controller does not exist");
    }
    return room.controller;
  }

  public getBoostrappers(): Creep[] {
    return getCreepsByRole(BootstrapRoom.ROLE_BUILDER, this.roomName);
  }

  private getConstructionSite(): ConstructionSite| undefined {
    const sites = this.getRoom().find(FIND_CONSTRUCTION_SITES, {filter: (a) => a.structureType === STRUCTURE_SPAWN});
    if (sites.length === 0) {
      return undefined;
    }

    return sites[0];
  }
  protected computeState(): string {
    const hasSpawnConstructionSite = !!this.getConstructionSite();
    if (
      (
        this.latestState === BootstrapRoom.STATE_INIT ||
        this.latestState === BootstrapRoom.STATE_PLACE_SPAWN
      ) &&
      !hasSpawnConstructionSite
    ) {
      return BootstrapRoom.STATE_PLACE_SPAWN;
    }

    const hasSpawn = this.getRoom().find(FIND_MY_SPAWNS).length !== 0;

    if (!hasSpawn) {
      return BootstrapRoom.STATE_BUILD;
    }

    if (hasSpawn && this.getBoostrappers().length !== 0) {
      return BootstrapRoom.STATE_CHARGE;
    }

    return BootstrapRoom.STATE_DONE;
  }

  protected applyState(state: string): void {
    console.log("BOOTSTRAPPING ROOM STATE !");
    console.log(state);
    switch (state) {
      case BootstrapRoom.STATE_PLACE_SPAWN: {
        findCloseBuildSite(new RoomPosition(BootstrapRoom.CENTER, BootstrapRoom.CENTER, this.roomName),
          (r: RoomPosition) => {
            return r.createConstructionSite(STRUCTURE_SPAWN) === OK;
          });
      }
      break;
      case BootstrapRoom.STATE_BUILD: {

        const boostrapers = this.getBoostrappers();
        const constructionSite = this.getConstructionSite();
        if (!constructionSite) {
          return;
        }

        if (boostrapers.length < BootstrapRoom.CONST_BUILDER_COUNT) {
          console.log("REQUEST BOOSTRAPPER");
          CreepsIndex.getInstance().requestBoostrap(this.getController().pos, (c:Creep) => {
            c.memory.role = getCreepRole(BootstrapRoom.ROLE_BUILDER, this.roomName);
          });
        }

        boostrapers.forEach((c: Creep) => {

          if (c.spawning) {
            return;
          }
          if (!c.memory.objective) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_REFILL;
          }
          if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && c.memory.objective === BootstrapRoom.OBJECTIVE_REFILL) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_BUILD;
          }else if (c.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && c.memory.objective === BootstrapRoom.OBJECTIVE_BUILD) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_REFILL;
          }

          if (c.memory.objective === BootstrapRoom.OBJECTIVE_REFILL) {
            const closestSource = constructionSite.pos.findClosestByRange(FIND_SOURCES, {filter:(s: Source) => s.energy > 500});

            if (!closestSource) {
              throw new Error("invalid state");
            }

            if (c.harvest(closestSource) !== OK) {
              c.moveTo(closestSource.pos);
            }
          }

          if (c.memory.objective === BootstrapRoom.OBJECTIVE_BUILD) {
            if (c.build(constructionSite) === ERR_NOT_IN_RANGE) {
              c.moveTo(constructionSite);
            }
          }
        });
      }
      break;
      case BootstrapRoom.STATE_CHARGE:{
        const controller = this.getRoom().controller;
        if (!controller) {
          throw new Error("No controller");
        }
        this.getBoostrappers().forEach((c: Creep) => {
          if (c.spawning) {
            return;
          }
          if (!c.memory.objective) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_REFILL;
          }
          if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && c.memory.objective === BootstrapRoom.OBJECTIVE_REFILL) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_BUILD;
          }else if (c.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && c.memory.objective === BootstrapRoom.OBJECTIVE_BUILD) {
            c.memory.objective = BootstrapRoom.OBJECTIVE_REFILL;
          }

          if (c.memory.objective === BootstrapRoom.OBJECTIVE_REFILL) {
            const closestSource = controller.pos.findClosestByRange(FIND_SOURCES, {filter:(s: Source) => s.energy > 500});

            if (!closestSource) {
              throw new Error("invalid state");
            }

            if (c.harvest(closestSource) !== OK) {
              c.moveTo(closestSource.pos);
            }
          }

          if (c.memory.objective === BootstrapRoom.OBJECTIVE_BUILD) {
            if (c.upgradeController(controller) === ERR_NOT_IN_RANGE) {
              c.moveTo(controller);
            }
          }
        });
      }
      break;
    }
  }
}
