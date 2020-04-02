import _ from "lodash";

export default (role: string, owner: string = ''): string => {
  return role + '-' + owner;
}
