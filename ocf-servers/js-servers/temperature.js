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

var device = require('iotivity-node'),
    debuglog = require('util').debuglog('temperature'),
    temperatureResource,
    sensorPin,
    beta = 3975, // Value of the thermistor
    resourceTypeName = 'oic.r.temperature',
    resourceInterfaceBaseName = '/a/temperature',
    resourceInterfaceName,
    notifyObserversTimeoutId,
    exitId,
    observerCount = 0,
    hasUpdate = false,
    temperature = 0,
    desiredTemperature = {},
    simulationMode = false;

// Default pin (analog)
var pin = 1;

// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given                                            
var namedesc = "led";                                                         
                                                                              
// Helper function for debugging.  Include "temperature" in NODE_DEBUG to enable   
function dlog() {                                                             
    var args = Array.prototype.slice.apply(arguments);                        
    debuglog('(' + desc + ') ' + args.join());                                
}                                                                             

// Units for the temperature.
var units = {
    C: 'C',
    F: 'F',
    K: 'K',
};

// Parse command-line arguments                                               
var args = process.argv.slice(2);                                             
dlog("args: " + args);                                                        
if ("--simulation" in args) {                                                 
  args.splice(args.indexOf("--simulation"),1);                                
  simulationMode = true;                                                      
}                                                                             
if ("-s" in args) {                                                           
  args.splice(args.indexOf("-s"),1);                                          
  simulationMode = true;                                                      
}                                                                             
if (args.length > 0) {                                                        
  pin = parseInt(args[0],10);                                                 
}                                                                             
if (args.length > 1) {                                                        
  desc = args[1];                                                             
}                                                                             
dlog('parsed args: ' + pin + ' ' + desc);                                     
namedesc += desc;                                                             
resourceInterfaceName = resourceInterfaceBaseName + desc;                     
dlog('resource: ' + resourceInterfaceName);   

if (simulationMode) {
    dlog('Running in simulation mode');
}
else {
    dlog('Running on HW using pin A' + pin);
}


// Require the MRAA library.
var mraa = '';
if (!simulationMode) {
    try {
        mraa = require('mraa');
    }
    catch (e) {
        dlog('No mraa module: ', e.message);
        dlog('Automatically switching to simulation mode');
        simulationMode = true;
    }
}

// Setup Temperature sensor pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Aio(pin);
    }
}

// Get the range property value for temperature
// based on the unit attribute.
function getRange(tempUnit) {
    var range;

    switch (tempUnit) {
        case units.F:
            range = '-40,257';
            break;
        case units.K:
            range = '233.15,398.15';
            break;
        case units.C:
        default:
            range = '-40,125';
            break;
    }

    return range;
}

// This function construct the payload and returns when
// the GET request received from the client.
function getProperties(tempUnit) {
    if (!simulationMode) {
        var raw_value = sensorPin.read();
        var temp = 0.0;

        // Get the resistance of the sensor
        var resistance = (1023 - raw_value) * 10000 / raw_value;
        var Ktemperature = 1 / (Math.log(resistance / 10000) / beta + 1 / 298.15);

        switch (tempUnit) {
            case units.F:
                temperature = Math.round(((Ktemperature - 273.15) * 9.0 / 5.0 + 32.0) * 100) / 100;
                dlog('Temperature in Fahrenheit: ', temperature);
                break;
            case units.K:
                temperature = Math.round(Ktemperature * 100) / 100;
                dlog('Temperature in Kelvin: ', temperature);
                break;
            case units.C:
            default:
                temperature = Math.round((Ktemperature - 273.15) * 100) / 100;
                dlog('Temperature in Celsius: ', temperature);
                break;
        }

        if (!desiredTemperature[tempUnit] || temperature >= desiredTemperature[tempUnit])
            hasUpdate = true;
    } else {
        // Simulate real sensor behavior. This is useful for testing.
        temperature = temperature + 0.1;
        dlog('Temperature: ', temperature);
        hasUpdate = true;
    }

    // Format the properties.
    var properties = {
        rt: resourceTypeName,
        id: namedesc,
        temperature: temperature,
        units: tempUnit,
        range: getRange(tempUnit)
    };

    return properties;
}

