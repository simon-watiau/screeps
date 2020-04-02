import _ from "lodash";
import getCreepRole from "./getCreepRole";

export default (role: string, roomName?: string): Creep[] => {
  const targetRole = getCreepRole(role, roomName);

  // fix old creeps
  const creeps =  _.filter(Game.creeps, (c: Creep) => c.memory.role === role);
  creeps.forEach((c: Creep) => {
    c.memory.role = targetRole;
  });

  return _.filter(Game.creeps, (c: Creep) =>  (c.memory.role || '').startsWith(targetRole));
}
