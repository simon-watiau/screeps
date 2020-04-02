export default (room: Room) => {
  const storages = room.find<StructureStorage>(FIND_MY_STRUCTURES, {
    filter: (a: any) => a.structureType === STRUCTURE_STORAGE
  });

  if (storages.length > 0) {
    return storages[0];
  }

  return undefined;
};
