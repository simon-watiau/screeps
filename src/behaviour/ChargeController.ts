import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";

export default class ChargeController extends StateMachine
{
  private controllerId: Id<StructureController>;

  private static ROLE = 'charger';
  private static META_CONTROLLER_ID = "controller_id";
  private static STATE_INIT = "init";
  private static STATE_CREATING = "creating";
  private static STATE_BUILD = "build";
  private static STATE_REFILL = "refill";
  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_BUILD = "build";


  constructor(controllerId: Id<StructureController>) {
    super(factory.getLogger("charger." + controllerId), ChargeController.STATE_INIT);
    this.controllerId = controllerId;

    this.logger.info('Started charging');
  }

  public getCharger(): Creep|undefined {
    const chargers =  _.filter(Game.creeps, (c: Creep) => c.memory.role === ChargeController.ROLE && c.memory.meta[ChargeController.META_CONTROLLER_ID] === this.controllerId);

    if (chargers.length === 0) {
      return undefined;
    }

    return chargers[0];
  }

  private getController(): StructureController {
    const controller = Game.getObjectById<StructureController>(this.controllerId);

    if (!controller) {
      throw new Error("Controller not found");
    }

    return controller;
  }

  protected computeState(): string {
    const creep: Creep|undefined = this.getCharger();

    if (creep === undefined) {
      return ChargeController.STATE_INIT;
    }

    if (creep.spawning) {
      return ChargeController.STATE_CREATING;
    }

    if (creep.store.getFreeCapacity() === 0 && creep.memory.objective === ChargeController.OBJECTIVE_FILL) {
      return ChargeController.STATE_BUILD;
    }

    if (creep.store.getUsedCapacity() === 0 && (creep.memory.objective === ChargeController.OBJECTIVE_BUILD || !creep.memory.objective)) {
      return ChargeController.STATE_REFILL;
    }

    if (creep.memory.objective === ChargeController.OBJECTIVE_BUILD) {
      return ChargeController.STATE_BUILD;
    }

    if (creep.memory.objective === ChargeController.OBJECTIVE_FILL) {
      return ChargeController.STATE_REFILL;
    }

    return ChargeController.STATE_REFILL;
  }

  private getClosestContainer(): StructureContainer|null {
    const charger: Creep|undefined =  this.getCharger();
    if (!charger) {
      throw new Error("Charger not found");
    }

    return charger.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});
  }

  protected applyState(state: string): void {
    switch (state) {
      case ChargeController.STATE_INIT:
        const controller = this.getController();
        const creepIndex = new CreepsIndex();
        const newCreep = creepIndex.requestHarvester(controller.pos);
        if (!newCreep) {
          return;
        }

        newCreep.memory.role = ChargeController.ROLE;
        newCreep.memory.meta = newCreep.memory.meta || {};
        newCreep.memory.meta[ChargeController.META_CONTROLLER_ID] = this.controllerId;
        break;
      case ChargeController.STATE_REFILL:
        const container = this.getClosestContainer();
        const charger = this.getCharger();

        if (!charger) {
          throw new Error('charger not found');
        }

        charger.memory.objective = ChargeController.OBJECTIVE_FILL;

        if (container) {
          const r = charger.withdraw(container, RESOURCE_ENERGY);
          if (r === ERR_NOT_IN_RANGE) {
            charger.moveTo(container);
          }
        } else {
          this.logger.info("no container");
        }
        break;
      case ChargeController.STATE_BUILD:
        const charger1 = this.getCharger();
        const ctrl = this.getController();

        if (!charger1) {
          throw new Error('charger not found');
        }

        charger1.memory.objective = ChargeController.OBJECTIVE_BUILD;

       if (charger1.upgradeController(ctrl) === ERR_NOT_IN_RANGE) {
          charger1.moveTo(ctrl);
       }
        break;
      }
    }

}
