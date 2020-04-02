const moveOutsideExit = (creep: Creep) => {
  if (creep.pos.x === 0) {
    creep.move(pick([RIGHT, TOP_RIGHT, BOTTOM_RIGHT]));
  } else if (creep.pos.y === 0) {
    creep.move(pick([BOTTOM, BOTTOM_RIGHT, BOTTOM_LEFT]));
  } else if (creep.pos.x === 49) {
    creep.move(pick([LEFT, BOTTOM_LEFT, TOP_LEFT]));
  } else if (creep.pos.y === 49) {
    creep.move(pick([TOP, TOP_LEFT, TOP_RIGHT]));
  }
};

const pick = (directions: DirectionConstant[]): DirectionConstant => {
  return directions[Math.floor(Math.random() * directions.length)];
};

export default moveOutsideExit;
