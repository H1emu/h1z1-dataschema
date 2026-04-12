import { SmartBuffer } from "smart-buffer";

function _parse(fields: any[], sb: SmartBuffer): any {
  const result: any = {};
  fields = fields || [];
  for (let index = 0; index < fields.length; index++) {
    const field: any = fields[index];
    switch (field.type) {
      case "schema":
        result[field.name] = _parse(field.fields, sb);
        break;
      case "array":
      case "array8": {
        const elements = [];
        let numElements = 0;
        if ("length" in field) {
          numElements = field.length;
        } else {
          if (field.type == "array") {
            numElements = sb.readUInt32LE();
          } else {
            numElements = sb.readUInt8();
          }
        }
        if (field.fields) {
          for (let j = 0; j < numElements; j++) {
            elements.push(_parse(field.fields, sb));
          }
        } else if (field.elementType) {
          const elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < numElements; j++) {
            elements.push(_parse(elementSchema, sb).element);
          }
        }
        result[field.name] = elements;
        break;
      }
      case "debug":
        console.error("[debug-parse]" + field.name);
        break;
      case "debugoffset":
        result[field.name] = sb.readOffset;
        break;
      case "debugbytes": {
        const saved = sb.readOffset;
        result[field.name] = sb.readBuffer(field.length);
        sb.readOffset = saved;
        break;
      }
      case "bytes":
        result[field.name] = sb.readBuffer(field.length);
        break;
      case "byteswithlength": {
        const length = sb.readUInt32LE();
        if (length > 0) {
          if (field.fields) {
            const savedOffset = sb.readOffset;
            result[field.name] = _parse(field.fields, sb);
            sb.readOffset = savedOffset + length;
          } else {
            result[field.name] = sb.readBuffer(length);
          }
        }
        break;
      }
      case "uint32":
        result[field.name] = sb.readUInt32LE();
        break;
      case "int32":
        result[field.name] = sb.readInt32LE();
        break;
      case "uint16":
        result[field.name] = sb.readUInt16LE();
        break;
      case "int16":
        result[field.name] = sb.readInt16LE();
        break;
      case "uint8":
        result[field.name] = sb.readUInt8();
        break;
      case "int8":
        result[field.name] = sb.readInt8();
        break;
      case "rgb":
        result[field.name] = {
          r: sb.readInt8(),
          g: sb.readInt8(),
          b: sb.readInt8(),
        };
        break;
      case "rgba":
        result[field.name] = {
          r: sb.readInt8(),
          g: sb.readInt8(),
          b: sb.readInt8(),
          a: sb.readInt8(),
        };
        break;
      case "argb":
        result[field.name] = {
          a: sb.readInt8(),
          r: sb.readInt8(),
          g: sb.readInt8(),
          b: sb.readInt8(),
        };
        break;
      case "int64":
      case "uint64":
        return sb.readBigInt64LE();
      case "uint64string":
      case "int64string": {
        const buf = sb.readBuffer(8);
        let str = "0x";
        for (let j = 7; j >= 0; j--) {
          str += ("0" + buf[j].toString(16)).substr(-2);
        }
        result[field.name] = str;
        break;
      }
      case "variabletype8": {
        const vtypeidx = sb.readUInt8();
        const vtype = field.types[vtypeidx];
        if (vtype) {
          if (Array.isArray(vtype)) {
            result[field.name] = { type: vtypeidx, value: _parse(vtype, sb) };
          } else {
            const variableSchema = [{ name: "element", type: vtype }];
            result[field.name] = {
              type: vtypeidx,
              value: _parse(variableSchema, sb).element,
            };
          }
        }
        break;
      }
      case "bitflags": {
        const value = sb.readUInt8();
        const flags: any = {};
        for (let j = 0; j < field.flags.length; j++) {
          const flag = field.flags[j];
          flags[flag.name] = !!(value & (1 << flag.bit));
        }
        result[field.name] = flags;
        break;
      }
      case "float":
        result[field.name] = sb.readFloatLE();
        break;
      case "double":
        result[field.name] = sb.readDoubleLE();
        break;
      case "floatvector2":
        result[field.name] = [sb.readFloatLE(), sb.readFloatLE()];
        break;
      case "floatvector3":
        result[field.name] = [
          sb.readFloatLE(),
          sb.readFloatLE(),
          sb.readFloatLE(),
        ];
        break;
      case "floatvector4":
        result[field.name] = [
          sb.readFloatLE(),
          sb.readFloatLE(),
          sb.readFloatLE(),
          sb.readFloatLE(),
        ];
        break;
      case "boolean":
        result[field.name] = !!sb.readUInt8();
        break;
      case "string": {
        const len = sb.readUInt32LE();
        result[field.name] = sb.readString(len, "utf8");
        break;
      }
      case "fixedlengthstring":
        result[field.name] = sb.readString(field.length, "utf8");
        break;
      case "nullstring":
        result[field.name] = sb.readStringNT("utf8");
        break;
      case "custom": {
        const tmp = field.parser(sb.internalBuffer, sb.readOffset);
        result[field.name] = tmp.value;
        sb.readOffset += tmp.length;
        break;
      }
    }
  }
  return result;
}

