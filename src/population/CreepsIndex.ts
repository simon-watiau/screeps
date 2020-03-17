interface Job {
  type: string,
  level?: number,
  position: RoomPosition,
  callback: (creep: Creep) => void
}

interface BodyConfig {
  part: BodyPartConstant,
  percentage: number
}

class CreepsIndex {
  public static LVL_HARVESTER_1 = 1;
  public static LVL_HARVESTER_2 = 2;

  public static TYPE_HARVESTER = 'harvester';
  public static TYPE_REPAIR = 'repair';
  public static TYPE_LOGISTIC = 'logistic';
  public static TYPE_CHARGER = 'charger';
  public static TYPE_BUILDER = 'builder';
  public static TYPE_CLAIM = 'claim';
  public static TYPE_DEFEND = 'defend';

  public static PRIORITIES = {
    [CreepsIndex.TYPE_DEFEND]: 7,
    [CreepsIndex.TYPE_HARVESTER]: 6,
    [CreepsIndex.TYPE_CHARGER] : 5,
    [CreepsIndex.TYPE_LOGISTIC] : 4,
    [CreepsIndex.TYPE_REPAIR] : 3,
    [CreepsIndex.TYPE_BUILDER] : 2,
    [CreepsIndex.TYPE_CLAIM]  : 1,
  };

  private static instance: CreepsIndex;

  private requests: Job[] = [];

  public static getInstance(): CreepsIndex {
    if (!CreepsIndex.instance) {
      CreepsIndex.instance = new CreepsIndex();
    }

    return CreepsIndex.instance;
  }

  private static randomName(type: string): string {
    return type + " " + Math.floor(Math.random() * Math.floor(10000));
  };

  private constructor() {
  }

  public init() {
    this.requests = [];
  }

