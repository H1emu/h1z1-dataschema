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
  await t.test("MissingField", (t) => {
    testMissingField();
  })
  await t.test("ArrayLengthMismatch", (t) => {
    testArrayLengthMismatch();
  })
  await t.test("OtherErrors", (t) => {
    testOtherErrors();
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

function testMissingField() {
  const schema = [
    {
      name: "field1",
      type: "uint32",
    },
  ];

  const obj = {};

  try {
    pack(schema, obj);
  } catch (error:any) {
    if (!error.message.includes("Field field1 not found in data object")) {
      throw new Error("MissingField test failed");
    }
  }
}

function testArrayLengthMismatch() {
  const schema = [
    {
      name: "arrayField",
      type: "array",
      fixedLength: 2,
      fields: [
        {
          name: "element",
          type: "uint32",
        },
      ],
    },
  ];

  const obj = {
    arrayField: [1],
  };

  try {
    pack(schema, obj);
  } catch (error:any) {
    if (!error.message.includes("Array (arrayField) length isn't respected")) {
      throw new Error("ArrayLengthMismatch test failed");
    }
  }
}

function testOtherErrors() {
  const schema = [
    {
      name: "unknownField",
      type: "unknownType",
    },
  ];

  const obj = {
    unknownField: "value",
  };

  try {
    pack(schema, obj);
  } catch (error:any) {
    if (!error.message.includes("Unknown field type: unknownType")) {
      throw new Error("OtherErrors test failed");
    }
  }
}
