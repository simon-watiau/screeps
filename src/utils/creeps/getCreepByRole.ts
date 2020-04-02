import _ from "lodash";
import getCreepsByRole from "./getCreepsByRole";

export default (role: string, roomName?: string): Creep|undefined => {
 const creeps = getCreepsByRole(role, roomName);
 if (creeps.length === 0) {
   return undefined;
 }

 return creeps[0];
}