function parse(fields: any, dataToParse: Buffer, offset: number): any {
  const sb = SmartBuffer.fromBuffer(dataToParse);
  sb.readOffset = offset;
  const result = _parse(fields || [], sb);
  return { result, length: sb.readOffset - offset };
}

function getValueFromObject(field: any, object: any) {
  if (Buffer.isBuffer(object)) {
    return object;
  }
  if (!object.hasOwnProperty(field.name)) {
    return getDefaultValue(field, object);
  }
  return object[field.name];
}

function getDefaultValue(field: any, object: any) {
  if (field.hasOwnProperty("defaultValue")) {
    return field.defaultValue;
  }
  throw `Field ${field.name} not found in data object: ${JSON.stringify(
    object,
    null,
    4,
  )}`;
}

function calculateDataLength(fields: any[], object: any): number {
  fields = fields || [];
  let length = 0;
  for (let index = 0; index < fields.length; index++) {
    const field: any = fields[index];
    switch (field.type) {
      case "schema":
        const value = getValueFromObject(field, object);
        length += calculateDataLength(field.fields, value);
        break;
      case "array":
      case "array8":
        if (!field.fixedLength) {
          length += field.type == "array" ? 4 : 1;
        }
        const elements = object[field.name];
        if (field.fields) {
          if (elements?.length) {
            for (let j = 0; j < elements.length; j++) {
              length += calculateDataLength(field.fields, elements[j]);
            }
          }
        } else if (field.elementType) {
          const elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < elements.length; j++) {
            length += calculateDataLength(elementSchema, {
              element: elements[j],
            });
          }
        }
        break;
      case "bytes":
        length += field.length;
        break;
      case "byteswithlength": {
        length += 4;
        const value = getValueFromObject(field, object);
        if (value) {
          length += field.fields
            ? calculateDataLength(field.fields, value)
            : value.length;
        }
        break;
      }
      case "int64":
      case "uint64":
      case "uint64string":
      case "int64string":
      case "double":
        length += 8;
        break;
      case "rgb":
        length += 3;
        break;
      case "uint32":
      case "int32":
      case "float":
      case "rgba":
      case "argb":
        length += 4;
        break;
      case "floatvector2":
        length += 8;
        break;
      case "floatvector3":
        length += 12;
        break;
      case "floatvector4":
        length += 16;
        break;
      case "uint16":
      case "int16":
        length += 2;
        break;
      case "uint8":
      case "int8":
      case "boolean":
      case "bitflags":
        length += 1;
        break;
      case "string": {
        const value = getValueFromObject(field, object);
        length += 4 + value.length;
        break;
      }
      case "fixedlengthstring": {
        const value = getValueFromObject(field, object);
        length += value.length;
        break;
      }
      case "nullstring": {
        const value = getValueFromObject(field, object);
        length += 1 + value.length;
        break;
      }
      case "variabletype8": {
        const value = getValueFromObject(field, object);
        length += 1;
        const vtype = field.types[value.type];
        if (Array.isArray(vtype)) {
          length += calculateDataLength(vtype, value.value);
        } else {
          const variableSchema = [{ name: "element", type: vtype }];
          length += calculateDataLength(variableSchema, {
            element: value.value,
          });
        }
        break;
      }
      case "debug": {
        console.error("[debug-calculateDataLength]" + field.name);
        break;
      }
      case "custom": {
        const value = getValueFromObject(field, object);
        const tmp = field.packer(value);
        length += tmp.length;
        break;
      }
    }
  }
  return length;
}

