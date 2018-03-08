// Copyright 2018 Intel Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/*
 * Grove base shield configurations for the sensors supported by this script
 *     +--------------------------------------------+----------+
 *     | Sensor                                     |   Port   |
 *     +--------------------------------------------+----------+
 *     | Grove PIR motion sensor                    |  IO2/D3  |
 *     | Grove button                               |  IO4/D1  |
 *     | Grove buzzer                               |  IO7/D7  |
 *     | Grove mini fan                             |  IO8/D6  |
 *     | Grove Temperature & Humidity sensor        |   I2C    |
 *     +--------------------------------------------+----------+
 */

var gpio   = require('gpio');
var ocf    = require('ocf');
var board  = require('board');
var i2c    = require('i2c');
var server = ocf.server;

// PIR Motion Sensor
if (board.name == 'arduino_101') {
    var PIR = gpio.open({ pin: 2, mode: 'in', edge: 'any'});
} else {
    var PIR = gpio.open({ pin: 3, mode: 'in', edge: 'any'});
}
var resPathMotion = '/a/pir',
    resTypeMotion = 'oic.r.sensor.motion',
    motionResource = null,
    motionProperties = {
        value: (PIR.read() != 0)? true : false
    },
    motionResourceInit = {
        resourcePath : resPathMotion,
        resourceTypes: [ resTypeMotion ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : true,
        properties   : motionProperties
    };

// Button
if (board.name == 'arduino_101') {
    var button = gpio.open({ pin: 4, mode: 'in', edge: 'any' });
} else {
    var button = gpio.open({ pin: 1, mode: 'in', edge: 'any' });
}
var resPathButton = '/a/button',
    resTypeButton = 'oic.r.button',
    buttonResource = null,
    buttonProperties = {
        value: (button.read() != 0)? true : false
    },
    buttonResourceInit = {
        resourcePath : resPathButton,
        resourceTypes: [ resTypeButton ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : true,
        properties   : buttonProperties
    };

// Buzzer
var buzzer = gpio.open({ pin: 7, mode: 'out', activeLow: false }),
    resPathBuzzer = '/a/buzzer',
    resTypeBuzzer = 'oic.r.buzzer',
    buzzerResource = null,
    buzzerProperties = {
        value: (buzzer.read() != 0)? true : false
    },
    buzzerResourceInit = {
        resourcePath : resPathBuzzer,
        resourceTypes: [ resTypeBuzzer ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : true,
        properties   : buzzerProperties
    };

// Mini Fan
if (board.name == 'arduino_101') {
    var fan = gpio.open({ pin: 8, mode: 'out', activeLow: false });
} else {
    var fan = gpio.open({ pin: 6, mode: 'out', activeLow: false });
}
var resPathFan = '/a/fan',
    resTypeFan = 'oic.r.fan',
    fanResource = null,
    fanProperties = {
        value: (fan.read() != 0)? true : false
    },
    fanResourceInit = {
        resourcePath : resPathFan,
        resourceTypes: [ resTypeFan ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : true,
        properties   : fanProperties
    };

// Grove Temperature & Humidity Sensor (High-Accuracy & Mini)
// http://www.hoperf.com/upload/sensor/TH02_V1.1.pdf
var TH02_I2C_ADDR = 0x40,       // TH02 I2C device address
    TH02_STATUS = 0,            // TH02 register addresses
    TH02_DATAh  = 1,
    TH02_DATAl  = 2,
    TH02_CONFIG = 3,
    TH02_ID     = 17,
    TH02_STATUS_RDY   = 0x01,   // Bit fields of TH02 registers
    TH02_CONFIG_START = 0x01,
    TH02_CONFIG_HEAT  = 0x02,
    TH02_CONFIG_TEMP  = 0x10,
    TH02_CONFIG_HUMI  = 0x00,
    TH02_CONFIG_FAST  = 0x20,
    TH02_ID_VAL       = 0x50;

var i2cBus = i2c.open({ bus: 0, speed: 100 });

var resPathTemperature = '/a/temperature',
    resTypeTemperature = 'oic.r.temperature',
    temperatureResource = null,
    temperatureProperties = {
        temperature: 25.0,
        units: 'C'
    },
    temperatureResourceInit = {
        resourcePath : resPathTemperature,
        resourceTypes: [ resTypeTemperature ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties   : temperatureProperties
    };

var resPathHumidity = '/a/humidity',
    resTypeHumidity = 'oic.r.humidity',
    humidityResource = null,
    humidityProperties = {
        humidity: 80
    },
    humidityResourceInit = {
        resourcePath : resPathHumidity,
        resourceTypes: [ resTypeHumidity ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties   : humidityProperties
    };

function writeRegister(reg, value) {
    i2cBus.write(TH02_I2C_ADDR, new Buffer([ reg, value ]));
}

function readRegister(reg) {
    return i2cBus.burstRead(TH02_I2C_ADDR, 1, reg);
}

function getId() {
    return readRegister(TH02_ID).readUInt8();
}

function getStatus() {
    return readRegister(TH02_STATUS).readUInt8();
}

function getConfig() {
    return readRegister(TH02_CONFIG).readUInt8();
}

function setConfig(config) {
    writeRegister(TH02_CONFIG, config);
}

function readTemperature(cb) {
    if ((getId() == TH02_ID_VAL) && !(getConfig() & TH02_CONFIG_START)) {
        setConfig(TH02_CONFIG_START | TH02_CONFIG_TEMP);
        var tid = setInterval(function() {
            if (!(getConfig() & TH02_CONFIG_START) && (getStatus() & TH02_STATUS_RDY)) {
                var data = i2cBus.burstRead(TH02_I2C_ADDR, 2, TH02_DATAh).readUInt16BE();
                data = (data >> 2) / 32 - 50;
                if (cb != null) cb(data);
                clearInterval(tid);
            }
        }, 50);
    }
}

function readHumidity(cb) {
    if ((getId() == TH02_ID_VAL) && !(getConfig() & TH02_CONFIG_START)) {
        setConfig(TH02_CONFIG_START);
        var tid = setInterval(function() {
            if (!(getConfig() & TH02_CONFIG_START) && (getStatus() & TH02_STATUS_RDY)) {
                var data = i2cBus.burstRead(TH02_I2C_ADDR, 2, TH02_DATAh).readUInt16BE();
                data = (data >> 4) / 16 - 24;
                if (cb != null) cb(data);
                clearInterval(tid);
            }
        }, 50);
    }
}

console.log('Starting Multiple OCF servers...');

// Event Handlers
PIR.onchange = function(event) {
    var state = (PIR.read() != 0)? true : false;
    console.log('motion: ' + state);
    motionProperties.value = state;
};

button.onchange = function(event) {
    var state = event.value? true : false;
    console.log('button: ' + state);
    buttonProperties.value = state;
};

function getMotionOcRepresentation(request) {
    request.respond(motionProperties);
}

function getButtonOcRepresentation(request) {
    request.respond(buttonProperties);
}

function getBuzzerOcRepresentation(request) {
    request.respond(buzzerProperties);
}

function setBuzzerOcRepresentation(request) {
    if (request.data.properties) {
        var state = request.data.properties.value? true : false;
        console.log('Set buzzer ' + (state? 'On' : 'Off'));
        buzzer.write((buzzerProperties.value = state)? 1 : 0);
    }
    request.respond(buzzerProperties);
}

function getFanOcRepresentation(request) {
    request.respond(fanProperties);
}

function setFanOcRepresentation(request) {
    if (request.data.properties) {
        var state = request.data.properties.value? true : false;
        console.log('Fan ' + (state? 'On' : 'Off'));
        fan.write((fanProperties.value = state)? 1 : 0);
    }
    request.respond(fanProperties);
}

function getTemperatureOcRepresentation(request) {
    request.respond(temperatureProperties);
}

function getHumidityOcRepresentation(request) {
    request.respond(humidityProperties);
}

// Resource Registration
server.register(motionResourceInit).then(function(resource) {
    console.log("Motion sensor registered");
    motionResource = resource;
}).catch(function(error) {
    console.log('Motion sensor registration failure: ' + error.name);
});

server.register(buttonResourceInit).then(function(resource) {
    console.log("Button registered");
    buttonResource = resource;
}).catch(function(error) {
    console.log('Button registration failure: ' + error.name);
});

server.register(buzzerResourceInit).then(function(resource) {
    console.log("Buzzer registered");
    buzzerResource = resource;
}).catch(function(error) {
    console.log('Buzzer registration failure: ' + error.name);
});

server.register(fanResourceInit).then(function(resource) {
    console.log("Fan registered");
    fanResource = resource;
}).catch(function(error) {
    console.log('Fan registration failure: ' + error.name);
});

server.register(temperatureResourceInit).then(function(resource) {
    console.log("Temperature sensor registered");
    temperatureResource = resource;
}).catch(function(error) {
    console.log('Temperature registration failure: ' + error.name);
});

server.register(humidityResourceInit).then(function(resource) {
    console.log("Humidity sensor registered");
    humidityResource = resource;
}).catch(function(error) {
    console.log('Humidity registration failure: ' + error.name);
});

// Register Listeners
server.on('retrieve', function(request, observe) {
    if (request.target.resourcePath == resPathMotion) {
        getMotionOcRepresentation(request);
    } else if (request.target.resourcePath == resPathButton) {
        getButtonOcRepresentation(request);
    } else if (request.target.resourcePath == resPathBuzzer) {
        getBuzzerOcRepresentation(request);
    } else if (request.target.resourcePath == resPathFan) {
        getFanOcRepresentation(request);
    } else if (request.target.resourcePath == resPathTemperature) {
        getTemperatureOcRepresentation(request);
    } else if (request.target.resourcePath == resPathHumidity) {
        getHumidityOcRepresentation(request);
    }
});

server.on('update', function(request) {
    if (request.target.resourcePath == resPathBuzzer) {
        setBuzzerOcRepresentation(request);
    } else if (request.target.resourcePath == resPathFan) {
        setFanOcRepresentation(request);
    }
});

// Periodically sense temperature & humidity
setInterval(function() {
    readTemperature(function(temperature) {
        console.log('temperature: ' + temperature);
        temperatureProperties.temperature = temperature;
    });
    setTimeout(readHumidity, 1000, function(humidity) {
        console.log('humidity: ' + humidity);
        humidityProperties.humidity = humidity;
    });
}, 4000);

/* Start the OCF stack */
ocf.start();
