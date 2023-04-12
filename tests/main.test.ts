import { testPack } from "./pack.test";

import { testParse } from "./parse.test";

console.time("pack")
testPack();
console.timeEnd("pack")
console.time("parse")
testParse();
console.timeEnd("parse")

console.log("tests done")