function _pack(fields: any[], object: any, sb: SmartBuffer): void {
  fields = fields || [];
  for (let index = 0; index < fields.length; index++) {
    const field: any = fields[index];
    let value = getValueFromObject(field, object);
    switch (field.type) {
      case "schema":
        _pack(field.fields, value, sb);
        break;
      case "array":
      case "array8":
        if (!field.fixedLength) {
          if (field.type == "array") {
            sb.writeUInt32LE(value.length);
          } else {
            sb.writeUInt8(value.length);
          }
        }
        if (field.fixedLength && field.fixedLength != value.length) {
          throw `Array (${field.name}) length isn't respected ${value.length}/${field.fixedLength}`;
        }
        if (field.fields) {
          for (let j = 0; j < value.length; j++) {
            _pack(field.fields, value[j], sb);
          }
        } else if (field.elementType) {
          const elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < value.length; j++) {
            _pack(elementSchema, { element: value[j] }, sb);
          }
        } else {
          throw "Invalid array schema";
        }
        break;
      case "bytes":
        if (!Buffer.isBuffer(value)) value = Buffer.from(value);
        sb.writeBuffer(value.slice(0, field.length));
        break;
      case "byteswithlength":
        if (value) {
          if (field.fields && !Buffer.isBuffer(value)) {
            const subSb = new SmartBuffer();
            _pack(field.fields, value, subSb);
            value = subSb.toBuffer();
          }
          if (!Buffer.isBuffer(value)) value = Buffer.from(value);
          sb.writeUInt32LE(value.length);
          sb.writeBuffer(value);
        } else {
          sb.writeUInt32LE(0);
        }
        break;
      case "uint64":
        sb.writeBigUInt64LE(BigInt(value));
        break;
      case "uint64string":
      case "int64string":
        for (let j = 0; j < 8; j++) {
          sb.writeUInt8(parseInt(value.substr(2 + (7 - j) * 2, 2), 16));
        }
        break;
      case "uint32":
        sb.writeUInt32LE(value);
        break;
      case "int32":
        sb.writeInt32LE(value);
        break;
      case "uint16":
        sb.writeUInt16LE(value);
        break;
      case "int16":
        sb.writeInt16LE(value);
        break;
      case "uint8":
        sb.writeUInt8(value);
        break;
      case "int8":
        sb.writeInt8(value);
        break;
      case "rgb":
        sb.writeInt8(value.r);
        sb.writeInt8(value.g);
        sb.writeInt8(value.b);
        break;
      case "rgba":
        sb.writeInt8(value.r);
        sb.writeInt8(value.g);
        sb.writeInt8(value.b);
        sb.writeInt8(value.a);
        break;
      case "argb":
        sb.writeInt8(value.a);
        sb.writeInt8(value.r);
        sb.writeInt8(value.g);
        sb.writeInt8(value.b);
        break;
      case "bitflags": {
        let flagValue = 0;
        for (let j = 0; j < field.flags.length; j++) {
          const flag = field.flags[j];
          if (value[flag.name]) flagValue = flagValue | (1 << flag.bit);
        }
        sb.writeUInt8(flagValue);
        break;
      }
      case "float":
        sb.writeFloatLE(value);
        break;
      case "double":
        sb.writeDoubleLE(value);
        break;
      case "floatvector2":
        sb.writeFloatLE(value[0]);
        sb.writeFloatLE(value[1]);
        break;
      case "floatvector3":
        sb.writeFloatLE(value[0]);
        sb.writeFloatLE(value[1]);
        sb.writeFloatLE(value[2]);
        break;
      case "floatvector4":
        sb.writeFloatLE(value[0]);
        sb.writeFloatLE(value[1]);
        sb.writeFloatLE(value[2]);
        sb.writeFloatLE(value[3]);
        break;
      case "boolean":
        sb.writeUInt8(value ? 1 : 0);
        break;
      case "string":
        sb.writeUInt32LE(value.length);
        sb.writeString(value, "utf8");
        break;
      case "fixedlengthstring":
        sb.writeString(value, "utf8");
        break;
      case "nullstring":
        sb.writeStringNT(value, "utf8");
        break;
      case "variabletype8": {
        sb.writeUInt8(value.type);
        const vtype = field.types[value.type];
        if (Array.isArray(vtype)) {
          _pack(vtype, value.value, sb);
        } else {
          _pack(
            [{ name: "element", type: vtype }],
            { element: value.value },
            sb,
          );
        }
        break;
      }
      case "custom": {
        const customData: Buffer = field.packer(value);
        sb.writeBuffer(customData);
        break;
      }
      case "debug":
        console.error("[debug-pack]" + field.name);
        break;
      default:
        throw `Unknown field type: ${field.type}`;
    }
  }
}

function pack(
  fields: any,
  object: any,
  dataToPack?: Buffer,
  offset?: number,
): { data: Buffer; length: number } {
  if (!fields) {
    return { data: Buffer.alloc(0), length: 0 };
  }

  if (dataToPack) {
    const sb = SmartBuffer.fromBuffer(dataToPack);
    sb.writeOffset = offset ?? 0;
    const startOffset = sb.writeOffset;
    _pack(fields, object, sb);
    return { data: dataToPack, length: sb.writeOffset - startOffset };
  }

  const sb = new SmartBuffer();
  _pack(fields, object, sb);
  return { data: sb.toBuffer(), length: sb.length };
}

