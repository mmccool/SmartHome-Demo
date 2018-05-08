// Copyright 2017 Intel Corporation
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

var resPathTemperature = '/bmi160/temperature',
    resTypeTemperature = 'oic.r.temperature';

var updateFrequency = 1;  /* desire frequency in Hz */

var sensor = new TemperatureSensor({
    controller: 'bmi160',
    frequency : updateFrequency
});

var ocf = require('ocf');
var server = ocf.server;

/* http://www.mouser.com/ds/2/783/BST-BMI160-DS000-07-786474.pdf */
var temperatureResource,
    temperatureProperties = {
        //rt: resTypeTemperature,
        temperature: 25.0,
        units: 'C',
        // range: [ -40.0, 85.0 ]
    },
    temperatureResourceInit = {
        resourcePath : resPathTemperature,
        resourceTypes: [ resTypeTemperature ],
        interfaces   : [ 'oic.if.baseline' ],
        discoverable : true,
        observable   : false,
        properties   : temperatureProperties
    };

console.log('Starting OCF Temperature server...');

sensor.onreading = function() {
    var temperature = sensor.celsius;
    console.log('BMI160 temperature: ' + temperature + '°C');
    temperatureProperties.temperature = temperature;
};

sensor.onactivate = function() {
    console.log('BMI160 temperature sensor activated');
};

sensor.onerror = function(event) {
    console.log('exception occurs: ' + event.error.name + ' - ' + event.error.message);
};

function getOcRepresentation(request, observe) {
    request.respond(temperatureProperties).then(function() {
        /* respond success */
    }).catch(function(error) {
        console.log('respond failure: ' + error.name);
    });
}

server.register(temperatureResourceInit).then(function(resource) {
    console.log("Resource registered");
    temperatureResource = resource;
    server.on('retrieve', getOcRepresentation);
}).catch(function(error) {
    console.log('Registration failure: ' + error.name);
});

/* Start the sensor instance and emit events */
sensor.start();

/* Start the OCF stack */
ocf.start();
