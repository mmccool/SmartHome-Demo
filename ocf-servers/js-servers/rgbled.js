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

var debuglog = require('util').debuglog('rgbled'),
    rgbLEDResource,
    sensorPin,
    sensorState = false,
    exitId,
    observerCount = 0,
    resourceTypeName = 'oic.r.colour.rgb',
    resourceInterfaceBaseName = '/a/rgbled',
    resourceInterfaceName,
    range = [0,255],
    rgbValue = [0,0,0],
    clockPin,
    dataPin,
    simulationMode = false,
    secureMode = true;

// Default pin (digital)                                                      
var pin_type = "D";
var pin = 7;    // arg 1, if given; also uses pin + 1     

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
    dlog('Running on HW using pins ' + pin_type + pin 
                           + " and " + pin_type + (pin+1));
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

// Setup LED pins.
function setupHardware() {
    if (!mraa)
        return;

    clockPin = new mraa.Gpio(pin);
    clockPin.dir(mraa.DIR_OUT);
    dataPin = new mraa.Gpio(pin+1);
    dataPin.dir(mraa.DIR_OUT);

    setColourRGB(0, 0, 0);
}

// pulse clock pin (0->transition triggers data transfer)
function clk() {
    if (!mraa)
        return;

    clockPin.write(0);
    clockPin.write(1);
}

function sendByte(b) {
    if (!mraa)
        return;

    // send one bit at a time
    for (var i = 0; i < 8; i++) {
        if ((b & 0x80) != 0)
            dataPin.write(1);
        else
            dataPin.write(0);

        clk();
        b <<= 1;
    }
}

function sendColour(red, green, blue) {
    // start by sending a byte with the format "1 1 /B7 /B6 /G7 /G6 /R7 /R6"
    var prefix = 0xC0;

    if ((blue & 0x80) == 0) prefix |= 0x20;
    if ((blue & 0x40) == 0) prefix |= 0x10;
    if ((green & 0x80) == 0) prefix |= 0x08;
    if ((green & 0x40) == 0) prefix |= 0x04;
    if ((red & 0x80) == 0) prefix |= 0x02;
    if ((red & 0x40) == 0) prefix |= 0x01;

    sendByte(prefix);

    sendByte(blue);
    sendByte(green);
    sendByte(red);
}

// Set the RGB colour
function setColourRGB(red, green, blue) {
    // send prefix 32 x "0"
    sendByte(0x00);
    sendByte(0x00);
    sendByte(0x00);
    sendByte(0x00);

    sendColour(red, green, blue);

    // terminate data frame
    sendByte(0x00);
    sendByte(0x00);
    sendByte(0x00);
    sendByte(0x00);
}

function checkColour(colour) {
    var min = range[0];
    var max = range[1];

    if (colour >= min && colour <= max)
        return true;

    return false;
}

// This function parses the incoming Resource properties
// and changes the sensor state.
function updateProperties(properties) {
    var input = properties.rgbValue;
    if (!input)
        return;

    var r = parseInt(input[0]);
    var g = parseInt(input[1]);
    var b = parseInt(input[2]);
    if (!checkColour(r) || !checkColour(g) || !checkColour(b))
        return;

    if (!simulationMode)
        setColourRGB(r, g, b);
    rgbValue = input;

    dlog('Update received. value: ', rgbValue);
}

// This function constructs the payload and returns when
// the GET request received from the client.
function getProperties() {
    // Format the payload.
    var properties = {
        rt: resourceTypeName,
        id: namedesc,
        rgbValue: rgbValue,
        range: range
    };

    dlog('Send the response. value: ', rgbValue);
    return properties;
}

// Set up the notification loop
function notifyObservers(request) {
    rgbLEDResource.properties = getProperties();

    rgbLEDResource.notify().catch(
        function(error) {
            dlog('Notify failed with error: ', error);
        });
}

// Event handlers for the registered resource.
function retrieveHandler(request) {
    rgbLEDResource.properties = getProperties();
    request.respond(rgbLEDResource).catch(handleError);

    if ('observe' in request) {
        observerCount += request.observe ? 1 : -1;
        if (observerCount > 0)
            setTimeout(notifyObservers, 200);
    }
}

function updateHandler(request) {
    updateProperties(request.data);

    rgbLEDResource.properties = getProperties();
    request.respond(rgbLEDResource).catch(handleError);
    if (observerCount > 0)
        setTimeout(notifyObservers, 200);
}

device.device = Object.assign(device.device, {
    name: 'Smart Home RGB LED (' + desc + ')',
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

    // Setup RGB LED sensor pin.
    setupHardware();

    dlog('Create resource.');

    // Register resource
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
            rgbLEDResource = resource;

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

    // Turn off led before we tear down the resource.
    if (mraa) {
        rgbValue = [0,0,0];
        setColourRGB(0, 0, 0);
    }

    // Unregister resource.
    rgbLEDResource.unregister().then(
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
