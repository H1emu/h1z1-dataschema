import assert from "node:assert";
import dataschema from "../src/dataschema";
import test from "node:test";
const { compile, parse, pack } = dataschema;

test("compile", async (t) => {
  await t.test("SkyChange parse matches interpreted", () => {
    const schema = require("./data/skychangeschema.json");
    const data = Buffer.from(require("./data/skychangeresult.json"));
    const compiled = compile(schema);
    const r1 = parse(schema, data, 0);
    const r2 = compiled.parse(data, 0);
    assert.deepStrictEqual(r2.result, r1.result);
    assert.strictEqual(r2.length, r1.length);
  });

  await t.test("SkyChange pack matches interpreted", () => {
    const schema = require("./data/skychangeschema.json");
    const obj = require("./data/skychangeobj.json");
    const compiled = compile(schema);
    const r1 = pack(schema, obj);
    const r2 = compiled.pack(obj);
    assert.strictEqual(r2.data.compare(r1.data), 0);
    assert.strictEqual(r2.length, r1.length);
  });

  await t.test("RespawnLocations parse matches interpreted", () => {
    const schema = require("./data/RespawnLocationsschema.json");
    const data = Buffer.from(require("./data/RespawnLocationsresult.json"));
    const compiled = compile(schema);
    const r1 = parse(schema, data, 0);
    const r2 = compiled.parse(data, 0);
    assert.deepStrictEqual(r2.result, r1.result);
    assert.strictEqual(r2.length, r1.length);
  });

  await t.test("RespawnLocations pack matches interpreted", () => {
    const schema = require("./data/RespawnLocationsschema.json");
    const obj = require("./data/RespawnLocationsobj.json");
    const compiled = compile(schema);
    const r1 = pack(schema, obj);
    const r2 = compiled.pack(obj);
    assert.strictEqual(r2.data.compare(r1.data), 0);
    assert.strictEqual(r2.length, r1.length);
  });

  await t.test("calculateDataLength matches interpreted", () => {
    const schema = require("./data/skychangeschema.json");
    const obj = require("./data/skychangeobj.json");
    const compiled = compile(schema);
    const expected = dataschema.calculateDataLength(schema, obj);
    assert.strictEqual(compiled.calculateDataLength(obj), expected);
  });

  await t.test("compile caches by reference", () => {
    const schema = require("./data/skychangeschema.json");
    const c1 = compile(schema);
    const c2 = compile(schema);
    assert.strictEqual(c1, c2);
  });

  await t.test("compiled pack throws on missing field", () => {
    const schema = [{ name: "field1", type: "uint32" }];
    const compiled = compile(schema);
    assert.throws(() => compiled.pack({}));
  });
});
