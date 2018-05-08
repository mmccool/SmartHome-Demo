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

var debuglog = require('util').debuglog('button'),
    buttonResource,
    sensorPin,
    buttonResource,
    notifyObserversTimeoutId,
    exitId,
    resourceTypeName = 'oic.r.button',
    resourceInterfaceBaseName = '/a/button',
    resourceInterfaceName,
    observerCount = 0,
    hasUpdate = false,
    sensorState = false,
    simulationMode = false,
    secureMode = true;

// Default pin (digital)
var pin_type = "D";
var pin = 4;   // arg 1, if given

// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given
var namedesc = "button";   

// Helper function for debugging.  Include "button" in NODE_DEBUG to enable   
function dlog() {                                                          
    var args = Array.prototype.slice.apply(arguments);                     
    debuglog('(' + desc + ') ' + args.join());                             
} 

// Parse command-line arguments                                               
var args = process.argv.slice(2);                                             
debuglog("args: "+args);                                                      
var ii = 0;                                                                   
if ("--simulation" in args) {                                                 
  args.splice(args.indexOf("--simulation"),1);                                
  simulationMode = true;                                                      
}                                                                             
if ("-s" in args) { 
  args.splice(args.indexOf("-s"),1);                                          
  simulationMode = true;                                                      
}                                                                             
if ("--no-secure" in args) { 
  args.splice(args.indexOf("--no-secure"),1);                          
  secureMode = false;
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
    dlog('Running on HW using pin ' + pin_type + pin);
};

// Create appropriate ACLs when security is enabled
if (secureMode) {
    debuglog('Running in secure mode');
    require('./config/json-to-cbor')(__filename, [{
        href: resourceInterfaceName,
        rel: '',
        rt: [resourceTypeName],
        'if': ['oic.if.baseline']
    }], true);
}

var device = require('iotivity-node');

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

// Setup Button pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Gpio(pin);
        sensorPin.dir(mraa.DIR_IN);
    }
}

// This function construct the payload and returns when
// the GET request received from the client.
function getProperties() {
    var buttonState = false;

    if (!simulationMode) {
        if (sensorPin.read() == 1)
            buttonState = true;
        else
            buttonState = false;
    } else {
        // Simulate real sensor behavior. This is useful for testing.
        buttonState = !sensorState;
    }

    if (sensorState != buttonState) {
        hasUpdate = true;
        sensorState = buttonState;
    }

    // Format the payload.
    var properties = {
        rt: resourceTypeName,
        id: namedesc,
        value: sensorState
    };

    return properties;
}

// Set up the notification loop
function notifyObservers() {
    properties = getProperties();

    notifyObserversTimeoutId = null;
    if (hasUpdate) {
        buttonResource.properties = properties;
        hasUpdate = false;

        dlog('Send the response: ', sensorState);
        buttonResource.notify().catch(
            function(error) {
                dlog('Failed to notify observers: ', error);
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
        notifyObserversTimeoutId = setTimeout(notifyObservers, 1000);
    }
}

// Event handlers for the registered resource.
function retrieveHandler(request) {
    buttonResource.properties = getProperties();
    request.respond(buttonResource).catch(handleError);

    if ('observe' in request) {
        hasUpdate = true;
        observerCount += request.observe ? 1 : -1;
        if (!notifyObserversTimeoutId && observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Button (' + desc + ')',
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
    debuglog("Device id: ", device.device.uuid);

    // Setup Button pin.
    setupHardware();

    dlog('Create button resource.');

    // Register Button resource
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
            buttonResource = resource;

            // Add event handlers for each supported request type
            resource.onretrieve(retrieveHandler);
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

    if (notifyObserversTimeoutId) {
        clearTimeout(notifyObserversTimeoutId);
        notifyObserversTimeoutId = null;
    }

    // Unregister resource.
    buttonResource.unregister().then(
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
