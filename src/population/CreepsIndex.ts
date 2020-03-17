class CreepsIndex {
  public static LVL_HARVESTER_1 = 1;
  public static LVL_HARVESTER_2 = 2;

  private static instance: CreepsIndex;
  private constructor() {

  }

  public static getInstance(): CreepsIndex {
    if (!CreepsIndex.instance) {
      CreepsIndex.instance = new CreepsIndex();
    }

    return CreepsIndex.instance;
  }

  private static randomName(type: string): string {
    return type + " " + Math.floor(Math.random() * Math.floor(10000));
  };

  public requestHarvester(target: RoomPosition, level: number): Creep|undefined {
    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[] = [];
    switch (level) {
      default:
      case CreepsIndex.LVL_HARVESTER_1:
        body = this.computeBestBody(spawn, [WORK, CARRY, MOVE], [WORK, CARRY, MOVE]);
        break;
      case CreepsIndex.LVL_HARVESTER_2:
        body = this.computeBestBody(spawn, [WORK], [MOVE]);
        break;
    }

    return this.request(spawn, target, 'harvester', body)
  }


  public requestRepair(target: RoomPosition): Creep|undefined {
    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];

    body = [WORK, CARRY, MOVE];

    return this.request(spawn, target, 'repair', body)
  }

  public requestLogistic(target: RoomPosition, level: number = -1): Creep|undefined {
    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {

      return undefined;
    }

    const body = this.computeBestBody(spawn, [MOVE, CARRY], [MOVE, CARRY]);

    return this.request(spawn, target, 'logistic', body)
  }

  public requestCharger(target: RoomPosition, level: number = -1): Creep|undefined {
    const spawn = this.findClosestSpawn(target);

    if (spawn === undefined) {
      return undefined;
    }

    const body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE]);

    return this.request(spawn, target, 'charger', body)
  }

  public requestBuilder(target: RoomPosition, level: number = -1): Creep|undefined {
    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];
    body = this.computeBestBody(spawn, [CARRY, WORK, MOVE], [CARRY, WORK, MOVE]);

    return this.request(spawn, target, 'builder', body)
  }

  public requestClaim(target: RoomPosition): Creep|undefined {
    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      return undefined;
    }

    let body: BodyPartConstant[];

    body = [CLAIM, WORK, MOVE];
    return this.request(spawn, target, 'claim', body)
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
      return;
    }

    const pos: RoomPosition = ret.path[0];
    if (!pos) {
      return undefined;
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
