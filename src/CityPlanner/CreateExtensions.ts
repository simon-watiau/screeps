
export default class CreateExtension {
  public static placeExtension(room: Room) {
    if (!room.controller) {
      throw new Error("no controller in this room");
    }
    let extensionCount = 0;
    switch (room.controller.level) {
      case 2:
        extensionCount = 5;
        break;
      case 3:
        extensionCount = 10;
        break;
      default:
        extensionCount = (room.controller.level - 2) * 10;
        break;
    }

    const existingExtensions = room.find(FIND_MY_STRUCTURES, {filter: object => object.structureType === STRUCTURE_EXTENSION}).length;
    const extensionsBeingBuilt = room.find(FIND_CONSTRUCTION_SITES, {filter: object => object.structureType === STRUCTURE_EXTENSION}).length;
    if (existingExtensions + extensionsBeingBuilt >= extensionCount) {
      return;
    }

    const spawns = room.find(FIND_MY_SPAWNS);

    if (spawns.length === 0) {
      return;
    }

    const roomSpawn = spawns[0];

    for (let i = 1; i < 40; i++) {
      for (let x = roomSpawn.pos.x - i; x <= roomSpawn.pos.x + i; x+=2) {
        for (let y = roomSpawn.pos.y - i; y <= roomSpawn.pos.y + i; y+=2) {
          if (x > 5 && x < 43 && y > 5 && y < 43) {
            const candidatePosition = new RoomPosition(x, y, room.name);
            if (CreateExtension.isPositionEmpty(room, candidatePosition)) {
              const res = candidatePosition.createConstructionSite(STRUCTURE_EXTENSION);

              if (res === ERR_FULL) {
                return;
              }
            }
          }
        }
      }
    }
  }

  private static isPositionEmpty(room: Room, pos: RoomPosition): boolean {
    return room.lookAt(new RoomPosition(pos.x, pos.y, room.name)).filter((el) => {
      const isValid = el.terrain === "plain" || el.terrain === "swamp" || !!el.creep;
      return !isValid;
    }).length === 0;
  }
}
