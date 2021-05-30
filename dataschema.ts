import "h1z1-buffer";

function parse(
  fields: any,
  data: any,
  offset: number,
  referenceData?: any
): any {
  const startOffset = offset;
  const result: any = {}
  let numElements: number,
    elements,
    element,
    elementSchema,
    bytes,
    string,
    length,
    value,
    flags:any,
    flag;

  fields = fields || [];
  fields.forEach((field:any) => {
    if (field.name in result) {
      console.warn(
        "DataSchema::parse(): Duplicate field name in schema: " + field.name
      );
    }
    switch (field.type) {
      case "schema":
        element = parse(field.fields, data, offset, referenceData);
        offset += element.length;
        result[field.name] = element.result;
        break;
      case "array":
      case "array8":
        elements = [];
        if ("length" in field) {
          numElements = field.length;
        } else {
          if (field.type == "array") {
            numElements = data.readUInt32LE(offset);
            offset += 4;
          } else if (field.type == "array8") {
            numElements = data.readUInt8(offset);
            offset += 1;
          }
        }
        if ("debuglength" in field) {
          numElements = field.debuglength;
        }
        if (field.fields) {
          for (let j = 0; j < numElements; j++) {
            element = parse(field.fields, data, offset, referenceData);
            offset += element.length;
            elements.push(element.result);
          }
        } else if (field.elementType) {
          elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < numElements; j++) {
            element = parse(elementSchema, data, offset, referenceData);
            offset += element.length;
            elements.push(element.result.element);
          }
        }
        result[field.name] = elements;
        break;
      case "debugoffset":
        result[field.name] = offset;
        break;
      case "debugbytes":
        result[field.name] = data.readBytes(offset, field.length);
        break;
      case "bytes":
        bytes = data.readBytes(offset, field.length);
        if (bytes.length > 20) {
          bytes.toJSON = function () {
            return "[" + this.length + " " + "bytes]";
          };
        }
        result[field.name] = bytes;
        offset += field.length;
        break;
      case "byteswithlength":
        length = data.readUInt32LE(offset);
        offset += 4;
        if (length > 0) {
          if (field.fields) {
            element = parse(field.fields, data, offset, referenceData);
            if (element) {
              result[field.name] = element.result;
            }
          } else {
            bytes = data.readBytes(offset, length);
            result[field.name] = bytes;
          }
          offset += length;
        }
        break;
      case "uint32":
        result[field.name] = data.readUInt32LE(offset);
        offset += 4;
        break;
      case "int32":
        result[field.name] = data.readInt32LE(offset);
        offset += 4;
        break;
      case "uint16":
        result[field.name] = data.readUInt16LE(offset);
        offset += 2;
        break;
      case "int16":
        result[field.name] = data.readInt16LE(offset);
        offset += 2;
        break;
      case "uint8":
        result[field.name] = data.readUInt8(offset);
        offset += 1;
        break;
      case "int8":
        result[field.name] = data.readInt8(offset);
        offset += 1;
        break;
      case "rgb":
        result[field.name] = {
          r: data.readInt8(offset),
          g: data.readInt8(offset + 1),
          b: data.readInt8(offset + 2),
        };
        offset += 3;
        break;
      case "rgba":
        result[field.name] = {
          r: data.readInt8(offset),
          g: data.readInt8(offset + 1),
          b: data.readInt8(offset + 2),
          a: data.readInt8(offset + 3),
        };
        offset += 4;
        break;
      case "argb":
        result[field.name] = {
          a: data.readInt8(offset),
          r: data.readInt8(offset + 1),
          g: data.readInt8(offset + 2),
          b: data.readInt8(offset + 3),
        };
        offset += 4;
        break;
      case "int64":
      case "uint64":
        let str = "0x";
        for (let j = 7; j >= 0; j--) {
          str += ("0" + data.readUInt8(offset + j).toString(16)).substr(-2);
        }
        result[field.name] = str;
        offset += 8;
        break;
      case "variabletype8":
        const vtypeidx = data.readUInt8(offset),
          vtype = field.types[vtypeidx];
        offset += 1;
        if (vtype) {
          if (Array.isArray(vtype)) {
            const variable = parse(vtype, data, offset, referenceData);
            offset += variable.length;
            result[field.name] = {
              type: vtypeidx,
              value: variable.result,
            };
          } else {
            const variableSchema = [{ name: "element", type: vtype }];
            const variable: any = parse(
              variableSchema,
              data,
              offset,
              referenceData
            );
            offset += variable.length;
            result[field.name] = {
              type: vtypeidx,
              value: variable.result.element,
            };
          }
        }
        break;
      case "bitflags":
        value = data.readUInt8(offset);
        flags = {};
        for (let j = 0; j < field.flags.length; j++) {
          flag = field.flags[j];
          flags[flag.name] = !!(value & (1 << flag.bit));
        }
        result[field.name] = flags;
        offset += 1;
        break;
      case "float":
        result[field.name] = data.readFloatLE(offset);
        offset += 4;
        break;
      case "double":
        result[field.name] = data.readDoubleLE(offset);
        offset += 8;
        break;
      case "floatvector2":
        result[field.name] = [
          data.readFloatLE(offset),
          data.readFloatLE(offset + 4),
        ];
        offset += 8;
        break;
      case "floatvector3":
        result[field.name] = [
          data.readFloatLE(offset),
          data.readFloatLE(offset + 4),
          data.readFloatLE(offset + 8),
        ];
        offset += 12;
        break;
      case "floatvector4":
        result[field.name] = [
          data.readFloatLE(offset),
          data.readFloatLE(offset + 4),
          data.readFloatLE(offset + 8),
          data.readFloatLE(offset + 12),
        ];
        offset += 16;
        break;
      case "boolean":
        result[field.name] = !!data.readUInt8(offset);
        offset += 1;
        break;
      case "string":
        string = data.readPrefixedStringLE(offset);
        result[field.name] = string;
        offset += 4 + string.length;
        break;
      case "fixedlengthstring":
        string = data.toString("utf8", offset, offset + field.length);
        result[field.name] = string;
        offset += string.length;
        break;
      case "nullstring":
        string = data.readNullTerminatedString(offset);
        result[field.name] = string;
        offset += 1 + string.length;
        break;
      case "custom":
        const tmp = field.parser(data, offset, referenceData);
        result[field.name] = tmp.value;
        offset += tmp.length;
        break;
    }
  });
  return {
    result: result,
    length: offset - startOffset,
  };
}

