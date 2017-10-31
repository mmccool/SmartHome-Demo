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
    debuglog = require('util').debuglog('fan'),
    fanResource,
    sensorPin,
    exitId,
    observerCount = 0,
    sensorState = false,
    resourceTypeName = 'oic.r.fan',
    resourceInterfaceBaseName = '/a/fan',
    resourceInterfaceName,
    simulationMode = false;

                                                                           
// Default pin (digital)                                                      
var pin = 9;    // arg 1, if given                                            
                                                                           
// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given                                            
var namedesc = "led";                                                      
                                                                      
// Helper function for debugging.  Include "led" in NODE_DEBUG to enable   
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
dlog('parsed args: ' + pin + ' ' + desc);                                     
namedesc += desc;                                                       
resourceInterfaceName = resourceInterfaceBaseName + desc;
dlog('resource: ' + resourceInterfaceName);                                   
                                    
// Require the MRAA library
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

// Setup Fan sensor pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Gpio(pin);
        sensorPin.dir(mraa.DIR_OUT);
        sensorPin.write(0);
    }
}

// This function parce the incoming Resource properties
// and change the sensor state.
function updateProperties(properties) {
    sensorState = properties.value;

    dlog('Update received. value: ', sensorState);

    if (simulationMode)
        return;

    if (sensorState)
      sensorPin.write(1);
    else
      sensorPin.write(0);
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

    dlog('Send the response. value: ', sensorState);
    return properties;
}

// Set up the notification loop
function notifyObservers() {
    fanResource.properties = getProperties();

    fanResource.notify().catch(
        function(error) {
            dlog('Notify failed with error: ', error);
        });
}

// Event handlers for the registered resource.
function retrieveHandler(request) {
    fanResource.properties = getProperties();
    request.respond(fanResource).catch(handleError);

    if ('observe' in request) {
        observerCount += request.observe ? 1 : -1;
        if (observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

function updateHandler(request) {
    updateProperties(request.data);
    fanResource.properties = getProperties();

    request.respond(fanResource).catch(handleError);
    if (observerCount > 0)
        setTimeout(notifyObservers, 200);
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Fan (' + desc + ')',
    coreSpecVersion: 'core.1.1.0',
    dataModels: ['res.1.1.0']
});

function handleError(error) {
    dlog('Failed to send response with error ', error);
}

device.platform = Object.assign(device.platform, {
    manufacturerName: 'Intel',
    manufactureDate: new Date('Fri Oct 30 10:04:17 (EET) 2015'),
    platformVersion: '1.1.0',
    firmwareVersion: '0.0.1'
});

if (device.device.uuid) {
    // Setup Fan sensor pin.
    setupHardware();

    dlog('Create resource.');

    // Register Fan resource
    device.server.register({
        resourcePath: resourceInterfaceName,
        resourceTypes: [resourceTypeName],
        interfaces: ['oic.if.baseline'],
        discoverable: true,
        observable: true,
        properties: getProperties()
    }).then(
        function(resource) {
            dlog('register() resource successful');
            fanResource = resource;

            // Add event handlers for each supported request type
            resource.onretrieve(retrieveHandler);
            resource.onupdate(updateHandler);
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

    // Stop fan before we tear down the resource.
    if (mraa)
        sensorPin.write(0);

    // Unregister resource.
    fanResource.unregister().then(
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