function updateProperties(properties) {
    if (!properties.temperature)
        return false;

    var units = properties.units ? properties.units : units.C;
    var range_temp = getRange(units).split(',');
    var min = parseInt(range_temp[0]);
    var max = parseInt(range_temp[1]);

    if (properties.temperature < min || properties.temperature > max)
        return false;

    desiredTemperature[units] = properties.temperature;
    dlog('Desired value: ', desiredTemperature);

    return true;
}

// Set up the notification loop
function notifyObservers() {
    var properties = getProperties(units.C);

    notifyObserversTimeoutId = null;
    if (hasUpdate) {
        temperatureResource.properties = properties;
        hasUpdate = false;

        dlog('Send the response: ', temperature);
        temperatureResource.notify().catch(
            function(error) {
                dlog('Failed to notify observers with error: ', error);
                if (error.observers.length === 0) {
                    observerCount = 0;
                    if (notifyObserversTimeoutId) {
                        clearTimeout(notifyObserversTimeoutId);
                        notifyObserversTimeoutId = null;
                    }
                }
            });
    }

    // After all our clients are complete, we don't care about any
    // more requests to notify.
    if (observerCount > 0) {
        notifyObserversTimeoutId = setTimeout(notifyObservers, 2000);
    }
}

// Event handlers for the registered resource.
function retrieveHandler(request) {
    temperatureResource.properties = getProperties(units.C);
    request.respond(temperatureResource).catch(handleError);

    if ('observe' in request) {
        observerCount += request.observe ? 1 : -1;
        if (observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

function updateHandler(request) {
    var ret = updateProperties(request.data);

    if (!ret) {
        // Format the error properties.
        var err = new Error('Invalid input');
        request.respondWithError(err);
        return;
    }

    temperatureResource.properties = getProperties(units.C);
    request.respond(temperatureResource).catch(handleError);

    if (observerCount > 0)
        setTimeout(notifyObservers, 200);
}

function translateHandler(request) {
    if (request.units) {
        if (!(request.units in units)) {
            // Format the error properties.
            var error = {
                id: 'temperature',
                units: request.units,
                error: request.units + ' is an invalid temperature unit.'
            };

            return error;
        }

        temperatureResource.properties = getProperties(request.units);
    } else {
        temperatureResource.properties = getProperties(units.C);
    }

    return temperatureResource.properties;
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Temperature (' + desc + ')',
    coreSpecVersion: 'core.1.1.0',
    dataModels: ['res.1.1.0']
});

function handleError(error) {
    dlog('Failed to send response with error: ', error);
}

device.platform = Object.assign(device.platform, {
    manufacturerName: 'Intel',
    manufactureDate: new Date('Fri Oct 30 10:04:17 (EET) 2015'),
    platformVersion: '1.1.0',
    firmwareVersion: '0.0.1'
});

if (device.device.uuid) {
    // Setup Temperature sensor pin.
    setupHardware();

    dlog('Create resource.');

    // Register Temperature resource
    device.server.register({
        resourcePath: resourceInterfaceName,
        resourceTypes: [resourceTypeName],
        interfaces: ['oic.if.baseline'],
        discoverable: true,
        observable: true,
        properties: getProperties(units.C)
    }).then(
        function(resource) {
            dlog('register() resource successful');
            temperatureResource = resource;

            // Add event handlers for each supported request type
            resource.onretrieve(retrieveHandler);
            resource.onupdate(updateHandler);
            resource.ontranslate(translateHandler);
        },
        function(error) {
            dlog('register() resource failed with: ', error);
        });
}

// Cleanup when interrupted
function exitHandler() {
    dlog('Delete resource.');

    if (exitId)
        return;

    // Unregister resource.
    temperatureResource.unregister().then(
        function() {
            dlog('unregister() resource successful');
        },
        function(error) {
            dlog('unregister() resource failed with: ', error);
        });

    // Exit
    exitId = setTimeout(function() { process.exit(0); }, 1000);
}

// Exit gracefully
process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