function calculateDataLength(
  fields: any[],
  object: any,
  referenceData?: any
): number {
  let length = 0,
    value:any,
    elements;
  fields = fields || [];
  fields.forEach((field) => {
    if (!(field.name in object)) {
      if ("defaultValue" in field) {
        value = field.defaultValue;
      } else {
        console.error(
          "Field " +
            field.name +
            " not found in data object: " +
            JSON.stringify(object, null, 4)
        );
      }
    } else {
      value = object[field.name];
    }
    switch (field.type) {
      case "schema":
        length += calculateDataLength(field.fields, value, referenceData);
        break;
      case "array":
      case "array8":
        if (!field.fixedLength) {
          length += field.type == "array" ? 4 : 1;
        }
        elements = object[field.name];
        if (field.fields) {
          if (elements?.length) {
            for (let j = 0; j < elements.length; j++) {
              length += calculateDataLength(
                field.fields,
                elements[j],
                referenceData
              );
            }
          }
        } else if (field.elementType) {
          const elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < elements.length; j++) {
            length += calculateDataLength(
              elementSchema,
              { element: elements[j] },
              referenceData
            );
          }
        }
        break;
      case "bytes":
        length += field.length;
        break;
      case "byteswithlength":
        length += 4;
        if (value) {
          length += field.fields
            ? calculateDataLength(field.fields, value, referenceData)
            : value.length;
        }
        break;
      case "int64":
      case "uint64":
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
      case "string":
        length += 4 + value.length;
        break;
      case "fixedlengthstring":
        length += value.length;
        break;
      case "nullstring":
        length += 1 + value.length;
        break;
      case "variabletype8":
        length += 1;
        const vtype = field.types[value.type];
        if (Array.isArray(vtype)) {
          length += calculateDataLength(vtype, value.value, referenceData);
        } else {
          const variableSchema = [{ name: "element", type: vtype }];
          length += calculateDataLength(
            variableSchema,
            { element: value.value },
            referenceData
          );
        }
        break;
      case "custom":
        const tmp = field.packer(value, referenceData);
        length += tmp.length;
        break;
    }
  });
  return length;
}

