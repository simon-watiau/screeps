import Banker from "../Banker";

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

  public static PRIORITIES:any = {
    [TOUGH]: 8,
    // tslint:disable-next-line:object-literal-sort-keys
    [ATTACK]: 7,
    [RANGED_ATTACK]: 6,
    [MOVE] : 5,
    [HEAL] : 4,
    [WORK] : 3,
    [CARRY] : 2,
    [CLAIM] : 1,
  };

  public static LVL_HARVESTER_1 = 1;
  public static LVL_HARVESTER_2 = 2;

  private static instance: CreepsIndex;

  private requests: Job[] = [];

  public static getInstance(): CreepsIndex {
    if (!CreepsIndex.instance) {
      CreepsIndex.instance = new CreepsIndex();
    }

    return CreepsIndex.instance;
  }

  public static averageBodyCost(roomName:string) : number {
    let cost = 0;
    let total = 0;
    Object.keys(Game.creeps).forEach((name: string) => {
      const creep = Game.creeps[name];

      if (!creep) {
        throw new Error("Failed to get creep");
      }
      if (creep.room.name === roomName) {
        total++;
        cost += CreepsIndex.computeBodyCost(creep.body);
      }
    });

    if(total === 0) {
      return 0;
    }

    return cost/total;
  }

  public static canUpgradeCreep(creep: Creep, type: string): boolean {
    const averagePrice = this.averageBodyCost(creep.room.name);
    const currentPrice = this.computeBodyCost(creep.body);
    if (currentPrice < averagePrice) {
      Banker.getInstance(creep.room.name).getFinancing([type])
    }
    return false;
  }

  private static randomName(type: string): string {
    return type + " " + Math.floor(Math.random() * Math.floor(10000));
  };

  private constructor() {
  }

  public init() {
    this.requests = [];
  }

  public static computeBodyCost(body: BodyPartDefinition[]): number {
    let cost = 0;
    body.forEach((part: BodyPartDefinition) => {
      cost += BODYPART_COST[part.type];
    });

    return cost;
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
      const currentSpawn = Game.getObjectById(spawnId);

      if (!currentSpawn) {
        throw new Error("Spawn does not exist");
      }

      let financing;

      // first pass with the needs of the current room
      let jobsToConsider = jobs.filter((job: Job) => job.position.roomName === currentSpawn.room.name);

      if (jobsToConsider.length !== 0) {
        const types = jobsToConsider.map((job: Job) => job.type);
        financing = Banker.getInstance(currentSpawn.room.name).getFinancing(types);
      } else {
        jobsToConsider = jobs.filter((job: Job) => job.position.roomName !== currentSpawn.room.name);
        const types = jobsToConsider.map((job: Job) => job.type);
        financing = Banker.getInstance(currentSpawn.room.name).getFinancing(types);
      }

      if (!financing || financing.amount === 0) {
        return;
      }

      let jobPerformed = false;
      for (let i =0; i< jobsToConsider.length && !jobPerformed; i++) {
        const job = jobsToConsider[i];
        if (job.type !== financing.type) {
          continue;
        }
        jobPerformed = true;
        switch(financing.type) {
          case Banker.TYPE_HARVESTER:
            this.doCreateHarvester(job, financing.amount);
            break;
          case Banker.TYPE_REPAIR:
            this.doRepair(job);
            break;
          case Banker.TYPE_LOGISTIC:
            this.doLogstic(job, financing.amount);
            break;
          case Banker.TYPE_REMOTE_HARVESTER:
             this.doRemoteHarvester(job, financing.amount);
            break;
          case Banker.TYPE_CHARGER:
            this.doCharger(job, financing.amount);
            break;
          case Banker.TYPE_BUILDER:
            this.doBuilder(job, financing.amount);
            break;
          case Banker.TYPE_CLAIM:
            this.doClaim(job);
            break;
          case Banker.TYPE_DEFEND:
            this.doDefend(job, financing.amount);
            break;
          case Banker.TYPE_ATTACK:
            this.doAttack(job, financing.amount);
            break;
          case Banker.TYPE_TANK:
            this.doTank(job, financing.amount);
            break;
          case Banker.TYPE_BOOTSTRAP:
            this.doBootstrap(job, financing.amount);
            break;
          case Banker.TYPE_MAPPER:
            this.doMapper(job, financing.amount);
            break;
        }
      }
    });
  }

  public requestHarvester(target: RoomPosition, level: number, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      level,
      position: target,
      type: Banker.TYPE_HARVESTER,
    });
  }

  public requestBoostrap(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_BOOTSTRAP,
    });
  }

  public requestMapper(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_MAPPER,
    });
  }

  public requestDefender(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_DEFEND,
    });
  }

  public requestAttacker(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_ATTACK,
    });
  }

  public requestTank(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_TANK,
    });
  }

  public requestRepair(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_REPAIR,
    });
  }

  public requestLogistic(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_LOGISTIC,
    });
  }

  public requestRemoteHarvester(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_REMOTE_HARVESTER,
    });
  }

  public requestCharger(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_CHARGER,
    });
  }

  public requestBuilder(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_BUILDER,
    });
  }


  public requestClaim(target: RoomPosition, cb: (creep: Creep) => void): void {
    this.requests.push({
      callback: cb,
      position: target,
      type: Banker.TYPE_CLAIM,
    });
  }

  public doCreateHarvester(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];
    switch (job.level) {
      default:
      case CreepsIndex.LVL_HARVESTER_1:
        body = this.computeBestBody(spawn, [WORK, CARRY, MOVE], [WORK, CARRY, MOVE], energy);
        break;
      case CreepsIndex.LVL_HARVESTER_2:
        body = this.computeBestBody(spawn, [WORK], [MOVE], energy);
        break;
    }

    const creep = this.request(spawn, job.position, 'harvester', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doDefend(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = this.computeBestBody(spawn, [ATTACK, MOVE, TOUGH], [ATTACK, MOVE], energy);

    const creep = this.request(spawn, job.position, 'defend', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doAttack(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = this.computeBestBody(spawn, [MOVE, HEAL], [ATTACK, HEAL, MOVE], energy);

    const creep = this.request(spawn, job.position, 'attack', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doTank(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL];

    const creep = this.request(spawn, job.position, 'tank', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doBootstrap(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = this.computeBestBody(spawn, [WORK, MOVE, CARRY], [WORK, MOVE, CARRY], energy);

    const creep = this.request(spawn, job.position, 'bootstrap', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doMapper(job: Job, energy: number) {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return;
    }

    let body: BodyPartConstant[] = [];

    body = this.computeBestBody(spawn, [], [MOVE], energy);

    const creep = this.request(spawn, job.position, 'mapper', body);
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

  private doLogstic(job: Job, energy: number): void {
    const spawn = this.findClosestSpawn(job.position);

    if (spawn === undefined) {
      return undefined;
    }

    const body = this.computeBestBody(spawn, [MOVE, CARRY], [MOVE, CARRY], energy);

    const creep = this.request(spawn, job.position, 'logistic', body);
    if (creep) {
      job.callback(creep);
    }
  }

  private doRemoteHarvester(job: Job, energy: number): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {

      return undefined;
    }

    const body = this.computeBestBody(spawn, [WORK, MOVE, CARRY], [WORK, MOVE, CARRY], energy);

    const creep = this.request(spawn, job.position, 'remote harvester', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doCharger(job: Job, energy: number): void {
    const spawn = this.findClosestSpawn(job.position);

    if (spawn === undefined) {
      return undefined;
    }

    const body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE], energy);

    const creep = this.request(spawn, job.position, 'charger', body);
    if (creep) {
      job.callback(creep);
    }
  }

  public doBuilder(job: Job, energy: number): void {
    const spawn = this.findClosestSpawn(job.position);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];
    body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE], energy);

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

  private computeBestBody(spawn: StructureSpawn, maxOut: BodyPartConstant[], required: BodyPartConstant[], energy: number): BodyPartConstant[] {
    let computedBody: BodyPartConstant[] = [];

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
    } while(nextPart && computedBody.length < 50);

    computedBody = computedBody.sort((a: string, b: string) => {
      return CreepsIndex.PRIORITIES[b] - CreepsIndex.PRIORITIES[a];
    });

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
    const availableSpawns = Object.values<StructureSpawn>(Game.spawns);

    if (availableSpawns.length === 0) {
      return;
    }

    let bestSpawn: StructureSpawn|undefined;

    // if there is a spawn in the room, this one will be used no mater what
    availableSpawns.forEach((s: StructureSpawn) => {
      if (s.room.name === target.roomName) {
        bestSpawn = s;
      }
    });

    if (bestSpawn) {
      return bestSpawn;
    }

    let minDistance = Infinity;
    availableSpawns.forEach(spawn => {
      const distance = Game.map.getRoomLinearDistance(spawn.pos.roomName, target.roomName);
      if (
        spawn.spawning ||
        distance > minDistance
      ) {
        return;
      }

      minDistance = distance;
      bestSpawn = spawn;
    });

    return bestSpawn;
  }
}

export default CreepsIndex;
