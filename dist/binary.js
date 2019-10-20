'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.addEndian = addEndian;
exports.readRecord = readRecord;
exports.getArrayBuffer = getArrayBuffer;
exports.calculateCRC = calculateCRC;

var _sdk = require('./sdk');

var _messages = require('./messages');

function addEndian(littleEndian, bytes) {
    var result = 0;
    if (!littleEndian) bytes.reverse();
    for (var i = 0; i < bytes.length; i++) {
        result += bytes[i] << (i << 3) >>> 0;
    }
    return result;
}
function readData(blob, fDef, startIndex, options) {
    if (fDef.endianAbility === true) {
        var temp = [];
        for (var i = 0; i < fDef.size; i++) {
            temp.push(blob[startIndex + i]);
        }

        var _ref = new Uint8Array(temp),
            buffer = _ref.buffer;

        var dataView = new DataView(buffer);
        try {
            switch (fDef.type) {
                case 'sint16':
                    return dataView.getInt16(0, fDef.littleEndian);
                case 'uint16':
                case 'uint16z':
                    return dataView.getUint16(0, fDef.littleEndian);
                case 'sint32':
                    return dataView.getInt32(0, fDef.littleEndian);
                case 'uint32':
                case 'uint32z':
                    return dataView.getUint32(0, fDef.littleEndian);
                case 'float32':
                    return dataView.getFloat32(0, fDef.littleEndian);
                case 'float64':
                    return dataView.getFloat64(0, fDef.littleEndian);
                case 'uint16_array':
                    {
                        var array = [];
                        for (var _i = 0; _i < fDef.size; _i += 2) {
                            array.push(dataView.getUint16(_i, fDef.littleEndian));
                        }
                        return array;
                    }
                default:
                    throw Error('No type');
            }
        } catch (e) {
            if (!options.force) {
                throw e;
            }
        }
        return addEndian(fDef.littleEndian, temp);
    }
    if (fDef.type === 'string') {
        var _temp = [];
        for (var _i2 = 0; _i2 < fDef.size; _i2++) {
            if (blob[startIndex + _i2]) {
                _temp.push(blob[startIndex + _i2]);
            }
        }
        return Buffer.from(_temp).toString('utf-8');
    }
    if (fDef.type === 'byte_array') {
        var _temp2 = [];
        for (var _i3 = 0; _i3 < fDef.size; _i3++) {
            _temp2.push(blob[startIndex + _i3]);
        }
        return _temp2;
    }
    return blob[startIndex];
}
function formatByType(data, type, scale, offset) {
    switch (type) {
        case 'date_time':
        case 'local_date_time':
            return new Date(data * 1000 + 631065600000);
        case 'sint32':
            return data * _sdk.FITSDK.scConst;
        case 'sint16':
        case 'uint32':
        case 'uint16':
            return scale ? data / scale + offset : data;
        case 'uint16_array':
            return data.map(function (dataItem) {
                if (scale) {
                    return dataItem / scale + offset;
                }
                return dataItem;
            });
        default:
            {
                if (!_sdk.FITSDK.types[type]) {
                    return data;
                }
                // Quick check for a mask
                var values = [];
                Object.keys(_sdk.FITSDK.types[type]).forEach(function (key, _) {
                    values.push(_sdk.FITSDK.types[type][key]);
                });
                if (values.indexOf('mask') === -1) {
                    return _sdk.FITSDK.types[type][data];
                }
                var dataItem = {};
                Object.keys(_sdk.FITSDK.types[type]).forEach(function (key, _) {
                    var item = _sdk.FITSDK.types[type][key];
                    if (item === 'mask') {
                        dataItem['value'] = data & parseInt(key);
                    } else {
                        dataItem[item] = !!((data & parseInt(key)) >> 7);
                        // Not sure if we need the >> 7 and casting to boolean but from all
                        // the masked props of fields so far this seems to be the case
                    }
                });
                return dataItem;
            }
    }
}
function isInvalidValue(data, type) {
    switch (type) {
        case 'enum':
            return data === 0xFF;
        case 'sint8':
            return data === 0x7F;
        case 'uint8':
            return data === 0xFF;
        case 'sint16':
            return data === 0x7FFF;
        case 'uint16':
            return data === 0xFFFF;
        case 'sint32':
            return data === 0x7FFFFFFF;
        case 'uint32':
            return data === 0xFFFFFFFF;
        case 'string':
            return data === 0x00;
        case 'float32':
            return data === 0xFFFFFFFF;
        case 'float64':
            return data === 0xFFFFFFFFFFFFFFFF;
        case 'uint8z':
            return data === 0x00;
        case 'uint16z':
            return data === 0x0000;
        case 'uint32z':
            return data === 0x000000;
        case 'byte':
            return data === 0xFF;
        case 'sint64':
            return data === 0x7FFFFFFFFFFFFFFF;
        case 'uint64':
            return data === 0xFFFFFFFFFFFFFFFF;
        case 'uint64z':
            return data === 0x0000000000000000;
        default:
            return false;
    }
}
function convertTo(data, unitsList, speedUnit) {
    var unitObj = _sdk.FITSDK.options[unitsList][speedUnit];
    return unitObj ? data * unitObj.multiplier + unitObj.offset : data;
}
function applyOptions(data, field, options) {
    switch (field) {
        case 'speed':
        case 'enhanced_speed':
        case 'vertical_speed':
        case 'avg_speed':
        case 'max_speed':
        case 'speed_1s':
        case 'ball_speed':
        case 'enhanced_avg_speed':
        case 'enhanced_max_speed':
        case 'avg_pos_vertical_speed':
        case 'max_pos_vertical_speed':
        case 'avg_neg_vertical_speed':
        case 'max_neg_vertical_speed':
            return convertTo(data, 'speedUnits', options.speedUnit);
        case 'distance':
        case 'total_distance':
        case 'enhanced_avg_altitude':
        case 'enhanced_min_altitude':
        case 'enhanced_max_altitude':
        case 'enhanced_altitude':
        case 'height':
        case 'odometer':
        case 'avg_stroke_distance':
        case 'min_altitude':
        case 'avg_altitude':
        case 'max_altitude':
        case 'total_ascent':
        case 'total_descent':
        case 'altitude':
        case 'cycle_length':
        case 'auto_wheelsize':
        case 'custom_wheelsize':
        case 'gps_accuracy':
            return convertTo(data, 'lengthUnits', options.lengthUnit);
        case 'temperature':
        case 'avg_temperature':
        case 'max_temperature':
            return convertTo(data, 'temperatureUnits', options.temperatureUnit);
        default:
            return data;
    }
}
function readRecord(blob, messageTypes, developerFields, startIndex, options, startDate, pausedTime) {
    var recordHeader = blob[startIndex];
    var localMessageType = recordHeader & 15;
    if ((recordHeader & 64) === 64) {
        // is definition message
        // startIndex + 1 is reserved
        var hasDeveloperData = (recordHeader & 32) === 32;
        var lEnd = blob[startIndex + 2] === 0;
        var numberOfFields = blob[startIndex + 5];
        var numberOfDeveloperDataFields = hasDeveloperData ? blob[startIndex + 5 + numberOfFields * 3 + 1] : 0;
        var mTypeDef = {
            littleEndian: lEnd,
            globalMessageNumber: addEndian(lEnd, [blob[startIndex + 3], blob[startIndex + 4]]),
            numberOfFields: numberOfFields + numberOfDeveloperDataFields,
            fieldDefs: []
        };
        var _message = (0, _messages.getFitMessage)(mTypeDef.globalMessageNumber);
        for (var i = 0; i < numberOfFields; i++) {
            var fDefIndex = startIndex + 6 + i * 3;
            var baseType = blob[fDefIndex + 2];

            var _message$getAttribute = _message.getAttributes(blob[fDefIndex]),
                field = _message$getAttribute.field,
                type = _message$getAttribute.type;

            var fDef = {
                type: type,
                fDefNo: blob[fDefIndex],
                size: blob[fDefIndex + 1],
                endianAbility: (baseType & 128) === 128,
                littleEndian: lEnd,
                baseTypeNo: baseType & 15,
                name: field,
                dataType: (0, _messages.getFitMessageBaseType)(baseType & 15)
            };
            mTypeDef.fieldDefs.push(fDef);
        }
        for (var _i4 = 0; _i4 < numberOfDeveloperDataFields; _i4++) {
            // If we fail to parse then try catch
            try {
                var _fDefIndex = startIndex + 6 + numberOfFields * 3 + 1 + _i4 * 3;
                var fieldNum = blob[_fDefIndex];
                var size = blob[_fDefIndex + 1];
                var devDataIndex = blob[_fDefIndex + 2];
                var devDef = developerFields[devDataIndex][fieldNum];
                var _baseType = devDef.fit_base_type_id;
                var _fDef = {
                    type: _sdk.FITSDK.types.fit_base_type[_baseType],
                    size: size,
                    fDefNo: fieldNum,
                    endianAbility: (_baseType & 128) === 128,
                    littleEndian: lEnd,
                    baseTypeNo: _baseType & 15,
                    name: devDef.field_name,
                    dataType: (0, _messages.getFitMessageBaseType)(_baseType & 15),
                    scale: devDef.scale || 1,
                    offset: devDef.offset || 0,
                    developerDataIndex: devDataIndex,
                    isDeveloperField: true
                };
                mTypeDef.fieldDefs.push(_fDef);
            } catch (e) {
                if (options.force) {
                    continue;
                }
                throw e;
            }
        }
        messageTypes[localMessageType] = mTypeDef;
        var nextIndex = startIndex + 6 + mTypeDef.numberOfFields * 3;
        var nextIndexWithDeveloperData = nextIndex + 1;
        return {
            messageType: 'definition',
            nextIndex: hasDeveloperData ? nextIndexWithDeveloperData : nextIndex
        };
    }
    var messageType = messageTypes[localMessageType] || messageTypes[0];
    // TODO: handle compressed header ((recordHeader & 128) == 128)
    // uncompressed header
    var messageSize = 0;
    var readDataFromIndex = startIndex + 1;
    var fields = {};
    var message = (0, _messages.getFitMessage)(messageType.globalMessageNumber);
    for (var _i5 = 0; _i5 < messageType.fieldDefs.length; _i5++) {
        var _fDef2 = messageType.fieldDefs[_i5];
        var data = readData(blob, _fDef2, readDataFromIndex, options);
        if (!isInvalidValue(data, _fDef2.type)) {
            if (_fDef2.isDeveloperField) {
                var field = _fDef2.name;
                var type = _fDef2.type,
                    scale = _fDef2.scale,
                    offset = _fDef2.offset;

                fields[_fDef2.name] = applyOptions(formatByType(data, type, scale, offset), field, options);
            } else {
                var _message$getAttribute2 = message.getAttributes(_fDef2.fDefNo),
                    _field = _message$getAttribute2.field,
                    _type = _message$getAttribute2.type,
                    _scale = _message$getAttribute2.scale,
                    _offset = _message$getAttribute2.offset;

                if (_field !== 'unknown' && _field !== '' && _field !== undefined) {
                    fields[_field] = applyOptions(formatByType(data, _type, _scale, _offset), _field, options);
                }
            }
            if (message.name === 'record' && options.elapsedRecordField) {
                fields.elapsed_time = (fields.timestamp - startDate) / 1000;
                fields.timer_time = fields.elapsed_time - pausedTime;
            }
        }
        readDataFromIndex += _fDef2.size;
        messageSize += _fDef2.size;
    }
    if (message.name === 'field_description') {
        developerFields[fields.developer_data_index] = developerFields[fields.developer_data_index] || [];
        developerFields[fields.developer_data_index][fields.field_definition_number] = fields;
    }
    var result = {
        messageType: message.name,
        nextIndex: startIndex + messageSize + 1,
        message: fields
    };
    return result;
}
function getArrayBuffer(buffer) {
    if (buffer instanceof ArrayBuffer) {
        return buffer;
    }
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}
function calculateCRC(blob, start, end) {
    var crcTable = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
    var crc = 0;
    for (var i = start; i < end; i++) {
        var byte = blob[i];
        var tmp = crcTable[crc & 0xF];
        crc = crc >> 4 & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[byte & 0xF];
        tmp = crcTable[crc & 0xF];
        crc = crc >> 4 & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[byte >> 4 & 0xF];
    }
    return crc;
}