function pack(
  fields:any,
  object:any,
  data?:any,
  offset?:any,
  referenceData?:any
): { data: Buffer; length: number } {
  let dataLength, value :any, result, elementSchema, flag, flagValue;

  if (!fields) {
    return {
      data: new (Buffer.alloc as any)(0),
      length: 0,
    };
  }

  if (!data) {
    dataLength = calculateDataLength(fields, object, referenceData);
    data = new (Buffer.alloc as any)(dataLength);
  }
  offset = offset || 0;
  const startOffset = offset

  fields.forEach((field:any) => {
    if (!(field.name in object)) {
      if ("defaultValue" in field) {
        value = field.defaultValue;
      } else {
        console.error(
          "Field " +
            field.name +
            " not found in data object and no default value"
        );
      }
    } else {
      value = object[field.name];
    }
    switch (field.type) {
      case "schema":
        offset += pack(field.fields, value, data, offset, referenceData).length;
        break;
      case "array":
      case "array8":
        if (!field.fixedLength) {
          if (field.type == "array") {
            data.writeUInt32LE(value.length, offset);
            offset += 4;
          } else {
            data.writeUInt8(value.length, offset);
            offset += 1;
          }
        }
        if (field.fixedLength && field.fixedLength != value.length) {
          console.error(
            `Array (${field.name}) length isn't respected ${value.length}/${field.fixedLength}`
          );
        }
        if (field.fields) {
          for (let j = 0; j < value.length; j++) {
            result = pack(field.fields, value[j], data, offset, referenceData);
            offset += result.length;
          }
        } else if (field.elementType) {
          elementSchema = [{ name: "element", type: field.elementType }];
          for (let j = 0; j < value.length; j++) {
            result = pack(
              elementSchema,
              { element: value[j] },
              data,
              offset,
              referenceData
            );
            offset += result.length;
          }
        } else {
          console.error("Invalid array schema");
        }
        break;
      case "bytes":
        if (!Buffer.isBuffer(value)) {
          value = new (Buffer.from as any)(value);
        }
        data.writeBytes(value, offset, field.length);
        offset += field.length;
        break;
      case "byteswithlength":
        if (value) {
          if (field.fields) {
            value = pack(field.fields, value, null, null, referenceData).data;
          }
          if (!Buffer.isBuffer(value)) {
            value = new (Buffer.from as any)(value);
          }
          data.writeUInt32LE(value.length, offset);
          offset += 4;
          data.writeBytes(value, offset);
          offset += value.length;
        } else {
          data.writeUInt32LE(0, offset);
          offset += 4;
        }
        break;
      case "uint64":
        for (let j = 0; j < 8; j++) {
          data.writeUInt8(
            parseInt(value.substr(2 + (7 - j) * 2, 2), 16),
            offset + j
          );
        }
        offset += 8;
        break;
      case "uint32":
        data.writeUInt32LE(value, offset);
        offset += 4;
        break;
      case "int32":
        data.writeInt32LE(value, offset);
        offset += 4;
        break;
      case "uint16":
        data.writeUInt16LE(value, offset);
        offset += 2;
        break;
      case "int16":
        data.writeInt16LE(value, offset);
        offset += 2;
        break;
      case "uint8":
        data.writeUInt8(value, offset);
        offset += 1;
        break;
      case "int8":
        data.writeInt8(value, offset);
        offset += 1;
        break;
      case "rgb":
        data.writeInt8(value.r, offset);
        data.writeInt8(value.g, offset + 1);
        data.writeInt8(value.b, offset + 2);
        offset += 3;
        break;
      case "rgba":
        data.writeInt8(value.r, offset);
        data.writeInt8(value.g, offset + 1);
        data.writeInt8(value.b, offset + 2);
        data.writeInt8(value.a, offset + 3);
        offset += 4;
        break;
      case "argb":
        data.writeInt8(value.a, offset);
        data.writeInt8(value.r, offset + 1);
        data.writeInt8(value.g, offset + 2);
        data.writeInt8(value.b, offset + 3);
        offset += 4;
        break;
      case "bitflags":
        flagValue = 0;
        for (let j = 0; j < field.flags.length; j++) {
          flag = field.flags[j];
          if (value[flag.name]) {
            flagValue = flagValue | (1 << flag.bit);
          }
        }
        data.writeUInt8(flagValue, offset);
        offset += 1;
        break;
      case "float":
        data.writeFloatLE(value, offset);
        offset += 4;
        break;
      case "double":
        data.writeDoubleLE(value, offset);
        offset += 8;
        break;
      case "floatvector2":
        data.writeFloatLE(value[0], offset);
        data.writeFloatLE(value[1], offset + 4);
        offset += 8;
        break;
      case "floatvector3":
        data.writeFloatLE(value[0], offset);
        data.writeFloatLE(value[1], offset + 4);
        data.writeFloatLE(value[2], offset + 8);
        offset += 12;
        break;
      case "floatvector4":
        data.writeFloatLE(value[0], offset);
        data.writeFloatLE(value[1], offset + 4);
        data.writeFloatLE(value[2], offset + 8);
        data.writeFloatLE(value[3], offset + 12);
        offset += 16;
        break;
      case "boolean":
        data.writeUInt8(value ? 1 : 0, offset);
        offset += 1;
        break;
      case "string":
        data.writePrefixedStringLE(value, offset);
        offset += 4 + value.length;
        break;
      case "fixedlengthstring":
        data.write(value, offset, value.length, "utf8");
        offset += value.length;
        break;
      case "nullstring":
        data.writeNullTerminatedString(value, offset);
        offset += 1 + value.length;
        break;
      case "variabletype8":
        data.writeUInt8(value.type, offset);
        offset++;
        const vtype = field.types[value.type];
        if (Array.isArray(vtype)) {
          result = pack(vtype, value.value, data, offset, referenceData);
        } else {
          const variableSchema = [{ name: "element", type: vtype }];
          result = pack(
            variableSchema,
            { element: value.value },
            data,
            offset,
            referenceData
          );
        }
        offset += result.length;
        break;
      case "custom":
        const customData = field.packer(value, referenceData);
        customData.copy(data, offset);
        offset += customData.length;
        break;
    }
  });
  return {
    data: data,
    length: offset - startOffset,
  };
}

const dataschema = {
  pack: pack,
  parse: parse,
  calculateDataLength: calculateDataLength,
};
export default dataschema;
