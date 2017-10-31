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
    debuglog = require('util').debuglog('motion'),
    motionResource,
    sensorPin,
    exitId,
    notifyObserversTimeoutId,
    resourceTypeName = 'oic.r.sensor.motion',
    resourceInterfaceBaseName = '/a/motion',
    resourceInterfaceName,
    observerCount = 0,
    hasUpdate = false,
    noObservers = false,
    sensorState = false,
    simulationMode = false;

// Default pin (digital)
var pin = 5;

// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given                                            
var namedesc = "motion";   

// Helper function for debugging.  Include "motion" in NODE_DEBUG to enable      
function dlog() {                                                          
    var args = Array.prototype.slice.apply(arguments);                     
    debuglog('(' + desc + ') ' + args.join());                             
}                                                                          

// Parse command-line arguments                                               
var args = process.argv.slice(2);                                             
dlog("args: "+args);                                                          
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
    dlog('Running on HW using D' + pin);
};

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

// Setup Motion sensor pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Gpio(pin);
        sensorPin.dir(mraa.DIR_IN);
     }
}

// This function construct the payload and returns when
// the GET request received from the client.
function getProperties() {
    var motion = false;

    if (!simulationMode) {
        if (sensorPin.read() > 0)
            motion = true;
        else
            motion = false;
    } else {
        // Simulate real sensor behavior. This is useful for testing.
        motion = !sensorState;
    }

    if (sensorState != motion) {
        hasUpdate = true;
        sensorState = motion;
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
        motionResource.properties = properties;
        hasUpdate = false;

        dlog('Send the response: ', sensorState);
        motionResource.notify().catch(
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
    motionResource.properties = getProperties();
    request.respond(motionResource).catch(handleError);

    if ('observe' in request) {
        hasUpdate = true;
        observerCount += request.observe ? 1 : -1;
        if (!notifyObserversTimeoutId && observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Motion (' + namedesc + ')',
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
    // Setup Motion sensor pin.
    setupHardware();

    dlog('Create motion resource.');
    // Register Motion resource
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
            motionResource = resource;

            // Add event handlers for each supported request type
            resource.onretrieve(retrieveHandler);
        },
        function(error) {
            dlog('register() resource failed with: ', error);
        });
}

// Cleanup when interrupted
function exitHandler() {
    dlog('Delete Motion Resource.');

    if (exitId)
        return;

    // Unregister resource.
    motionResource.unregister().then(
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
