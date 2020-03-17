export default class RoadBuilder {
  public static buildRoads(room: Room) {
    // room.find(FIND_CONSTRUCTION_SITES).forEach((site: ConstructionSite) => {
    //   site.remove();
    // });
    // return;
    const destinations = room.find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: OwnedStructure) => {
        return a.structureType === STRUCTURE_CONTAINER ||
          a.structureType === STRUCTURE_EXTENSION ||
          a.structureType === STRUCTURE_SPAWN ||
          a.structureType === STRUCTURE_CONTROLLER;
      }
    });

    destinations.forEach((source: Structure) => {
      destinations.forEach((dest: Structure) => {
        const path = source.pos.findPathTo(dest);
        for (const step of path) {
          const empty = room.lookAt(new RoomPosition(step.x, step.y, room.name)).filter((el) => {
            const isValid = el.terrain === "plain" || el.terrain === "swamp" || !!el.creep;
            return !isValid;
          }).length === 0;

          if (empty) {
           room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
         }
        }
      });
    });
  }
}
