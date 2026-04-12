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

const dataschema = {
  pack: pack,
  parse: parse,
  calculateDataLength: calculateDataLength,
};
export default dataschema;