  public resolve() {
    const groupedBySpawns: Map<Id<StructureSpawn>, Job[]> = new Map<Id<StructureSpawn>, Job[]>();

    this.requests.forEach((job: Job) => {
      const spawn = this.findClosestSpawn(job.position);
      if (spawn === undefined) {
        return;
      }

      let group = groupedBySpawns.get(spawn.id);
      if (!group) {
        group = [];
      }

      group.push(job);

      groupedBySpawns.set(spawn.id, group);
    });

    groupedBySpawns.forEach((jobs: Job[], spawnId: Id<StructureSpawn>) => {
      let bestJob: Job|undefined;
      const currentSpawn = Game.getObjectById(spawnId);

      if (!currentSpawn) {
        throw new Error("Spawn does not exist");
      }

      jobs.forEach((job: Job) => {
        if (!bestJob) {
          bestJob = job;
        }else {
          if (CreepsIndex.PRIORITIES[job.type] > CreepsIndex.PRIORITIES[bestJob.type]) {
            bestJob = job;
          }
        }
      });

      if (bestJob) {
        if (bestJob.type === CreepsIndex.TYPE_REPAIR) {
          this.doRepair(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_LOGISTIC) {
          this.doLogstic(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_BUILDER) {
          this.doBuilder(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_CHARGER) {
          this.doCharger(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_CLAIM) {
          this.doClaim(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_HARVESTER) {
          this.doCreateHarvester(bestJob);
        } else if (bestJob.type === CreepsIndex.TYPE_DEFEND) {
          this.doDefend(bestJob);
        }
      }
    });
  }

  public requestHarvester(target: RoomPosition, level: number, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      level,
      position: target,
      type: CreepsIndex.TYPE_HARVESTER,
    });
  }

  public requestDefender(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_DEFEND,
    });
  }

  public requestRepair(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_REPAIR,
    });
  }

  public requestLogistic(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_LOGISTIC,
    });
  }


  public requestCharger(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_CHARGER,
    });
  }

  public requestBuilder(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_BUILDER,
    });
  }


  public requestClaim(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: CreepsIndex.TYPE_CLAIM,
    });
  }

  public doCreateHarvester(job: Job) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];
    switch (job.level) {
      default:
      case CreepsIndex.LVL_HARVESTER_1:
        body = this.computeBestBody(spawn, [WORK, CARRY, MOVE], [WORK, CARRY, MOVE]);
        break;
      case CreepsIndex.LVL_HARVESTER_2:
        body = this.computeBestBody(spawn, [WORK], [MOVE]);
        break;
    }

    const creep = this.request(spawn, job.position, 'harvester', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doDefend(job: Job) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = this.computeBestBody(spawn, [ATTACK, MOVE], [ATTACK, MOVE]);

    const creep = this.request(spawn, job.position, 'defend', body);
    if (creep) {
      job.callback(creep);
    }
  }

  private doRepair(job: Job): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[];

    body = [WORK, CARRY, MOVE];

    const creep = this.request(spawn, job.position, 'repair', body);
    if (creep) {
      job.callback(creep);
    }
  }

  private doLogstic(job: Job): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {

      return undefined;
    }

    const body = this.computeBestBody(spawn, [MOVE, CARRY], [MOVE, CARRY]);

    const creep = this.request(spawn, job.position, 'logistic', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doCharger(job: Job): void {
    const spawn = this.findClosestSpawn(job.position);

    if (spawn === undefined) {
      return undefined;
    }

    const body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE]);

    const creep = this.request(spawn, job.position, 'charger', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doBuilder(job: Job): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];
    body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE]);

    const creep = this.request(spawn, job.position, 'builder', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doClaim(job: Job): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];

    body = [CLAIM, WORK, MOVE];

    const creep = this.request(spawn, job.position, 'claim', body);

    if (creep) {
      job.callback(creep);
    }
  }

  private computeBestBody(spawn: StructureSpawn, maxOut: BodyPartConstant[], required: BodyPartConstant[]): BodyPartConstant[] {
    let computedBody: BodyPartConstant[] = [];
    let energy = spawn.room.energyAvailable;

    // Add mandatory parts
    required.forEach((part: BodyPartConstant) => {
      computedBody.push(part);
    });

    // Add one of each to max out
    maxOut.forEach((part: BodyPartConstant) => {
      computedBody.push(part);
    });

    // clean basic configuration
    computedBody = computedBody.filter((elem, index, self) => {
      return index === self.indexOf(elem);
    });

    computedBody.forEach((part: BodyPartConstant) => {
      energy -= BODYPART_COST[part];
    });

    let nextPart: BodyPartConstant|undefined;
    do {
      nextPart = undefined;
      maxOut.forEach((cursor: BodyPartConstant) => {

        if (nextPart === undefined) {
          if (energy >= BODYPART_COST[cursor]) {
            nextPart = cursor;
          }
        }else {
          maxOut.forEach((part: BodyPartConstant, index: number) => {
            if (
              nextPart &&
              this.countBodyPartsByType(computedBody, part) <= this.countBodyPartsByType(computedBody, nextPart) &&
              energy >= BODYPART_COST[part]
            ) {
              nextPart = part;
            }
          });
        }
      });
      if (nextPart) {
        computedBody.push(nextPart);
        energy = energy - BODYPART_COST[nextPart];
      }
    } while(nextPart);
    return computedBody;
  }



  private countBodyPartsByType(body: BodyPartConstant[], part: BodyPartConstant): number {
    let count = 0;
    body.forEach((cursor: BodyPartConstant) => {
      if (cursor === part) {
        count++;
      }
    });
    return count;
  }

  public request(spawn: StructureSpawn, target: RoomPosition, label:string, body: BodyPartConstant[]): Creep|undefined {
    const creepName = CreepsIndex.randomName(label);
    const spawnStatus = spawn.spawnCreep(body, creepName);
    if (spawnStatus !== OK) {

      return undefined
    }

    return Game.creeps[creepName];
  }

  public findClosestSpawn(target: RoomPosition) : StructureSpawn|undefined {
    const availableSpawns = _.filter(
      Game.spawns, (spawn: StructureSpawn) => {
        return !spawn.spawning;

      });

    if (availableSpawns.length === 0) {
      return;
    }

    const goals = _.map(availableSpawns, (spawn: StructureSpawn) => {
      return { pos: spawn.pos, range: 1 };
    });

    const opts: PathFinderOpts = {
      roomCallback: (roomName: string): boolean|CostMatrix => {
        const room = Game.rooms[roomName];
        if (!room) {
          return false
        }

        const costs = new PathFinder.CostMatrix;

        room.find(FIND_STRUCTURES).forEach((struct: Structure)  => {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
            (struct.structureType !== STRUCTURE_RAMPART ||
              !(struct instanceof OwnedStructure))) {
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });

        // Avoid creeps in the room
        room.find(FIND_CREEPS).forEach((creep) => {
          costs.set(creep.pos.x, creep.pos.y, 0xff);
        });

        return costs;
      }
    };

    const ret = PathFinder.search(
      target, goals, opts

    );

    if (!ret) {
      console.log("NO PATH");
      return;
    }

    const pos: RoomPosition = ret.path[0];
    if (!pos) {
      // Because if it's next to the spawn no path is needed.
      return availableSpawns[0];
    }

    let bestSpawn: StructureSpawn|undefined;
    let bestSpawnDistance: number = -1;
    availableSpawns.forEach((spawn: StructureSpawn) => {
      const currentDistance: number = Math.abs(pos.x - spawn.pos.x) +  Math.abs(pos.x - spawn.pos.x);
      if (bestSpawnDistance === -1 || currentDistance < bestSpawnDistance) {
        bestSpawn = spawn;
        bestSpawnDistance = currentDistance;
      }
    });

    return bestSpawn;
  }
}

export default CreepsIndex;
