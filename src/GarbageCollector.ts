
const garbageCollect = () => {
    console.log("garbage collect");
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  };
export default garbageCollect;
