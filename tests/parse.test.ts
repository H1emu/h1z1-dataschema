import dataschema from "../dataschema";
const { parse } = dataschema;

export function testParse() {
   // testSkyChangePacket();
    //testRespawnLocationsPacket();
}

function testSkyChangePacket() {
    const schema = require("./data/skychangeschema.json");

    const expected = require("./data/skychangeobj.json");

    const data =  Buffer.from(require("./data/skychangeresult.json"));

    const result = parse(schema,data,0);

    if(JSON.stringify(result.result) !== JSON.stringify(expected)){
        throw new Error("SkyChange parse failed")
    }
}

function testRespawnLocationsPacket() {
    const schema = require("./data/RespawnLocationsschema.json");

    const expected = require("./data/RespawnLocationsobj.json");

    const data =  Buffer.from(require("./data/RespawnLocationsresult.json"));

    const result = parse(schema,data,0);

    console.log(JSON.stringify(result.result))

    if(JSON.stringify(result.result) !== JSON.stringify(expected)){
        throw new Error("RespawnLocations parse failed")
    }
}