// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  role: string;
  targetRoomName: string,
  meta: any;
  objective: string;
}

interface Memory {
  uuid: number;
  log: any;
  terraformedRoom: {
    [roomName: string]: RoomMemory
  },
  intel: {
    [roomName: string]: IntelState[]
  }
}

interface IntelState {
  timestamp?:number,
  towersCount: number,
  towersPowerLeft: number
}

interface RoomMemory {
  stateMachines: any,
  controller?: Id<StructureController>
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
