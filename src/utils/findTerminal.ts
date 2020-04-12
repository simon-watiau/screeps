export default (room: Room) => {
  const terminal = room.find<StructureTerminal>(FIND_MY_STRUCTURES, {
    filter: (a: any) => a.structureType === STRUCTURE_TERMINAL
  });

  if (terminal.length > 0) {
    return terminal[0];
  }

  return undefined;
};