interface CompiledSchema {
  parse: (dataToParse: Buffer, offset: number) => { result: any; length: number };
  pack: (object: any, dataToPack?: Buffer, offset?: number) => { data: Buffer; length: number };
  calculateDataLength: (object: any) => number;
}

const compileCache = new WeakMap<object, CompiledSchema>();
const compileCacheByString = new Map<string, CompiledSchema>();

function emitGetValue(field: any, objVar: string, valVar: string, closures: any[]): string {
  const name = JSON.stringify(field.name);
  if ("defaultValue" in field) {
    const defIdx = closures.push(field.defaultValue) - 1;
    return `const ${valVar}=Object.prototype.hasOwnProperty.call(${objVar},${name})?${objVar}[${name}]:closures[${defIdx}];\n`;
  }
  return `if(!Object.prototype.hasOwnProperty.call(${objVar},${name}))throw\`Field ${field.name} not found in data object: \${JSON.stringify(${objVar},null,4)}\`;\nconst ${valVar}=${objVar}[${name}];\n`;
}

function generateCalcCode(fields: any[], objVar: string, closures: any[], depth: number): string {
  let code = "";
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const name = JSON.stringify(field.name);
    switch (field.type) {
      case "uint8": case "int8": case "boolean": case "bitflags": code += "length+=1;\n"; break;
      case "uint16": case "int16": code += "length+=2;\n"; break;
      case "uint32": case "int32": case "float": case "rgba": case "argb": code += "length+=4;\n"; break;
      case "rgb": code += "length+=3;\n"; break;
      case "double": case "int64": case "uint64": case "uint64string": case "int64string": case "floatvector2": code += "length+=8;\n"; break;
      case "floatvector3": code += "length+=12;\n"; break;
      case "floatvector4": code += "length+=16;\n"; break;
      case "bytes": code += `length+=${field.length};\n`; break;
      case "string": { const vv = `v_${depth}_${i}`; code += `{${emitGetValue(field, objVar, vv, closures)}length+=4+${vv}.length;}\n`; break; }
      case "fixedlengthstring": { const vv = `v_${depth}_${i}`; code += `{${emitGetValue(field, objVar, vv, closures)}length+=${vv}.length;}\n`; break; }
      case "nullstring": { const vv = `v_${depth}_${i}`; code += `{${emitGetValue(field, objVar, vv, closures)}length+=1+${vv}.length;}\n`; break; }
      case "byteswithlength": {
        const vv = `v_${depth}_${i}`;
        code += `{length+=4;${emitGetValue(field, objVar, vv, closures)}if(${vv}){`;
        if (field.fields) {
          const calcIdx = closures.push(calculateDataLength) - 1;
          const fIdx = closures.push(field.fields) - 1;
          code += `length+=closures[${calcIdx}](closures[${fIdx}],${vv});`;
        } else {
          code += `length+=${vv}.length;`;
        }
        code += `}}\n`;
        break;
      }
      case "schema": {
        const vv = `v_${depth}_${i}`;
        code += `{${emitGetValue(field, objVar, vv, closures)}${generateCalcCode(field.fields, vv, closures, depth + 1)}}\n`;
        break;
      }
      case "array": case "array8": {
        if (!field.fixedLength) code += `length+=${field.type === "array" ? 4 : 1};\n`;
        const elemsVar = `elems_${depth}_${i}`;
        const jVar = `j_${depth}_${i}`;
        code += `{const ${elemsVar}=${objVar}[${name}];`;
        if (field.fields) {
          code += `for(let ${jVar}=0;${jVar}<${elemsVar}.length;${jVar}++){${generateCalcCode(field.fields, `${elemsVar}[${jVar}]`, closures, depth + 1)}}`;
        } else if (field.elementType) {
          const elemObj = `eobj_${depth}_${i}`;
          code += `for(let ${jVar}=0;${jVar}<${elemsVar}.length;${jVar}++){const ${elemObj}={element:${elemsVar}[${jVar}]};${generateCalcCode([{ name: "element", type: field.elementType }], elemObj, closures, depth + 1)}}`;
        }
        code += `}\n`;
        break;
      }
      case "variabletype8": {
        const vv = `v_${depth}_${i}`;
        const typesIdx = closures.push(field.types) - 1;
        const calcIdx = closures.push(calculateDataLength) - 1;
        const vtypeVar = `vtype_${depth}_${i}`;
        code += `{${emitGetValue(field, objVar, vv, closures)}length+=1;const ${vtypeVar}=closures[${typesIdx}][${vv}.type];if(Array.isArray(${vtypeVar})){length+=closures[${calcIdx}](${vtypeVar},${vv}.value);}else{length+=closures[${calcIdx}]([{name:"element",type:${vtypeVar}}],{element:${vv}.value});}}\n`;
        break;
      }
      case "custom": {
        const vv = `v_${depth}_${i}`;
        const fieldIdx = closures.push(field) - 1;
        code += `{${emitGetValue(field, objVar, vv, closures)}length+=closures[${fieldIdx}].packer(${vv}).length;}\n`;
        break;
      }
      case "debug": code += `console.error("[debug-calculateDataLength]"+${name});\n`; break;
    }
  }
  return code;
}

