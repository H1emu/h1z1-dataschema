import Benchmark from 'benchmark';
import dataschema from "./src/dataschema"

var suite = new Benchmark.Suite;

const schema = require("./tests/data/skychangeschema.json");
const data = Buffer.from(require("./tests/data/skychangeresult.json"));
const obj = require("./tests/data/skychangeobj.json");
const compiled = dataschema.compile(schema);

suite
  .add('parse', function() {
    dataschema.parse(schema, data, 0);
  })
  .add('parse (compiled)', function() {
    compiled.parse(data, 0);
  })
  .add('calculate', function() {
    dataschema.calculateDataLength(schema, obj);
  })
  .add('calculate (compiled)', function() {
    compiled.calculateDataLength(obj);
  })
  .add('pack', function() {
    dataschema.pack(schema, obj);
  })
  .add('pack (compiled)', function() {
    compiled.pack(obj);
  })
  .on('cycle', function(event: any) {
    console.log(String(event.target));
  })
  .run({ 'async': false });
