/// <reference types="node" />
import "h1z1-buffer";
export interface h1z1Buffer extends Buffer {
    writeBytes(value: any, offset: number, length?: any): any;
    writePrefixedStringLE(value: any, offset: number): any;
    writeUInt64String(value: any, offset: number): any;
    writeInt64String(value: any, offset: number): any;
    writeNullTerminatedString(value: any, offset: number): any;
    readBytes(offset: number, length: any): any;
    readPrefixedStringLE(offset: number): any;
    readUInt64String(offset: number): any;
    readInt64String(offset: number): any;
    readNullTerminatedString(offset: number): any;
}
declare function parse(fields: any, dataToParse: Buffer, offset: number): any;
declare function calculateDataLength(fields: any[], object: any): number;
declare function pack(fields: any, object: any, dataToPack?: any, offset?: any): {
    data: Buffer;
    length: number;
};
declare const dataschema: {
    pack: typeof pack;
    parse: typeof parse;
    calculateDataLength: typeof calculateDataLength;
};
export default dataschema;
