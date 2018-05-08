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

var debuglog = require('util').debuglog('gas'),
    gasResource,
    sensorPin,
    gasDensity = 0,
    resourceTypeName = 'oic.r.sensor.carbondioxide',
    resourceInterfaceBaseName = '/a/gas',
    resourceInterfaceName,
    notifyObserversTimeoutId,
    exitId,
    observerCount = 0,
    hasUpdate = false,
    gasDetected = false,
    simulationMode = false,
    secureMode = true;

// Default pin (analog)                                                   
var pin_type = "A";
var pin = 0;    // arg 1, if given                                    
                                               
// Description (added to URL to distinguish multiple devices of the same type)
var desc = "";  // arg 2, if given       
var namedesc = "gas";                          
                                                                              
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
if (secureMode) {
    dlog('Running in secure mode');
}

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

// Setup Gas sensor pin.
function setupHardware() {
    if (mraa) {
        sensorPin = new mraa.Aio(pin);
        sensorPin.setBit(10);
    }
}

// This function construct the payload and returns when
// the GET request received from the client.
function getProperties() {
    if (!simulationMode) {
        val = sensorPin.read();
        density = val * 500 / 1024;

        dlog('density: %d, threshold: 70', density);
        if (density != gasDensity) {
            if (density > 70 && gasDensity < 70) {
                gasDensity = density;
                gasDetected = true;
                hasUpdate = true;
            } else if (gasDensity > 70 && density < 70) {
                gasDensity = density;
                gasDetected = false;
                hasUpdate = true;
            }
        }
    } else {
        // Simulate real sensor behavior. This is useful for testing.
        gasDetected = !gasDetected;
        hasUpdate = true;
    }

    // Format the properties.
    var properties = {
        rt: resourceTypeName,
        id: namedesc,
        value: gasDetected
    };

    return properties;
}

// Set up the notification loop
function notifyObservers() {
    var properties = getProperties();

    notifyObserversTimeoutId = null;
    if (hasUpdate) {
        gasResource.properties = properties;
        hasUpdate = false;

        dlog('Send the response: ', gasDetected);
        gasResource.notify().catch(
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
    gasResource.properties = getProperties();
    request.respond(gasResource).catch(handleError);

    if ('observe' in request) {
        hasUpdate = true;
        observerCount += request.observe ? 1 : -1;
        if (!notifyObserversTimeoutId && observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

device.device = Object.assign(device.device, {
    name: 'Smart Home Gas (' + desc + ')',
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

    // Setup Gas sensor pin.
    setupHardware();

    dlog('Create resource.');

    // Register Gas resource
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
            gasResource = resource;

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
    gasResource.unregister().then(
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
