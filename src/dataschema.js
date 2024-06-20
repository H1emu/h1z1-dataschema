"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("h1z1-buffer");
function parse(fields, dataToParse, offset) {
    var data = dataToParse;
    var startOffset = offset;
    var result = {};
    fields = fields || [];
    for (var index = 0; index < fields.length; index++) {
        var field = fields[index];
        switch (field.type) {
            case "schema":
                var element = parse(field.fields, data, offset);
                offset += element.length;
                result[field.name] = element.result;
                break;
            case "array":
            case "array8":
                var elements = [];
                var numElements = 0;
                if ("length" in field) {
                    numElements = field.length;
                }
                else {
                    if (field.type == "array") {
                        numElements = data.readUInt32LE(offset);
                        offset += 4;
                    }
                    else if (field.type == "array8") {
                        numElements = data.readUInt8(offset);
                        offset += 1;
                    }
                }
                if (field.fields) {
                    for (var j = 0; j < numElements; j++) {
                        var element_1 = parse(field.fields, data, offset);
                        offset += element_1.length;
                        elements.push(element_1.result);
                    }
                }
                else if (field.elementType) {
                    var elementSchema = [{ name: "element", type: field.elementType }];
                    for (var j = 0; j < numElements; j++) {
                        var element_2 = parse(elementSchema, data, offset);
                        offset += element_2.length;
                        elements.push(element_2.result.element);
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
                var bytes = data.readBytes(offset, field.length);
                result[field.name] = bytes;
                offset += field.length;
                break;
            case "byteswithlength":
                var length_1 = data.readUInt32LE(offset);
                offset += 4;
                if (length_1 > 0) {
                    if (field.fields) {
                        var element_3 = parse(field.fields, data, offset);
                        if (element_3) {
                            result[field.name] = element_3.result;
                        }
                    }
                    else {
                        var bytes_1 = data.readBytes(offset, length_1);
                        result[field.name] = bytes_1;
                    }
                    offset += length_1;
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
            case "uint64": {
                var value_1 = data.readBigInt64LE(offset);
                offset += 8;
                return value_1;
            }
            case "uint64string":
            case "int64string":
                var str = "0x";
                for (var j = 7; j >= 0; j--) {
                    str += ("0" + data.readUInt8(offset + j).toString(16)).substr(-2);
                }
                result[field.name] = str;
                offset += 8;
                break;
            case "variabletype8":
                var vtypeidx = data.readUInt8(offset), vtype = field.types[vtypeidx];
                offset += 1;
                if (vtype) {
                    if (Array.isArray(vtype)) {
                        var variable = parse(vtype, data, offset);
                        offset += variable.length;
                        result[field.name] = {
                            type: vtypeidx,
                            value: variable.result,
                        };
                    }
                    else {
                        var variableSchema = [{ name: "element", type: vtype }];
                        var variable = parse(variableSchema, data, offset);
                        offset += variable.length;
                        result[field.name] = {
                            type: vtypeidx,
                            value: variable.result.element,
                        };
                    }
                }
                break;
            case "bitflags":
                var value = data.readUInt8(offset);
                var flags = {};
                for (var j = 0; j < field.flags.length; j++) {
                    var flag = field.flags[j];
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
            case "string": {
                var string = data.readPrefixedStringLE(offset);
                result[field.name] = string;
                offset += 4 + string.length;
                break;
            }
            case "fixedlengthstring": {
                var string = data.toString("utf8", offset, offset + field.length);
                result[field.name] = string;
                offset += string.length;
                break;
            }
            case "nullstring": {
                var string = data.readNullTerminatedString(offset);
                result[field.name] = string;
                offset += 1 + string.length;
                break;
            }
            case "custom":
                var tmp = field.parser(data, offset);
                result[field.name] = tmp.value;
                offset += tmp.length;
                break;
        }
    }
    return {
        result: result,
        length: offset - startOffset,
    };
}
function getValueFromObject(field, object) {
    // Check for Buffer
    if (Buffer.isBuffer(object)) {
        return object;
    }
    // Check if field exists in object
    if (!object.hasOwnProperty(field.name)) {
        return getDefaultValue(field, object);
    }
    // Field exists, return its value
    return object[field.name];
}
function getDefaultValue(field, object) {
    // Check if field has a defaultValue
    if (field.hasOwnProperty("defaultValue")) {
        return field.defaultValue;
    }
    // Log an error if defaultValue is not available
    console.error("Field ".concat(field.name, " not found in data object: ").concat(JSON.stringify(object, null, 4)));
}
function calculateDataLength(fields, object) {
    fields = fields || [];
    var length = 0;
    for (var index = 0; index < fields.length; index++) {
        var field = fields[index];
        switch (field.type) {
            case "schema":
                var value = getValueFromObject(field, object);
                length += calculateDataLength(field.fields, value);
                break;
            case "array":
            case "array8":
                if (!field.fixedLength) {
                    length += field.type == "array" ? 4 : 1;
                }
                var elements = object[field.name];
                if (field.fields) {
                    if (elements === null || elements === void 0 ? void 0 : elements.length) {
                        for (var j = 0; j < elements.length; j++) {
                            length += calculateDataLength(field.fields, elements[j]);
                        }
                    }
                }
                else if (field.elementType) {
                    var elementSchema = [{ name: "element", type: field.elementType }];
                    for (var j = 0; j < elements.length; j++) {
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
                var value_2 = getValueFromObject(field, object);
                if (value_2) {
                    length += field.fields
                        ? calculateDataLength(field.fields, value_2)
                        : value_2.length;
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
                var value_3 = getValueFromObject(field, object);
                length += 4 + value_3.length;
                break;
            }
            case "fixedlengthstring": {
                var value_4 = getValueFromObject(field, object);
                length += value_4.length;
                break;
            }
            case "nullstring": {
                var value_5 = getValueFromObject(field, object);
                length += 1 + value_5.length;
                break;
            }
            case "variabletype8": {
                var value_6 = getValueFromObject(field, object);
                length += 1;
                var vtype = field.types[value_6.type];
                if (Array.isArray(vtype)) {
                    length += calculateDataLength(vtype, value_6.value);
                }
                else {
                    var variableSchema = [{ name: "element", type: vtype }];
                    length += calculateDataLength(variableSchema, {
                        element: value_6.value,
                    });
                }
                break;
            }
            case "custom": {
                var value_7 = getValueFromObject(field, object);
                var tmp = field.packer(value_7);
                length += tmp.length;
                break;
            }
        }
    }
    return length;
}
function pack(fields, object, dataToPack, offset) {
    var data = dataToPack;
    if (!fields) {
        return {
            data: new Buffer.alloc(0),
            length: 0,
        };
    }
    if (!data) {
        var dataLength = calculateDataLength(fields, object);
        data = new Buffer.allocUnsafe(dataLength);
    }
    offset = offset || 0;
    var startOffset = offset;
    for (var index = 0; index < fields.length; index++) {
        var field = fields[index];
        var value = getValueFromObject(field, object);
        var result = void 0;
        switch (field.type) {
            case "schema":
                offset += pack(field.fields, value, data, offset).length;
                break;
            case "array":
            case "array8":
                if (!field.fixedLength) {
                    if (field.type == "array") {
                        data.writeUInt32LE(value.length, offset);
                        offset += 4;
                    }
                    else {
                        data.writeUInt8(value.length, offset);
                        offset += 1;
                    }
                }
                if (field.fixedLength && field.fixedLength != value.length) {
                    console.error("Array (".concat(field.name, ") length isn't respected ").concat(value.length, "/").concat(field.fixedLength));
                }
                if (field.fields) {
                    for (var j = 0; j < value.length; j++) {
                        result = pack(field.fields, value[j], data, offset);
                        offset += result.length;
                    }
                }
                else if (field.elementType) {
                    var elementSchema = [{ name: "element", type: field.elementType }];
                    for (var j = 0; j < value.length; j++) {
                        result = pack(elementSchema, { element: value[j] }, data, offset);
                        offset += result.length;
                    }
                }
                else {
                    console.error("Invalid array schema");
                }
                break;
            case "bytes":
                if (!Buffer.isBuffer(value)) {
                    value = new Buffer.from(value);
                }
                data.writeBytes(value, offset, field.length);
                offset += field.length;
                break;
            case "byteswithlength":
                if (value) {
                    if (field.fields && !Buffer.isBuffer(value)) {
                        value = pack(field.fields, value, null, null).data;
                    }
                    if (!Buffer.isBuffer(value)) {
                        value = new Buffer.from(value);
                    }
                    data.writeUInt32LE(value.length, offset);
                    offset += 4;
                    data.writeBytes(value, offset);
                    offset += value.length;
                }
                else {
                    data.writeUInt32LE(0, offset);
                    offset += 4;
                }
                break;
            case "uint64":
                data.writeBigUInt64LE(BigInt(value), offset);
                offset += 8;
                break;
            case "uint64string":
            case "int64string":
                for (var j = 0; j < 8; j++) {
                    data.writeUInt8(parseInt(value.substr(2 + (7 - j) * 2, 2), 16), offset + j);
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
                var flagValue = 0;
                for (var j = 0; j < field.flags.length; j++) {
                    var flag = field.flags[j];
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
                var vtype = field.types[value.type];
                if (Array.isArray(vtype)) {
                    result = pack(vtype, value.value, data, offset);
                }
                else {
                    var variableSchema = [{ name: "element", type: vtype }];
                    result = pack(variableSchema, { element: value.value }, data, offset);
                }
                offset += result.length;
                break;
            case "custom":
                var customData = field.packer(value);
                customData.copy(data, offset);
                offset += customData.length;
                break;
        }
    }
    return {
        data: data,
        length: offset - startOffset,
    };
}
var dataschema = {
    pack: pack,
    parse: parse,
    calculateDataLength: calculateDataLength,
};
exports.default = dataschema;
