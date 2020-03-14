import {assert} from "chai";
import {helper} from "./helper";

describe("main", () => {

  it("writes and reads to memory", async () => {
    while(true) {
      await helper.server.tick();
      console.log('tick');
    }
  });
});