function generateParseCode(fields: any[], resultVar: string, sbVar: string, closures: any[], depth: number): string {
  let code = `let ${resultVar}={};\n`;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const name = JSON.stringify(field.name);
    switch (field.type) {
      case "uint32": code += `${resultVar}[${name}]=${sbVar}.readUInt32LE();\n`; break;
      case "int32": code += `${resultVar}[${name}]=${sbVar}.readInt32LE();\n`; break;
      case "uint16": code += `${resultVar}[${name}]=${sbVar}.readUInt16LE();\n`; break;
      case "int16": code += `${resultVar}[${name}]=${sbVar}.readInt16LE();\n`; break;
      case "uint8": code += `${resultVar}[${name}]=${sbVar}.readUInt8();\n`; break;
      case "int8": code += `${resultVar}[${name}]=${sbVar}.readInt8();\n`; break;
      case "float": code += `${resultVar}[${name}]=${sbVar}.readFloatLE();\n`; break;
      case "double": code += `${resultVar}[${name}]=${sbVar}.readDoubleLE();\n`; break;
      case "boolean": code += `${resultVar}[${name}]=!!${sbVar}.readUInt8();\n`; break;
      case "int64": case "uint64": code += `${resultVar}[${name}]=${sbVar}.readBigInt64LE();\n`; break;
      case "rgb": code += `${resultVar}[${name}]={r:${sbVar}.readInt8(),g:${sbVar}.readInt8(),b:${sbVar}.readInt8()};\n`; break;
      case "rgba": code += `${resultVar}[${name}]={r:${sbVar}.readInt8(),g:${sbVar}.readInt8(),b:${sbVar}.readInt8(),a:${sbVar}.readInt8()};\n`; break;
      case "argb": code += `${resultVar}[${name}]={a:${sbVar}.readInt8(),r:${sbVar}.readInt8(),g:${sbVar}.readInt8(),b:${sbVar}.readInt8()};\n`; break;
      case "floatvector2": code += `${resultVar}[${name}]=[${sbVar}.readFloatLE(),${sbVar}.readFloatLE()];\n`; break;
      case "floatvector3": code += `${resultVar}[${name}]=[${sbVar}.readFloatLE(),${sbVar}.readFloatLE(),${sbVar}.readFloatLE()];\n`; break;
      case "floatvector4": code += `${resultVar}[${name}]=[${sbVar}.readFloatLE(),${sbVar}.readFloatLE(),${sbVar}.readFloatLE(),${sbVar}.readFloatLE()];\n`; break;
      case "string": {
        const lenVar = `slen_${depth}_${i}`;
        code += `{const ${lenVar}=${sbVar}.readUInt32LE();${resultVar}[${name}]=${sbVar}.readString(${lenVar},"utf8");}\n`;
        break;
      }
      case "fixedlengthstring": code += `${resultVar}[${name}]=${sbVar}.readString(${field.length},"utf8");\n`; break;
      case "nullstring": code += `${resultVar}[${name}]=${sbVar}.readStringNT("utf8");\n`; break;
      case "bytes": code += `${resultVar}[${name}]=${sbVar}.readBuffer(${field.length});\n`; break;
      case "uint64string": case "int64string": {
        const bufVar = `buf_${depth}_${i}`;
        const strVar = `str_${depth}_${i}`;
        code += `{const ${bufVar}=${sbVar}.readBuffer(8);let ${strVar}="0x";for(let _j=7;_j>=0;_j--){${strVar}+=("0"+${bufVar}[_j].toString(16)).substr(-2);}${resultVar}[${name}]=${strVar};}\n`;
        break;
      }
      case "bitflags": {
        const flagsIdx = closures.push(field.flags) - 1;
        const valVar = `bfval_${depth}_${i}`;
        const flagsObj = `flags_${depth}_${i}`;
        code += `{const ${valVar}=${sbVar}.readUInt8();const ${flagsObj}={};for(let _j=0;_j<closures[${flagsIdx}].length;_j++){const _f=closures[${flagsIdx}][_j];${flagsObj}[_f.name]=!!(${valVar}&(1<<_f.bit));}${resultVar}[${name}]=${flagsObj};}\n`;
        break;
      }
      case "schema": {
        const subRes = `res_${depth}_${i}`;
        code += `{${generateParseCode(field.fields, subRes, sbVar, closures, depth + 1)}${resultVar}[${name}]=${subRes};}\n`;
        break;
      }
      case "array": case "array8": {
        const numVar = `num_${depth}_${i}`;
        const elemsVar = `elems_${depth}_${i}`;
        const jVar = `j_${depth}_${i}`;
        code += `{`;
        if ("length" in field) {
          code += `const ${numVar}=${field.length};`;
        } else {
          code += `const ${numVar}=${sbVar}.${field.type === "array" ? "readUInt32LE" : "readUInt8"}();`;
        }
        code += `const ${elemsVar}=[];`;
        if (field.fields) {
          const elemRes = `eres_${depth}_${i}`;
          code += `for(let ${jVar}=0;${jVar}<${numVar};${jVar}++){${generateParseCode(field.fields, elemRes, sbVar, closures, depth + 1)}${elemsVar}.push(${elemRes});}`;
        } else if (field.elementType) {
          const elemRes = `eres_${depth}_${i}`;
          code += `for(let ${jVar}=0;${jVar}<${numVar};${jVar}++){${generateParseCode([{ name: "element", type: field.elementType }], elemRes, sbVar, closures, depth + 1)}${elemsVar}.push(${elemRes}.element);}`;
        }
        code += `${resultVar}[${name}]=${elemsVar};}\n`;
        break;
      }
      case "byteswithlength": {
        const lenVar = `bwllen_${depth}_${i}`;
        code += `{const ${lenVar}=${sbVar}.readUInt32LE();if(${lenVar}>0){`;
        if (field.fields) {
          const savedVar = `savedOff_${depth}_${i}`;
          const subRes = `bwlres_${depth}_${i}`;
          code += `const ${savedVar}=${sbVar}.readOffset;${generateParseCode(field.fields, subRes, sbVar, closures, depth + 1)}${resultVar}[${name}]=${subRes};${sbVar}.readOffset=${savedVar}+${lenVar};`;
        } else {
          code += `${resultVar}[${name}]=${sbVar}.readBuffer(${lenVar});`;
        }
        code += `}}\n`;
        break;
      }
      case "variabletype8": {
        const tagVar = `vtag_${depth}_${i}`;
        const vtypeVar = `vtype_${depth}_${i}`;
        const typesIdx = closures.push(field.types) - 1;
        const parseHelperIdx = closures.push(_parse) - 1;
        code += `{const ${tagVar}=${sbVar}.readUInt8();const ${vtypeVar}=closures[${typesIdx}][${tagVar}];if(${vtypeVar}){if(Array.isArray(${vtypeVar})){${resultVar}[${name}]={type:${tagVar},value:closures[${parseHelperIdx}](${vtypeVar},${sbVar})};}else{${resultVar}[${name}]={type:${tagVar},value:closures[${parseHelperIdx}]([{name:"element",type:${vtypeVar}}],${sbVar}).element};}}}\n`;
        break;
      }
      case "debug": code += `console.error("[debug-parse]"+${name});\n`; break;
      case "debugoffset": code += `${resultVar}[${name}]=${sbVar}.readOffset;\n`; break;
      case "debugbytes": {
        const savedVar = `dbgSaved_${depth}_${i}`;
        code += `{const ${savedVar}=${sbVar}.readOffset;${resultVar}[${name}]=${sbVar}.readBuffer(${field.length});${sbVar}.readOffset=${savedVar};}\n`;
        break;
      }
      case "custom": {
        const fieldIdx = closures.push(field) - 1;
        const tmpVar = `ctmp_${depth}_${i}`;
        code += `{const ${tmpVar}=closures[${fieldIdx}].parser(${sbVar}.internalBuffer,${sbVar}.readOffset);${resultVar}[${name}]=${tmpVar}.value;${sbVar}.readOffset+=${tmpVar}.length;}\n`;
        break;
      }
    }
  }
  return code;
}

