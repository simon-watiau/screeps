import _ from 'lodash';
import {Logger} from "typescript-logging";
import Banker from "../Banker";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import cachedData from "../utils/cachedData";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import Min = Mocha.reporters.Min;

export default class HarvestSource {
  private static ROLE: string = 'harvester';
  private static META_TARGET_ID: string = 'source_id';

  public static STATE_WORKING = 'WORKING';
  public static STATE_CONSTRUCTING = 'CONSTRUCTING';
  public static STATE_READY_TO_START = 'READY_TO_START';
  public static STATE_HARVESTER_CREATED = 'HARVESTER_CREATED';
  public static STATE_CREATING_CREEP = 'CREATING_HARVESTER';
  public static STATE_INIT = 'INIT';

  private targetId: Id<Source|Mineral>;
  private logger: Logger;

  public getHarvester(): Creep|undefined {
    const harvesters =  getCreepsByRole(HarvestSource.ROLE, this.targetId);

    if (harvesters.length === 0) {
      return undefined;
    }

    return harvesters[0];
  }

  public getSourceId(): Id<Source|Mineral> {
    return this.targetId;
  }

  public isSource(): boolean {
    const source = Game.getObjectById(this.targetId);
    return source instanceof Source;
  }

  public isMineral(): boolean {
    const source = Game.getObjectById(this.targetId);
    return source instanceof Mineral;
  }

  public static countHarvesterByType(roomName: string, type: any): number {
    return getCreepsByRole(this.ROLE).filter((c: Creep) => {
      return Game.getObjectById(c.memory.meta[HarvestSource.META_TARGET_ID]) instanceof type
    }).length;
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

  public static getFreeMinerals(room: Room, harvesters: HarvestSource[]): Mineral[] {
    const harvestedSourcesIds = harvesters.map((harvester: HarvestSource) => {
      return harvester.getSourceId();
    });

    return room.find(FIND_MINERALS).filter((mineral: Mineral): boolean => {
      return !harvestedSourcesIds.includes(mineral.id);
    });
  }

  constructor(sourceId: Id<Source|Mineral>) {
   this.logger = factory.getLogger("harvester." + sourceId);

    this.targetId = sourceId;
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

  private getTarget(): Source|Mineral {
    const source = Game.getObjectById<Source|Mineral>(this.targetId);

    if (!source) {
      throw new Error("Source not found");
    }
    return source;

  }

  private getDestination(): any {
    const target =  this.getTarget();

    const containers = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});

    if (containers.length > 0) {
      return containers[0];
    }

    if (target instanceof Source) {
      const constructionSites = target.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER});


      if (constructionSites.length > 0) {
        return constructionSites[0];
      }
    }
    return undefined;
  }

  private findCloseContainer(): StructureContainer|undefined {
    const source = this.getTarget();
    const containerId: Id<StructureContainer>|undefined = cachedData<Id<StructureContainer>|undefined>(
      'harvest-close-container-' + source.id,
      () => {
        const containers = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});

        if (containers.length > 0) {
          return containers[0].id;
        }

        return undefined;
      },
      100
    );

    if (containerId) {
      return Game.getObjectById<StructureContainer>(containerId) || undefined;
    }

    return undefined;
  }

  private hasExtractor(): boolean {
    const source = this.getTarget();

    return source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_EXTRACTOR}).length !== 0;
  }

  private findCloseContainerConstruction(): ConstructionSite|undefined {
    const source = this.getTarget();
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
    const hasExtractor = this.hasExtractor();

    const source = this.getTarget();

    if ((!closeContainer || !hasExtractor) && this.isMineral()) {
      return;
    }

    if (
      (this.isMineral() && (source as Mineral).mineralAmount === 0) ||
      (this.isSource() && (source as Source).energy === 0)
    ) {
      return;
    }

    if (!harvester) {
      const creepIndex = CreepsIndex.getInstance();
      let level = CreepsIndex.LVL_HARVESTER_1;
      if (closeContainer || source instanceof Mineral) {
        level = CreepsIndex.LVL_HARVESTER_2;
      }
      creepIndex.requestHarvester(this.getTarget().pos, level, (creep: Creep) => {
        creep.memory.role = getCreepRole(HarvestSource.ROLE, source.id);
        creep.memory.meta = creep.memory.meta || {};
        creep.memory.meta[HarvestSource.META_TARGET_ID] = source.id;
      });

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

    if (closeConstructionSite && !harvester.store.getCapacity(RESOURCE_ENERGY) === null) {
      harvester.suicide();
      return;
    }

    if (closeConstructionSite) {
      if (!harvester.pos.isEqualTo(closeConstructionSite.pos)) {
        harvester.moveTo(closeConstructionSite.pos);
        return;
      }
    }

    if (harvester.store.getFreeCapacity(RESOURCE_ENERGY) > 0 || harvester.store.getCapacity(RESOURCE_ENERGY) === null) {
      const dropped = harvester.pos.findInRange(FIND_DROPPED_RESOURCES, 0, {filter: object => object.resourceType === RESOURCE_ENERGY});
      if (dropped.length > 0) {
        harvester.pickup(dropped[0]);
      }else if (harvester.harvest(source) === ERR_NOT_IN_RANGE) {
        harvester.moveTo(source.pos);
      }
    }

    if (harvester.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      if (closeConstructionSite) {
        harvester.say('building');
        harvester.build(closeConstructionSite);
      }else if (closeContainer) {
        if (this.isSource()) {
          harvester.transfer(closeContainer, RESOURCE_ENERGY);
        } else {
          harvester.transfer(closeContainer, (source as Mineral).mineralType);
        }
      }
    }
  }
}
