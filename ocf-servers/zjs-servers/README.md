# JavaScript\* OCF Servers for Zephyr&trade; OS

This folder contains JavaScript implementation of various OCF servers written in [OCF API](https://github.com/01org/zephyr.js/blob/master/docs/ocf.md) of the [JavaScript runtime for Zephyr OS (ZJS)](https://github.com/01org/zephyr.js), which leverage iotivity-constrained for devices with less memory, such as [Arduino 101](https://www.arduino.cc/en/Main/ArduinoBoard101), to communicate with the connected gateway using the OCF networking protocol over Bluetooth 6LoWPAN.

## Setup ZJS Build Environment
Follow the [ZJS Getting Started](https://github.com/01org/zephyr.js#getting-started) guide for setting up the ZJS development environment<sup><b>*1</b></sup> except the version of the [ZJS repository](https://github.com/01org/zephyr.js) to be checked out. The ZJS OCF API has been extended to support multiple resource registrations with [this commit](https://github.com/01org/zephyr.js/commit/5d1674a724ba202bf966a4b2b66d50f80a0acb78), ZJS version 0.3 and below won't work with the scripts in this folder, you should either (a) remain on the master branch after cloning the ZJS source code repo, (b) checkout [the known-to-work commit which we have validated](https://github.com/01org/zephyr.js/commit/e3e4dde59c0595447107b391ede8f23c517b0ad3), or (c) checkout the branch for version 0.4 or above once it’s available.

*Note 1. The scripts in this folder have been validated against the [Zephyr SDK 0.9.1](https://github.com/zephyrproject-rtos/meta-zephyr-sdk/releases/tag/0.9.1)*
​
## Build and Flash the OCF Servers
The ZJS development environment designs with a comprehensive Makefile for building both x86 and ARC images from the given JavaScript code, and for flashing the images to an Arduino 101 board. For example, to build the multi-server OCF server images:
```
$ cd $ZJS_BASE
~/zephyr.js $ make ROM=256 JS=<Path to SmartHome-Demo repo>/ocf-servers/zjs-servers/multiserver.js
```
The `ROM=256` parameter in the above command instructs the linker to allocate 256KB for x86 as the default partition size is not sufficient. Reference the [Getting more space on your Arduino 101](https://github.com/01org/zephyr.js#getting-more-space-on-your-arduino-101) section in the ZJS project for more information.

Then connect the Arduino 101 to your development host with a USB A/B cable, press the onboard `Master Reset` button, and flash the Arduino 101 board with the following command in few seconds:
```
~/zephyr.js $ make dfu
```

After successfully flashing both ARC and x86 images to the Arduino 101 board, press the `Master Reset` button again to run the uploaded OCF server script.

## Establish a BLE Connection from Gateway
The OCF server communicates with the OCF client or gateway over BLE through 6LoWPAN. On the SmartHome gateway with BLE capability, enter the following commands to establish a 6LoWPAN connection to the Arduino 101 board. Reference the [ZJS 6LoWPAN](https://github.com/01org/zephyr.js/blob/master/docs/6lowpan-ble.md) document for detailed instructions.
```
# hciconfig # You should see the device hci0
# rfkill unblock bluetooth
# hciconfig hci0 up
# modprobe bluetooth_6lowpan
# echo 1 > /sys/kernel/debug/bluetooth/6lowpan_enable
# bluetoothctl
[bluetooth]# scan on
[bluetooth]# scan off
[bluetooth]# devices # You will see the "ZJS Device" with the address
[bluetooth]# quit
# echo "connect <ZJS OCF Sensors Address> 2"  >/sys/kernel/debug/bluetooth/6lowpan_control
(e.g. echo "connect E6:DF:CD:CE:65:14 2" >/sys/kernel/debug/bluetooth/6lowpan_control)
# ifconfig  ##You should see bt0 interface, if everything was okay
```

| ZJS OCF server | Sensor | Port on Grove base shield | 
|----------------|--------|---------------------------|
| led.js | onboard LED | n/a |
| temperature.js | onboard temperature sensor | n/a |
| multiserver.js | onboard temperature sensor | n/a |
|                | [Grove PIR motion sensor](http://wiki.seeed.cc/Grove-PIR_Motion_Sensor/) | D2 |
|                | [Grove button](http://wiki.seeed.cc/Grove-Button/) | D4 |
|                | [Grove buzzer](http://wiki.seeed.cc/Grove-Buzzer/) | D7 |
|                | [Grove mini fan](http://wiki.seeed.cc/Grove-Mini_Fan/) | D8 |
|                | [Grove light sensor](http://wiki.seeed.cc/Grove-Light_Sensor/) | A0<sup>*1</sup>  |
| multiserver2.js | onboard LED | n/a |
|                 | Solar panel | PWM0(D3) |
|                 | [Grove Temperature & Humidity sensor](http://wiki.seeed.cc/Grove-TemptureAndHumidity_Sensor-High-Accuracy_AndMini-v1.0/) | I2C |

<sup>*1 The illuminance sensor values are converted from the onchip ADC, which is sensitive to the analog voltage input (AREF). The Grove base shield doesn't drive the AREF input while selecting 3.3V as Vcc through the power switch. It's recommended to turn the switch to 5V position to get correct ADC values.</sup>