function generatePackCode(fields: any[], objVar: string, sbVar: string, closures: any[], depth: number): string {
  let code = "";
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const name = JSON.stringify(field.name);
    const vv = `v_${depth}_${i}`;
    switch (field.type) {
      case "schema": {
        code += `{${emitGetValue(field, objVar, vv, closures)}${generatePackCode(field.fields, vv, sbVar, closures, depth + 1)}}\n`;
        break;
      }
      case "array": case "array8": {
        code += `{${emitGetValue(field, objVar, vv, closures)}`;
        if (!field.fixedLength) {
          code += `${sbVar}.${field.type === "array" ? "writeUInt32LE" : "writeUInt8"}(${vv}.length);`;
        }
        if (field.fixedLength) {
          code += `if(${field.fixedLength}!==${vv}.length)throw\`Array (${field.name}) length isn't respected \${${vv}.length}/${field.fixedLength}\`;`;
        }
        const jVar = `j_${depth}_${i}`;
        if (field.fields) {
          code += `for(let ${jVar}=0;${jVar}<${vv}.length;${jVar}++){${generatePackCode(field.fields, `${vv}[${jVar}]`, sbVar, closures, depth + 1)}}`;
        } else if (field.elementType) {
          const elemObj = `eobj_${depth}_${i}`;
          code += `for(let ${jVar}=0;${jVar}<${vv}.length;${jVar}++){const ${elemObj}={element:${vv}[${jVar}]};${generatePackCode([{ name: "element", type: field.elementType }], elemObj, sbVar, closures, depth + 1)}}`;
        } else {
          code += `throw "Invalid array schema";`;
        }
        code += `}\n`;
        break;
      }
      case "bytes": {
        code += `{${emitGetValue(field, objVar, vv, closures)}const ${vv}_b=Buffer.isBuffer(${vv})?${vv}:Buffer.from(${vv});${sbVar}.writeBuffer(${vv}_b.slice(0,${field.length}));}\n`;
        break;
      }
      case "byteswithlength": {
        code += `{${emitGetValue(field, objVar, vv, closures)}if(${vv}){`;
        if (field.fields) {
          const subSbVar = `subSb_${depth}_${i}`;
          code += `let ${vv}_bwl;if(!Buffer.isBuffer(${vv})){const ${subSbVar}=new SmartBuffer();${generatePackCode(field.fields, vv, subSbVar, closures, depth + 1)}${vv}_bwl=${subSbVar}.toBuffer();}else{${vv}_bwl=${vv};}`;
          code += `if(!Buffer.isBuffer(${vv}_bwl))${vv}_bwl=Buffer.from(${vv}_bwl);${sbVar}.writeUInt32LE(${vv}_bwl.length);${sbVar}.writeBuffer(${vv}_bwl);`;
        } else {
          code += `const ${vv}_bwl=Buffer.isBuffer(${vv})?${vv}:Buffer.from(${vv});${sbVar}.writeUInt32LE(${vv}_bwl.length);${sbVar}.writeBuffer(${vv}_bwl);`;
        }
        code += `}else{${sbVar}.writeUInt32LE(0);}}\n`;
        break;
      }
      case "uint64": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeBigUInt64LE(BigInt(${vv}));}\n`; break; }
      case "uint64string": case "int64string": { code += `{${emitGetValue(field, objVar, vv, closures)}for(let _j=0;_j<8;_j++){${sbVar}.writeUInt8(parseInt(${vv}.substr(2+(7-_j)*2,2),16));}}\n`; break; }
      case "uint32": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt32LE(${vv});}\n`; break; }
      case "int32": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt32LE(${vv});}\n`; break; }
      case "uint16": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt16LE(${vv});}\n`; break; }
      case "int16": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt16LE(${vv});}\n`; break; }
      case "uint8": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt8(${vv});}\n`; break; }
      case "int8": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt8(${vv});}\n`; break; }
      case "rgb": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt8(${vv}.r);${sbVar}.writeInt8(${vv}.g);${sbVar}.writeInt8(${vv}.b);}\n`; break; }
      case "rgba": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt8(${vv}.r);${sbVar}.writeInt8(${vv}.g);${sbVar}.writeInt8(${vv}.b);${sbVar}.writeInt8(${vv}.a);}\n`; break; }
      case "argb": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeInt8(${vv}.a);${sbVar}.writeInt8(${vv}.r);${sbVar}.writeInt8(${vv}.g);${sbVar}.writeInt8(${vv}.b);}\n`; break; }
      case "bitflags": {
        const flagsIdx = closures.push(field.flags) - 1;
        code += `{${emitGetValue(field, objVar, vv, closures)}let _bfv=0;for(let _j=0;_j<closures[${flagsIdx}].length;_j++){const _f=closures[${flagsIdx}][_j];if(${vv}[_f.name])_bfv=_bfv|(1<<_f.bit);}${sbVar}.writeUInt8(_bfv);}\n`;
        break;
      }
      case "float": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeFloatLE(${vv});}\n`; break; }
      case "double": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeDoubleLE(${vv});}\n`; break; }
      case "floatvector2": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeFloatLE(${vv}[0]);${sbVar}.writeFloatLE(${vv}[1]);}\n`; break; }
      case "floatvector3": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeFloatLE(${vv}[0]);${sbVar}.writeFloatLE(${vv}[1]);${sbVar}.writeFloatLE(${vv}[2]);}\n`; break; }
      case "floatvector4": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeFloatLE(${vv}[0]);${sbVar}.writeFloatLE(${vv}[1]);${sbVar}.writeFloatLE(${vv}[2]);${sbVar}.writeFloatLE(${vv}[3]);}\n`; break; }
      case "boolean": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt8(${vv}?1:0);}\n`; break; }
      case "string": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt32LE(${vv}.length);${sbVar}.writeString(${vv},"utf8");}\n`; break; }
      case "fixedlengthstring": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeString(${vv},"utf8");}\n`; break; }
      case "nullstring": { code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeStringNT(${vv},"utf8");}\n`; break; }
      case "variabletype8": {
        const typesIdx = closures.push(field.types) - 1;
        const packHelperIdx = closures.push(_pack) - 1;
        const vtypeVar = `vtype_${depth}_${i}`;
        code += `{${emitGetValue(field, objVar, vv, closures)}${sbVar}.writeUInt8(${vv}.type);const ${vtypeVar}=closures[${typesIdx}][${vv}.type];if(Array.isArray(${vtypeVar})){closures[${packHelperIdx}](${vtypeVar},${vv}.value,${sbVar});}else{closures[${packHelperIdx}]([{name:"element",type:${vtypeVar}}],{element:${vv}.value},${sbVar});}}\n`;
        break;
      }
      case "custom": {
        const fieldIdx = closures.push(field) - 1;
        code += `{${emitGetValue(field, objVar, vv, closures)}const _cd=closures[${fieldIdx}].packer(${vv});${sbVar}.writeBuffer(_cd);}\n`;
        break;
      }
      case "debug": code += `console.error("[debug-pack]"+${name});\n`; break;
      default: code += `throw\`Unknown field type: ${field.type}\`;\n`; break;
    }
  }
  return code;
}

