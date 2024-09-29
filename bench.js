"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchmark_1 = __importDefault(require("benchmark"));
const dataschema_1 = __importDefault(require("./src/dataschema"));
var suite = new benchmark_1.default.Suite;
const schema = require("./tests/data/skychangeschema.json");
const data = Buffer.from(require("./tests/data/skychangeresult.json"));
const obj = require("./tests/data/skychangeobj.json");
// add tests
suite.add('parse', function () {
    dataschema_1.default.parse(schema, data, 0);
})
    .add('calculate', function () {
    dataschema_1.default.calculateDataLength(schema, obj);
})
    .add('pack', function () {
    dataschema_1.default.pack(schema, obj);
})
    // add listeners
    .on('cycle', function (event) {
    console.log(String(event.target));
})
    // run async
    .run({ 'async': false });
