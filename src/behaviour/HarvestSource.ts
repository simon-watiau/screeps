import _ from 'lodash';
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";

export default class HarvestSource {
  private static ROLE: string = 'harvester';
  private static META_SOURCE_ID: string = 'source_id';

  public static STATE_WORKING = 'WORKING';
  public static STATE_CONSTRUCTING = 'CONSTRUCTING';
  public static STATE_READY_TO_START = 'READY_TO_START';
  public static STATE_HARVESTER_CREATED = 'HARVESTER_CREATED';
  public static STATE_CREATING_CREEP = 'CREATING_HARVESTER';
  public static STATE_INIT = 'INIT';

  private sourceId: Id<Source>;
  private logger: Logger;

  public getHarvester(): Creep|undefined {
    const harvesters =  _.filter(Game.creeps, (c: Creep) => c.memory.role === HarvestSource.ROLE && c.memory.meta[HarvestSource.META_SOURCE_ID] === this.sourceId);

    if (harvesters.length === 0) {
      return undefined;
    }

    return harvesters[0];
  }

  public getSourceId(): Id<Source> {
    return this.sourceId;
  }

  public static getFreeSources(room: Room, harvesters: HarvestSource[]): Source[] {
    const harvestedSourcesIds = harvesters.map((harvester: HarvestSource) => {
        return harvester.getSourceId();
    });

    return room.find(FIND_SOURCES).sort((s1:Source, s2: Source): number => {
      if ( s1.id > s2.id ){
        return -1;
      }
      if ( s1.id < s2.id ){
        return 1;
      }
      return 0;
    }).filter((source: Source): boolean => {
      return !harvestedSourcesIds.includes(source.id);
    });
  }

  constructor(sourceId: Id<Source>) {
   this.logger = factory.getLogger("harvester." + sourceId);

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

  public isFullyHarvested(): boolean {
    return !!this.findCloseContainer();
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

  private findCloseContainer(): StructureContainer|undefined {
    const source = this.getSource();

    const containers = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});

    if (containers.length > 0) {
      return containers[0];
    }

    return undefined;
  }

  private findCloseContainerConstruction(): ConstructionSite|undefined {
    const source = this.getSource();
    const sites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER});

    if (sites.length > 0) {
      return sites[0];
    }

    return undefined;
  }

  public harvest() {

    const harvester = this.getHarvester();
    const closeContainer = this.findCloseContainer();
    const closeConstructionSite = this.findCloseContainerConstruction();

    const source = this.getSource();

    if (!harvester) {
      const creepIndex = new CreepsIndex();
      let level = CreepsIndex.LVL_HARVESTER_1;
      if (closeContainer) {
        level = CreepsIndex.LVL_HARVESTER_2;
      }
      const newCreep = creepIndex.requestHarvester(this.getSource().pos, level);
      if (newCreep) {
        newCreep.memory.role = HarvestSource.ROLE;
        newCreep.memory.meta = newCreep.memory.meta || {};
        newCreep.memory.meta[HarvestSource.META_SOURCE_ID] = source.id;
      }

      return;
    }

    if (harvester.spawning) {
      return;
    }

    if (closeContainer) {
      if (!harvester.pos.isEqualTo(closeContainer.pos)) {
        harvester.moveTo(closeContainer.pos);
        return;
      }
    }

    if (closeConstructionSite) {
      if (!harvester.pos.isEqualTo(closeConstructionSite.pos)) {
        harvester.moveTo(closeConstructionSite.pos);
        return;
      }
    }

    if (harvester.store.getFreeCapacity() > 0 || harvester.store.getCapacity() === null) {
        if (harvester.harvest(source) === ERR_NOT_IN_RANGE) {
          harvester.moveTo(source.pos);
        }
    }

    if (harvester.store.getFreeCapacity() === 0) {
      if (closeConstructionSite) {
        harvester.build(closeConstructionSite);
      }else if (closeContainer) {
        harvester.transfer(closeContainer, RESOURCE_ENERGY);
      }
    }
  }
}
