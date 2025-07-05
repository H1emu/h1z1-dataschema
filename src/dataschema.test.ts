import test from "node:test";
import assert from "node:assert";
import dataschema from "./dataschema";

const roundTrip = (
  schema: any,
  value: any,
  compare: (a: any, b: any) => void = assert.deepStrictEqual,
) => {
  const { data } = dataschema.pack(schema, value);
  const { result } = dataschema.parse(schema, data, 0);
  compare(result, value);
};

test("dataschema round-trip per type", async (t) => {
  await t.test("uint8", () => {
    roundTrip(
      [{ name: "a", type: "uint8" }],
      { a: 42 },
      assert.deepStrictEqual,
    );
  });
  await t.test("int8", () => {
    roundTrip(
      [{ name: "a", type: "int8" }],
      { a: -42 },
      assert.deepStrictEqual,
    );
  });
  await t.test("uint16", () => {
    roundTrip(
      [{ name: "a", type: "uint16" }],
      { a: 4242 },
      assert.deepStrictEqual,
    );
  });
  await t.test("int16", () => {
    roundTrip(
      [{ name: "a", type: "int16" }],
      { a: -4242 },
      assert.deepStrictEqual,
    );
  });
  await t.test("uint32", () => {
    roundTrip(
      [{ name: "a", type: "uint32" }],
      { a: 42424242 },
      assert.deepStrictEqual,
    );
  });
  await t.test("int32", () => {
    roundTrip(
      [{ name: "a", type: "int32" }],
      { a: -42424242 },
      assert.deepStrictEqual,
    );
  });
  await t.test("float", () => {
    roundTrip([{ name: "a", type: "float" }], { a: 3.14 }, (a: any, b: any) =>
      assert.ok(Math.abs(a.a - b.a) < 1e-6),
    );
  });
  await t.test("double", () => {
    roundTrip(
      [{ name: "a", type: "double" }],
      { a: 3.1415926535 },
      (a: any, b: any) => assert.ok(Math.abs(a.a - b.a) < 1e-10),
    );
  });
  await t.test("boolean", () => {
    roundTrip(
      [{ name: "a", type: "boolean" }],
      { a: true },
      assert.deepStrictEqual,
    );
    roundTrip(
      [{ name: "a", type: "boolean" }],
      { a: false },
      assert.deepStrictEqual,
    );
  });
  await t.test("string", () => {
    roundTrip(
      [{ name: "a", type: "string" }],
      { a: "hello" },
      assert.deepStrictEqual,
    );
  });
  await t.test("fixedlengthstring", () => {
    roundTrip(
      [{ name: "a", type: "fixedlengthstring", length: 5 }],
      { a: "abcde" },
      assert.deepStrictEqual,
    );
  });
  await t.test("nullstring", () => {
    roundTrip(
      [{ name: "a", type: "nullstring" }],
      { a: "hi" },
      assert.deepStrictEqual,
    );
  });
  await t.test("bytes", () => {
    roundTrip(
      [{ name: "a", type: "bytes", length: 3 }],
      { a: Buffer.from([1, 2, 3]) },
      (a: any, b: any) => assert.deepStrictEqual(a.a, b.a),
    );
  });
  await t.test("byteswithlength", () => {
    roundTrip(
      [{ name: "a", type: "byteswithlength" }],
      { a: Buffer.from([4, 5, 6, 7]) },
      (a: any, b: any) => assert.deepStrictEqual(a.a, b.a),
    );
  });
  await t.test("rgb", () => {
    roundTrip(
      [{ name: "a", type: "rgb" }],
      { a: { r: 1, g: 2, b: 3 } },
      assert.deepStrictEqual,
    );
  });
  await t.test("rgba", () => {
    roundTrip(
      [{ name: "a", type: "rgba" }],
      { a: { r: 1, g: 2, b: 3, a: 4 } },
      assert.deepStrictEqual,
    );
  });
  await t.test("argb", () => {
    roundTrip(
      [{ name: "a", type: "argb" }],
      { a: { a: 1, r: 2, g: 3, b: 4 } },
      assert.deepStrictEqual,
    );
  });
  await t.test("floatvector2", () => {
    roundTrip(
      [{ name: "a", type: "floatvector2" }],
      { a: [1.1, 2.2] },
      (a: any, b: any) =>
        assert.ok(
          Math.abs(a.a[0] - b.a[0]) < 1e-6 && Math.abs(a.a[1] - b.a[1]) < 1e-6,
        ),
    );
  });
  await t.test("floatvector3", () => {
    roundTrip(
      [{ name: "a", type: "floatvector3" }],
      { a: [1.1, 2.2, 3.3] },
      (a: any, b: any) =>
        assert.ok(
          a.a.every((v: number, i: number) => Math.abs(v - b.a[i]) < 1e-6),
        ),
    );
  });
  await t.test("floatvector4", () => {
    roundTrip(
      [{ name: "a", type: "floatvector4" }],
      { a: [1.1, 2.2, 3.3, 4.4] },
      (a: any, b: any) =>
        assert.ok(
          a.a.every((v: number, i: number) => Math.abs(v - b.a[i]) < 1e-6),
        ),
    );
  });
  await t.test("array", () => {
    roundTrip(
      [{ name: "a", type: "array", elementType: "uint8" }],
      { a: [1, 2, 3] },
      assert.deepStrictEqual,
    );
  });
  await t.test("array8", () => {
    roundTrip(
      [{ name: "a", type: "array8", elementType: "uint8" }],
      { a: [4, 5, 6] },
      assert.deepStrictEqual,
    );
  });
  await t.test("schema (nested)", () => {
    roundTrip(
      [{ name: "a", type: "schema", fields: [{ name: "b", type: "uint8" }] }],
      { a: { b: 7 } },
      assert.deepStrictEqual,
    );
  });
  await t.test("bitflags", () => {
    roundTrip(
      [
        {
          name: "a",
          type: "bitflags",
          flags: [
            { name: "f1", bit: 0 },
            { name: "f2", bit: 1 },
          ],
        },
      ],
      { a: { f1: true, f2: false } },
      assert.deepStrictEqual,
    );
  });
  // await t.test("uint64", () => {
  //   roundTrip(
  //     [{ name: "a", type: "uint64" }],
  //     { a: Number.MAX_SAFE_INTEGER },
  //     assert.deepStrictEqual,
  //   );
  // });
  await t.test("uint64string", () => {
    roundTrip(
      [{ name: "a", type: "uint64string" }],
      { a: "0x1234567891234567" },
      assert.deepStrictEqual,
    );
  });
  await t.test("uint64string lead 0", () => {
    roundTrip(
      [{ name: "a", type: "uint64string" }],
      { a: "0x0003456789123450" },
      assert.deepStrictEqual,
    );
  });
});
