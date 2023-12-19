import dataschema from "../src/dataschema";
import test from "node:test"
const { pack } = dataschema;

test("pack", async (t) => {
  await t.test("SkyChange", (t) => {
    testSkyChangePacket();
  })
  await t.test("RespawnLocations", (t) => {
    testRespawnLocationsPacket();
  })
})

function testSkyChangePacket() {
  const schema = require("./data/skychangeschema.json");

  const obj = require("./data/skychangeobj.json");

  const expected = Buffer.from(require("./data/skychangeresult.json"));

  const result = pack(schema, obj)

  if (result.data.compare(expected) !== 0) {
    throw new Error("SkyChange pack failed")
  }
}

function testRespawnLocationsPacket() {
  const schema = require("./data/RespawnLocationsschema.json");

  const obj = require("./data/RespawnLocationsobj.json");

  const expected = Buffer.from(require("./data/RespawnLocationsresult.json"));

  const result = pack(schema, obj)

  if (result.data.compare(expected) !== 0) {
    throw new Error("RespawnLocations pack failed")
  }
}
