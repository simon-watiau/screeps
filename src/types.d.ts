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
  cached: {
    [key: string] : {
      timestamp: number,
      data: any
    }
  },
  stateMachines: {
    [name: string]: string
  }
  intel: {
    rooms: {
      [roomName: string]: IntelState[]
    }
  }
}

interface IntelState {
  timestamp:number,
  isHostile: boolean,
  powerTTL: number,
  isReachable: boolean,
}

interface RoomMemory {
  controller?: Id<StructureController>
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
