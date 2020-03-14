import _ from 'lodash';
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";

export default class HarvestSource extends StateMachine {
  private static ROLE: string = 'harvester';
  private static META_SOURCE_ID: string = 'source_id';

  public static STATE_WORKING = 'WORKING';
  public static STATE_CONSTRUCTING = 'CONSTRUCTING';
  public static STATE_READY_TO_START = 'READY_TO_START';
  public static STATE_HARVESTER_CREATED = 'HARVESTER_CREATED';
  public static STATE_CREATING_CREEP = 'CREATING_HARVESTER';
  public static STATE_INIT = 'INIT';

  private sourceId: Id<Source>;

  public latestState: string = HarvestSource.STATE_INIT;

  public getHarvester(): Creep|undefined {
    const harvesters =  _.filter(Game.creeps, (c: Creep) => c.memory.role === HarvestSource.ROLE && c.memory.meta[HarvestSource.META_SOURCE_ID] === this.sourceId);

    if (harvesters.length === 0) {
      return undefined;
    }

    return harvesters[0];
  }

  constructor(sourceId: Id<Source>) {
    super(factory.getLogger("harvester." + sourceId), HarvestSource.STATE_INIT);
    this.sourceId = sourceId;
    this.logger.info('Started harvesting');
  }

  private getCreep(): Creep {
    const creep =  this.getHarvester();

    if (!creep) {
      throw new Error("Creep not found");
    }

    return creep;
  }

  private getSource(): Source {
    const source = Game.getObjectById<Source>(this.sourceId);

    if (!source) {
      throw new Error("Source not found");
    }
    return source;

  }

  private getTarget(): any {
    const containers = this.getSource().pos.findInRange(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});

    if (containers.length > 0) {
      return containers[0];
    }

    const constructionSites = this.getSource().pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER});


    if (constructionSites.length > 0) {
      return constructionSites[0];
    }

    return undefined;
  }

  private isContainerReady(): boolean {
    const source = this.getSource();

    return source.pos.findInRange(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;
  }

  private isConstructionReady(): boolean {
    const source = this.getSource();
    return source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;
  }

  protected computeState(): string {
    const creep: Creep|undefined = this.getHarvester();

    if (creep === undefined) {
      return HarvestSource.STATE_INIT;
    }

    const source = this.getSource();

    const containerReady = this.isContainerReady();
    if (containerReady && !creep.spawning && creep.pos.inRangeTo(this.getTarget(), 0)) {
      return HarvestSource.STATE_WORKING;
    }

    const constructionReady = this.isConstructionReady();
    if (constructionReady && !creep.spawning && creep.pos.inRangeTo(this.getTarget(), 0)) {
      return HarvestSource.STATE_CONSTRUCTING;
    }

    const target = this.getTarget();
    let inRange:boolean;

    if (target) {
      inRange = creep.pos === target.pos;
    }else {
      inRange = creep.pos.inRangeTo(source.pos, 1);
    }

    if (!creep.spawning && !inRange) {
      return HarvestSource.STATE_HARVESTER_CREATED;
    }

    if (!creep.spawning && inRange) {
      return HarvestSource.STATE_READY_TO_START;
    }

    if (creep.spawning) {
      return HarvestSource.STATE_CREATING_CREEP;
    }

    throw  new Error("Invalid state");
  }

  protected applyState(state: string): void {
    switch (state) {
      case HarvestSource.STATE_HARVESTER_CREATED:
        const target = this.getTarget();
        if (target) {
          this.getCreep().moveTo(target.pos);
        } else {
          this.getCreep().moveTo(this.getSource().pos);
        }
        break;
      case HarvestSource.STATE_READY_TO_START:
        this.getCreep().pos.createConstructionSite(STRUCTURE_CONTAINER);
        break;
      case HarvestSource.STATE_CONSTRUCTING:
        const creep1 = this.getCreep();
        if (creep1.store.getFreeCapacity() > 0) {
          creep1.harvest(this.getSource());
          this.logger.info('Harvesting for construction: '+ creep1.store.getUsedCapacity() + '/'+ creep1.store.getCapacity());
        }else {
          if (creep1.build(this.getTarget()) !== OK) {
            throw new Error("Failed to build");
          }
          const site:ConstructionSite = this.getTarget();
          this.logger.info('Building for construction: '+ site.progress + '/'+ site.progressTotal)
        }
        break;
      case HarvestSource.STATE_WORKING:
        const creep2 = this.getCreep();
        if (creep2.store.getFreeCapacity() > 0) {
          creep2.harvest(this.getSource());
          this.logger.info('Harvesting for container: '+ creep2.store.getUsedCapacity() + '/'+ creep2.store.getCapacity());
        }else {
          if (creep2.transfer(this.getTarget(), RESOURCE_ENERGY) !== OK) {
            throw new Error("Failed to deposit");
          }
          const site:StructureContainer = this.getTarget();
          this.logger.info('Building for container: '+ site.store.getUsedCapacity() + '/'+ site.store.getCapacity());
        }
        break;
      case HarvestSource.STATE_INIT:
        const source = this.getSource();
          const creepIndex = new CreepsIndex();
          const newCreep = creepIndex.requestHarvester(source.pos);
          if (!newCreep) {
            return;
          }

          this.logger.info('Harvester created');

          newCreep.memory.role = HarvestSource.ROLE;
          newCreep.memory.meta = newCreep.memory.meta || {};
          newCreep.memory.meta[HarvestSource.META_SOURCE_ID] = source.id;
        break;
    }
  }
}
