export const findWithRole = (role: string): Creep[] => {
  return _.filter(Game.creeps, (c: Creep) => c.memory.role === role);
};

export const findOneWithRole = (role: string): Creep|undefined => {
  const creeps = findWithRole(role);
  if (creeps.length === 0) {
    return undefined;
  }

  return creeps[0];
};
