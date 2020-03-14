const { readFileSync } = require('fs');
const _ = require('lodash');
const { ScreepsServer, stdHooks, TerrainMatrix } = require('screeps-server-mockup');
const DIST_MAIN_JS = 'dist/main.js';

/*
 * Helper class for creating a ScreepsServer and resetting it between tests.
 * See https://github.com/Hiryus/screeps-server-mockup for instructions on
 * manipulating the terrain and game state.
 */
class IntegrationTestHelper {
  private _server : any;
  private _player : any;

  get server() {
    return this._server;
  }

  get player() {
    return this._player;
  }

  public async beforeEach() {
    this._server = new ScreepsServer();
    // reset world but add invaders and source keepers bots
    await this._server.world.reset();

    // create a stub world composed of 9 rooms with sources and controller
    await this._server.world.stubWorld();
// Prepare the terrain for a new room
    const terrain = new TerrainMatrix();
    const walls = [[10, 10], [10, 40], [40, 10], [40, 40]];
    _.each(walls, ([x, y]) => terrain.set(x, y, 'wall'));

// Create a new room with terrain and basic objects
    await this._server.world.addRoom('W0N1');
    await this._server.world.setTerrain('W0N1', terrain);
    await this._server.world.addRoomObject('W0N1', 'controller', 10, 10, { level: 0 });
    await this._server.world.addRoomObject('W0N1', 'source', 10, 40, { energy: 20000, energyCapacity: 20000, ticksToRegeneration: 300 });
    await this._server.world.addRoomObject('W0N1', 'source', 15, 40, { energy: 20000, energyCapacity: 20000, ticksToRegeneration: 300 });


    // add a player with the built dist/main.js file
    const modules = {
        main: readFileSync(DIST_MAIN_JS).toString(),
    };
    this._player = await this._server.world.addBot({ username: 'player', room: 'W0N1', x: 15, y: 15, modules });

    this._player.on('console', (logs, results, userid, username) => {
      _.each(logs, line => console.log(`[console|${username}]`, line));
    });


    // Start server
    await this._server.start();
  }

  async afterEach() {
    await this._server.stop();
  }
}

beforeEach(async () => {
  await helper.beforeEach();
});

afterEach(async () => {
  await helper.afterEach();
});

before(() => {
  stdHooks.hookWrite();
});

export const helper = new IntegrationTestHelper();