function generateCompiledSchema(fields: any[]): CompiledSchema {
  const parseClos: any[] = [];
  const packClos: any[] = [];
  const calcClos: any[] = [];

  const parseBody = generateParseCode(fields, "result", "sb", parseClos, 0);
  const packBody = generatePackCode(fields, "object", "sb", packClos, 0);
  const calcBody = generateCalcCode(fields, "object", calcClos, 0);

  const parseFactoryBody = `"use strict";return function compiledParse(dataToParse,offset){const sb=SmartBuffer.fromBuffer(dataToParse);sb.readOffset=offset;${parseBody}return{result,length:sb.readOffset-offset};};`;
  const packFactoryBody = `"use strict";return function compiledPack(object,dataToPack,offset){let sb,startOffset;if(dataToPack){sb=SmartBuffer.fromBuffer(dataToPack);sb.writeOffset=offset!==undefined?offset:0;startOffset=sb.writeOffset;}else{sb=new SmartBuffer();startOffset=0;}${packBody}return{data:dataToPack!=null?dataToPack:sb.toBuffer(),length:sb.writeOffset-startOffset};};`;
  const calcFactoryBody = `"use strict";return function compiledCalc(object){let length=0;${calcBody}return length;};`;

  const parseFactory = new Function("SmartBuffer", "Buffer", "closures", parseFactoryBody);
  const packFactory = new Function("SmartBuffer", "Buffer", "closures", packFactoryBody);
  const calcFactory = new Function("SmartBuffer", "Buffer", "closures", calcFactoryBody);

  return {
    parse: parseFactory(SmartBuffer, Buffer, parseClos) as CompiledSchema["parse"],
    pack: packFactory(SmartBuffer, Buffer, packClos) as CompiledSchema["pack"],
    calculateDataLength: calcFactory(SmartBuffer, Buffer, calcClos) as CompiledSchema["calculateDataLength"],
  };
}

function compile(fields: any[]): CompiledSchema {
  if (fields && typeof fields === "object") {
    const cached = compileCache.get(fields);
    if (cached) return cached;
    const compiled = generateCompiledSchema(fields);
    compileCache.set(fields, compiled);
    return compiled;
  }
  const key = JSON.stringify(fields);
  const cached = compileCacheByString.get(key);
  if (cached) return cached;
  const compiled = generateCompiledSchema(fields ?? []);
  compileCacheByString.set(key, compiled);
  return compiled;
}

const dataschema = {
  pack: pack,
  parse: parse,
  calculateDataLength: calculateDataLength,
  compile: compile,
};
export default dataschema;
