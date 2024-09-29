import assert from "node:assert";
import dataschema from "../src/dataschema";
import test from "node:test";
const { pack } = dataschema;

test("pack", async (t) => {
  await t.test("SkyChange", (t) => {
    testSkyChangePacket();
  });
  await t.test("RespawnLocations", (t) => {
    testRespawnLocationsPacket();
  });
  await t.test("MissingField", (t) => {
    testMissingField();
  });
  await t.test("ArrayLengthMismatch", (t) => {
    testArrayLengthMismatch();
  });
  await t.test("unknownType", (t) => {
    testUnknownFieldError();
  });
  await t.test("wrongType", (t) => {
    testWrongTypeError();
  });
});

function testSkyChangePacket() {
  const schema = require("./data/skychangeschema.json");

  const obj = require("./data/skychangeobj.json");

  const expected = Buffer.from(require("./data/skychangeresult.json"));

  const result = pack(schema, obj);

  if (result.data.compare(expected) !== 0) {
    throw new Error("SkyChange pack failed");
  }
}

function testRespawnLocationsPacket() {
  const schema = require("./data/RespawnLocationsschema.json");

  const obj = require("./data/RespawnLocationsobj.json");

  const expected = Buffer.from(require("./data/RespawnLocationsresult.json"));

  const result = pack(schema, obj);

  if (result.data.compare(expected) !== 0) {
    throw new Error("RespawnLocations pack failed");
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

  assert.throws(() => {
    pack(schema, obj);
  });
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

  assert.throws(() => {
    pack(schema, obj);
  });
}

function testWrongTypeError() {
  const schema = [
    {
      name: "field",
      type: "array",
    },
  ];

  const obj = {
    field: "i'mnotanarray",
  };

  assert.throws(() => {
    let d = pack(schema, obj);
    console.log(d);
  });
}

function testUnknownFieldError() {
  const schema = [
    {
      name: "unknownField",
      type: "unknownType",
    },
  ];

  const obj = {
    unknownField: "value",
  };

  assert.throws(() => {
    pack(schema, obj);
  });
}
