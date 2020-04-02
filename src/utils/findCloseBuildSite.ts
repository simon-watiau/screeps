const findCloseBuildSite = (center: RoomPosition, cb: (r: RoomPosition) => boolean) => {
  const baseX = center.x;
  const baseY = center.y;

  let keepLooking = true;
  for (let i = 0; keepLooking && i < 20; i++) {
    for (let x = baseX - i; x <= baseX + i && keepLooking; x++) {
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
    }
  }
};

export default findCloseBuildSite;
