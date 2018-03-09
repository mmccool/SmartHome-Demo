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
 * Base shield configurations for the sensors supported by this script
 *     +-----------------------------------+
 *     | Sensor                     | Port |
 *     +----------------------------+------+
 *     | Onboard LED2               |  --- |
 *     | Onchip BMI160 temperature  |  --- |
 *     | Light sensor               |  A0  |
 *     | Actuator control board     |  IO3 |
 *     +----------------------------+------+
 */
var gpio   = require('gpio');
var ocf    = require('ocf');
var pwm    = require('pwm');
var server = ocf.server;

var updateTemperatureFrequency = 1;  /* desire frequency in Hz */

// Onboard LED
var led = gpio.open({ pin: 'LED2', mode: 'out', activeLow: false }),
    resPathLed = '/a/led',
    resTypeLed = 'oic.r.switch.binary',
    ledResource = null,
    ledProperties = {
        value: (led.read() != 0)? true : false
    },
    ledResourceInit = {
        resourcePath : resPathLed,
        resourceTypes: [ resTypeLed ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties   : ledProperties
    };

// BMI160 Temperature Sensor
var temperatureSensor = new TemperatureSensor({
        controller: 'bmi160',
        frequency : updateTemperatureFrequency
    }),
    resPathTemperature = '/a/temperature',
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

// Light sensor
var lightSensor = new AmbientLightSensor({
        pin: 'A0'
    }),
    resPathIlluminance = '/a/illuminance',
    resTypeIlluminance = 'oic.r.sensor.illuminance',
    illuminanceResource = null,
    illuminanceProperties = {
        illuminance: 450.0
    },
    illuminanceResourceInit = {
        resourcePath : resPathIlluminance,
        resourceTypes: [ resTypeIlluminance ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : true,
        properties   : illuminanceProperties
    };

// Solar panel driven by Actuonix linear actuator control board
// http://www.robotshop.com/media/files/pdf2/actuonix_lac_datasheet.pdf
var actuatorPwmPeriodInMsec = 20,
    actuatorPin = pwm.open({ pin: 'IO3' }),
    resPathSolar = '/a/solar',
    resTypeSolar = 'oic.r.solar',
    solarResource = null,
    solarProperties = {
        tiltPercentage: 0,
        simulationMode: false
    },
    solarResourceInit = {
        resourcePath : resPathSolar,
        resourceTypes: [ resTypeSolar ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties   : solarProperties
    },
    simulationTiltStep,
    timerSolarSimulation = null;

console.log('Starting Multiple OCF servers...');

// Event Handlers
temperatureSensor.onreading = function() {
    var temperature = temperatureSensor.celsius;
    console.log('temperature: ' + temperature + '°C');
    temperatureProperties.temperature = temperature;
};

temperatureSensor.onactivate = function() {
    console.log('temperature sensor activated');
};

temperatureSensor.onerror = function(event) {
    console.log('exception occurs: ' + event.error.name + ' - ' + event.error.message);
};

lightSensor.onreading = function() {
    var illuminance = lightSensor.illuminance;
    console.log('illuminance: ' + illuminance);
    illuminanceProperties.illuminance = illuminance;
};

lightSensor.onactivate = function() {
    console.log('light sensor activated');
};

lightSensor.onerror = function(event) {
    console.log('exception occurs: ' + event.error.name + ' - ' + event.error.message);
};

function getLedOcRepresentation(request) {
    request.respond(ledProperties);
}

function setLedOcRepresentation(request) {
    if (request.data.properties) {
        var state = request.data.properties.value? true : false;
        console.log('Set LED state: ' + state);
        led.write((ledProperties.value = state)? 1 : 0);
    }
    request.respond(ledProperties);
}

function getTemperatureRepresentation(request) {
    request.respond(temperatureProperties);
}

function getIlluminanceOcRepresentation(request) {
    request.respond(illuminanceProperties);
}

function getSolarOcRepresentation(request) {
    request.respond(solarProperties);
}

function setActuatorTiltPosition(percentage) {
    var pulseWidthInMsec = 1 + percentage/100;
    actuatorPin.setMilliseconds(actuatorPwmPeriodInMsec, pulseWidthInMsec);
}

function setSolarOcRepresentation(request) {
    if (request.data.properties) {
        var simulationMode = request.data.properties.simulationMode? true : false;
        console.log('Solar panel simulation ' + (simulationMode? 'On' : 'Off'));
        solarProperties.simulationMode = simulationMode;
        if (simulationMode) {
            if (timerSolarSimulation == null) {
                solarProperties.tiltPercentage = 0;
                timerSolarSimulation = setInterval(function() {
                    /* start solar tilting simulation */
                    if (solarProperties.tiltPercentage <= 0) {
                        simulationTiltStep = 0.5;
                    } else if (solarProperties.tiltPercentage >= 100) {
                        simulationTiltStep = -0.5;
                    }
                    setActuatorTiltPosition(solarProperties.tiltPercentage += simulationTiltStep);
                }, 1000);
            }
        } else {
            if (timerSolarSimulation != null) {
                clearInterval(timerSolarSimulation);
                timerSolarSimulation = null;
            }
            setActuatorTiltPosition(solarProperties.tiltPercentage = request.data.properties.tiltPercentage);
        }
    }
    request.respond(solarProperties);
}

// Resource Registration
server.register(ledResourceInit).then(function(resource) {
    console.log("LED registered");
    ledResource = resource;
}).catch(function(error) {
    console.log('LED registration failure: ' + error.name);
});

server.register(temperatureResourceInit).then(function(resource) {
    console.log('Temperature sensor registered');
    temperatureResource = resource;
}).catch(function(error) {
    console.log('Temperature sensor registration failure: ' + error.name);
});

server.register(illuminanceResourceInit).then(function(resource) {
    console.log("Light sensor registered");
    illuminanceResource = resource;
}).catch(function(error) {
    console.log('Light sensor registration failure: ' + error.name);
});

server.register(solarResourceInit).then(function(resource) {
    console.log("Solar panel registered");
    solarResource = resource;
}).catch(function(error) {
    console.log('Solar panel registration failure: ' + error.name);
});

// Register Listeners
server.on('retrieve', function(request, observe) {
    if (request.target.resourcePath == resPathLed) {
        getLedOcRepresentation(request);
    } else if (request.target.resourcePath == resPathTemperature) {
        getTemperatureRepresentation(request);
    } else if (request.target.resourcePath == resPathIlluminance) {
        getIlluminanceOcRepresentation(request);
    } else if (request.target.resourcePath == resPathSolar) {
        getSolarOcRepresentation(request);
    }
});

server.on('update', function(request) {
    if (request.target.resourcePath == resPathLed) {
        setLedOcRepresentation(request);
    } else if (request.target.resourcePath == resPathSolar) {
        setSolarOcRepresentation(request);
    }
});

/* Start the sensor instance and emit events */
temperatureSensor.start();
lightSensor.start();

/* Start the OCF stack */
ocf.start();
