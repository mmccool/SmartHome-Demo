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
 *     +----------------------------------------+------+
 *     | Sensor                                 | Port |
 *     +----------------------------------------+------+
 *     | Magnetometer                           |  --- |
 *     | Accelerometer                          |  --- |
 *     | Onboard LED2                           |  --- |
 *     +----------------------------------------+------+
 */

var ocf = require('ocf');
var gpio = require('gpio');
var server = ocf.server;

var updateFrequency = 20; // maximum is 100Hz, but in ashell maximum is 20Hz

// Onboard LED2
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

//Magnetometer
var magnetometerSensor = new Magnetometer({
        frequency: updateFrequency
    }),
    resPathMagnet = '/FXOS8700/magnetometer',
    resTypeMagnet = 'oic.r.magnetometer',
    magnetResource,
    magnetProperties = {
        x: 0,
        y: 0,
        z: 0
    },
    magnetResourceInit = {
        resourcePath : resPathMagnet,
        resourceTypes: [ resTypeMagnet ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties : magnetProperties
    };

//Accelerometer
var accelerometerSensor = new Accelerometer({
        frequency: updateFrequency
    }),
    resPathAccele = '/FXOS8700/accelerometer',
    resTypeAccele = 'oic.r.accelerometer',
    acceleResource,
    acceleProperties = {
        x: 0,
        y: 0,
        z: 0
    },
    acceleResourceInit = {
        resourcePath : resPathAccele,
        resourceTypes: [ resTypeAccele ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties : acceleProperties
    };

console.log('Starting Multiple OCF servers...');

// Event Handlers
magnetometerSensor.onreading = function() {
    console.log("magnetic field (μT): " +
                " x=" + magnetometerSensor.x +
                " y=" + magnetometerSensor.y +
                " z=" + magnetometerSensor.z);
    magnetProperties.x = magnetometerSensor.x;
    magnetProperties.y = magnetometerSensor.y;
    magnetProperties.z = magnetometerSensor.z;
};

magnetometerSensor.onactivate = function() {
    console.log("activated");
};

magnetometerSensor.onerror = function(event) {
    console.log("error: " + event.error.name + " - " + event.error.message);
};

accelerometerSensor.onreading = function() {
    console.log("acceleration (m/s^2): " +
                " x=" + accelerometerSensor.x +
                " y=" + accelerometerSensor.y +
                " z=" + accelerometerSensor.z);
    acceleProperties.x = accelerometerSensor.x;
    acceleProperties.y = accelerometerSensor.y;
    acceleProperties.z = accelerometerSensor.z;
};

accelerometerSensor.onactivate = function() {
    console.log("activated");
};

accelerometerSensor.onerror = function(event) {
    console.log("error: " + event.error.name + " - " + event.error.message);
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

function getMagnetOcRepresentation(request) {
    request.respond(magnetProperties);
}

function getAcceleOcRepresentation(request) {
    request.respond(acceleProperties);
}

// Resource Registration
server.register(ledResourceInit).then(function(resource) {
    console.log("LED registered");
    ledResource = resource;
}).catch(function(error) {
    console.log('LED registration failure: ' + error.name);
});

server.register(magnetResourceInit).then(function(resource) {
    console.log("Magnetometer resource registered");
    magnetResource = resource;
}).catch(function(error) {
    console.log('Magnetometer registration failure: ' + error.name);
});

server.register(acceleResourceInit).then(function(resource) {
    console.log("Acclerometer resource registered");
    acceleResource = resource;
}).catch(function(error) {
    console.log('Acclerometer registration failure: ' + error.name);
});

// Register Listeners
server.on('retrieve', function(request, observe) {
    if (request.target.resourcePath == resPathLed) {
        getLedOcRepresentation(request);
    } else if (request.target.resourcePath == resPathMagnet) {
        getMagnetOcRepresentation(request);
    } else if (request.target.resourcePath == resPathAccele) {
        getAcceleOcRepresentation(request);
    }
});

server.on('update', function(request) {
    if (request.target.resourcePath == resPathLed) {
        setLedOcRepresentation(request);
    }
});

/* Start the sensor instance and emit events */
magnetometerSensor.start();
accelerometerSensor.start();

/* Start the OCF stack */
ocf.start();
