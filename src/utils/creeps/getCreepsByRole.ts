import _ from "lodash";
import getCreepRole from "./getCreepRole";

export default (role: string, roomName?: string): Creep[] => {
  const targetRole = getCreepRole(role, roomName);

  return _.filter(Game.creeps, (c: Creep) =>  (c.memory.role || '').startsWith(targetRole));
}
