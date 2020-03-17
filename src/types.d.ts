// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  role: string;
  meta: any;
  objective: string;
}

interface Memory {
  uuid: number;
  log: any;
  test:any;
  terraformedRoom: {
    [roomName: string]: RoomMemory
  }
}

interface RoomMemory {
  harvesters: Array<Id<Source>>
  controller?: Id<StructureController>
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
