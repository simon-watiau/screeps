const cachedData = <T>(key: string, call: () => T, time: number): T => {
  if (!Memory.cached) {
    Memory.cached = {};
  }

  if (!Memory.cached[key] || Memory.cached[key].data === undefined || Game.time - Memory.cached[key].timestamp > time) {
    Memory.cached[key] = {
      data: call(),
      timestamp: Game.time
    };
  }

  return Memory.cached[key].data;
};

export default cachedData;
