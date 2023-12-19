import dataschema from "../src/dataschema";
const { parse } = dataschema;
import test from "node:test"

test("parse", async (t) => {
  await t.test("SkyChange", (t) => {
    testSkyChangePacket();
  })
  await t.test("RespawnLocations", (t) => {
    testRespawnLocationsPacket();
  })
})

function testSkyChangePacket() {
  const schema = require("./data/skychangeschema.json");

  const expected = require("./data/skychangeobj.json");

  const data = Buffer.from(require("./data/skychangeresult.json"));

  const result = parse(schema, data, 0);
  expected.unknownArray = []
  if (JSON.stringify(result.result) !== JSON.stringify(expected)) {
    throw new Error("SkyChange parse failed")
  }
}

function testRespawnLocationsPacket() {
  const schema = require("./data/RespawnLocationsschema.json");

  const expected = require("./data/RespawnLocationsobj.json");

  const data = Buffer.from(require("./data/RespawnLocationsresult.json"));

  const result = parse(schema, data, 0);

  Object.keys(result.result).forEach((element: any) => {
    if (!expected[element]) {
      throw new Error("RespawnLocations parse failed")
    }
  });
}
