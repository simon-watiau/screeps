class CreepsIndex {
  public static LVL_HARVESTER_1 = 1;
  public static LVL_HARVESTER_2 = 2;

  private static randomName(type: string): string {
    return type + " " + Math.floor(Math.random() * Math.floor(10000));
  };

  public requestHarvester(target: RoomPosition, level: number): Creep|undefined {
    let body: BodyPartConstant[];
    switch (level) {
      default:
      case CreepsIndex.LVL_HARVESTER_1:
        body = [WORK, CARRY, MOVE];
        break;
      case CreepsIndex.LVL_HARVESTER_2:
        body = [WORK, WORK, MOVE];
        break;
    }
    return this.request(target, 'harvester', body)
  }

  public requestRepair(target: RoomPosition): Creep|undefined {
    let body: BodyPartConstant[];

    body = [WORK, CARRY, MOVE];

    return this.request(target, 'repair', body)
  }

  public requestLogistic(target: RoomPosition, level: number = -1): Creep|undefined {
    let body: BodyPartConstant[];
    switch (level) {
      default:
        body = [CARRY, CARRY, MOVE, MOVE];
        break;
    }
    return this.request(target, 'logistic', body)
  }

  public requestCharger(target: RoomPosition, level: number = -1): Creep|undefined {
    let body: BodyPartConstant[];
    switch (level) {
      default:
        body = [CARRY, WORK, MOVE];
        break;
    }
    return this.request(target, 'charger', body)
  }

  public requestBuilder(target: RoomPosition, level: number = -1): Creep|undefined {
    let body: BodyPartConstant[];
    switch (level) {
      default:
        body = [WORK, CARRY, MOVE];
        break;
    }
    return this.request(target, 'builder', body)
  }

  public requestClaim(target: RoomPosition): Creep|undefined {
    let body: BodyPartConstant[];

    body = [CLAIM, WORK, MOVE];
    return this.request(target, 'claim', body)
  }


  public request(target: RoomPosition, label:string, body: BodyPartConstant[]): Creep|undefined {
    console.log(label, 'requested');

    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      console.log('No spawn available');

      return undefined;
    }


    const creepName = CreepsIndex.randomName(label);
    const spawnStatus = spawn.spawnCreep(body, creepName);

    if (spawnStatus !== OK) {
      console.log('Spawning failed', spawnStatus);

      return undefined
    }

    console.log(label, creepName, 'spawned');

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
      console.log("no rounte");
      return;
    }

    const pos: RoomPosition = ret.path[0];
    if (!pos) {
      console.log(ret.path);
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
