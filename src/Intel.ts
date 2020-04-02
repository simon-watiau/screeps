import MapRoom from "./attack/behaviour/MapRoom";

export default class Intel {
  public static MAX_INTEL_COUNT = 10;

  public static mapRoom(room: Room) {
    this.pushState(room.name, {
      timestamp: Game.time,
      towersCount: this.countTowers(room),
      towersPowerLeft: this.sumTowerPowerLeft(room)
    });
  }

  private static countTowers(room: Room): number {
    return room.find(FIND_HOSTILE_STRUCTURES, {filter:(s)=> s.structureType === STRUCTURE_TOWER}).length;
  }

  private static sumTowerPowerLeft(room: Room): number {
    let sum = 0;

    room.find(FIND_HOSTILE_STRUCTURES, {filter:(s)=> s.structureType === STRUCTURE_TOWER}).forEach((s: any) => {
     sum += s.store.getUsedCapacity(RESOURCE_ENERGY);
    });

    return sum;
  }

  public static pushState(roomName: string, state: IntelState) {
    if (!Memory.intel) {
      Memory.intel = {};
    }

    if (!Memory.intel[roomName]) {
      Memory.intel[roomName] = [];
    }

    Memory.intel[roomName].push(state);
    if (Memory.intel[roomName].length > this.MAX_INTEL_COUNT) {
      Memory.intel[roomName].shift();
    }
  }
}
