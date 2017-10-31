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
    debuglog = require('util').debuglog('buzzer'),
    buzzerResource,
    playNote = false,
    timerId = 0,
    observerCount = 0,
    sensorPin,
    exitId,
    sensorState = false,
    resourceTypeName = 'oic.r.buzzer',
    resourceInterfaceBaseName = '/a/buzzer',
    resourceInterfaceName,  
    simulationMode = false;

// Default pin (digital)
var pin = 6;    // arg 1, if given

// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given                                            
var namedesc = "buzzer";                                                         
                                                                              
// Helper function for debugging.  Include "buzzer" in NODE_DEBUG to enable
function dlog() {                         
    var args = Array.prototype.slice.apply(arguments);
    debuglog('(' + desc + ') ' + args.join());                                             
}  

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
dlog('args: ' + pin + ' ' + desc);                                            
namedesc += desc;                                                             
resourceInterfaceName = resourceInterfaceBaseName + desc;                     
dlog('resource: ' + resourceInterfaceName);     

if (simulationMode) {
    dlog('Running in simulation mode');
}
else {
    dlog('Running on HW using D' + pin);
}

// Require the MRAA library
var mraa = '';
if (!simulationMode) {
    try {
        mraa = require('mraa');
    }
    catch (e) {
        dlog('No mraa module: ' + e.message);
        dlog('Automatically switching to simulation mode');
        simulationMode = true;
    }
}

// Setup Buzzer sensor pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Gpio(pin);
        sensorPin.dir(mraa.DIR_OUT);
        sensorPin.write(0);
    }
}

// Buzzer will beep as an alarm pausing
// for 0.8 seconds between.
function playTone() {
    if (playNote)
       sensorPin.write(1);
    else
       sensorPin.write(0);

    playNote = !playNote;
}

// This function parce the incoming Resource properties
// and change the sensor state.
function updateProperties(properties) {
    sensorState = properties.value;

    dlog('Update received. value: ' + sensorState);

    if (simulationMode)
        return;

    if (sensorState) {
        timerId = setInterval(playTone, 800);
    } else {
        if (timerId)
            clearInterval(timerId);

        sensorPin.write(0);
    }
}

// This function construct the payload and returns when
// the GET request received from the client.
function getProperties() {
    // Format the payload.
    var properties = {
        rt: resourceTypeName,
        id: namedesc,
        value: sensorState
    };

    dlog('Send the response. value: ' + sensorState);
    return properties;
}

// Set up the notification loop
function notifyObservers(request) {
    buzzerResource.properties = getProperties();

    buzzerResource.notify().then(
        function() {
            dlog('Successfully notified observers.');
        },
        function(error) {
            dlog('Notify failed with error: ' + error);
        });
}

// Event handlers for the registered resource.
function retrieveHandler(request) {
    buzzerResource.properties = getProperties();
    request.respond(buzzerResource).catch(handleError);

    if ('observe' in request) {
        observerCount += request.observe ? 1 : -1;
        if (observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

function updateHandler(request) {
    updateProperties(request.data);

    buzzerResource.properties = getProperties();
    request.respond(buzzerResource).catch(handleError);
    if (observerCount > 0)
        setTimeout(notifyObservers, 200);
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Buzzer (' + namedesc + ')',
    coreSpecVersion: 'core.1.1.0',
    dataModels: ['res.1.1.0']
});

function handleError(error) {
    dlog('Failed to send response with error: ' + error);
}

device.platform = Object.assign(device.platform, {
    manufacturerName: 'Intel',
    manufactureDate: new Date('Fri Oct 30 10:04:17 (EET) 2015'),
    platformVersion: '1.1.0',
    firmwareVersion: '0.0.1'
});

// Enable presence
if (device.device.uuid) {
    // Setup Buzzer sensor pin.
    setupHardware();

    dlog('Create resource.');

    // Register Buzzer resource
    device.server.register({
        id: {path: resourceInterfaceName},
        resourcePath: resourceInterfaceName,
        resourceTypes: [resourceTypeName],
        interfaces: ['oic.if.baseline'],
        discoverable: true,
        observable: true,
        properties: getProperties()
    }).then(
        function(resource) {
            dlog('register() resource successful');
            buzzerResource = resource;

            // Add event handlers for each supported request type
            resource.onretrieve(retrieveHandler);
            resource.onupdate(updateHandler);
        },
        function(error) {
            dlog('register() resource failed with: ' + error);
        });
}

// Cleanup when interrupted
function exitHandler() {
    dlog('Delete resource.');

    if (exitId)
        return;

    // Stop buzzer before we tear down the resource.
    if (timerId)
        clearInterval(timerId);

    if (mraa)
        sensorPin.write(0);

    // Unregister resource.
    buzzerResource.unregister().then(
        function() {
            dlog('unregister() resource successful');
        },
        function(error) {
            dlog('unregister() resource failed with: ' + error);
        });

    // Exit
    exitId = setTimeout(function() { process.exit(0); }, 1000);
}

// Exit gracefully
process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
