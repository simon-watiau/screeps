const findCloseBuildSite = (center: RoomPosition, cb: (r: RoomPosition) => boolean, shift= 0) => {
  const baseX = center.x;
  const baseY = center.y;

  let keepLooking = true;
  for (let i = shift; keepLooking && i < 20; i++) {
    for (let x = baseX - i; x <= baseX + i && keepLooking; x++) {
      try {
        if (x === baseX - i || x === baseX + i) {
          keepLooking = keepLooking && !cb(new RoomPosition(x, baseY, center.roomName));

        } else {
          keepLooking = keepLooking && !cb(
            new RoomPosition(x, baseY - i - Math.abs(x-baseX), center.roomName)
          );
          keepLooking = keepLooking && !cb(
            new RoomPosition(x, baseY - i - Math.abs(x-baseX), center.roomName)
          );
        }
      } catch(Err) {
        //  nothing to do
      }
    }
  }
};

export default findCloseBuildSite;
