class CreepsIndex {

  private static randomName(type: string): string {
    return type + " " + Math.floor(Math.random() * Math.floor(10000));
  };

  public requestHarvester(target: RoomPosition): Creep|undefined {
    console.log('Harvester requested');

    const spawn = this.findClosestSpawn(target);
    if (spawn === undefined) {
      console.log('No spawn available');

      return undefined;
    }

    const properties: any = {
      memory: {
        role: 'harvester'
      }
    };

    const harvesterName = CreepsIndex.randomName('harvester');

    const spawnStatus: ScreepsReturnCode = spawn.spawnCreep([WORK,CARRY,MOVE], harvesterName, properties);

    if (spawnStatus !== OK) {
      console.log('Spawning failed', spawnStatus);

      return undefined
    }

    console.log('Harvester', harvesterName, 'spawned');

    return Game.creeps[harvesterName];
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
