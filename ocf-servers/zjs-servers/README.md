# JavaScript\* OCF Servers for Zephyr&trade; OS

This folder contains JavaScript implementation of various OCF servers written in [OCF API](https://github.com/intel/zephyr.js/blob/master/docs/ocf.md) of the [JavaScript runtime for Zephyr OS (ZJS)](https://github.com/intel/zephyr.js), which leverage iotivity-constrained for devices with less memory, such as [Arduino 101](https://www.arduino.cc/en/Main/ArduinoBoard101), to communicate with the connected gateway using the OCF networking protocol over Bluetooth 6LoWPAN. [FRDM-K64F](http://docs.zephyrproject.org/boards/arm/frdm_k64f/doc/frdm_k64f.html), to setup an IP route for the device so your Linux machine knows where to route the IP traffic.

## Setup ZJS Build Environment
Follow the [ZJS Getting Started](https://github.com/intel/zephyr.js#getting-started) guide for setting up the ZJS development environment<sup><b>*1</b></sup> except the version of the [ZJS repository](https://github.com/intel/zephyr.js) to be checked out. The ZJS OCF API has been extended to support multiple resource registrations with [this commit](https://github.com/intel/zephyr.js/commit/dd376a229dd094bc51a51248a5a74764a47e85d9), ZJS version 0.3 and below won't work with the scripts in this folder, you should either (a) remain on the master branch after cloning the ZJS source code repo, (b) checkout [the known-to-work commit which we have validated](https://github.com/intel/zephyr.js/commit/0ae1d621777df8d6783bad5b9b411d868a5e48c8), or (c) checkout the branch for version 0.5 or above once it’s available.

*Note 1. The scripts in this folder have been validated against the [Zephyr SDK 0.9.1](https://github.com/zephyrproject-rtos/meta-zephyr-sdk/releases/tag/0.9.1)*
​
## Build and Flash the OCF Servers
The ZJS development environment designs with a comprehensive Makefile for building both x86 and ARC images from the given JavaScript code, for example, to build the multi-server OCF server images
### For Arduino 101 board
```
$ cd $ZJS_BASE/../../
$ make ROM=256 JS=<Path to SmartHome-Demo repo>/ocf-servers/zjs-servers/multiserver_pub.js
```
The `ROM=256` parameter in the above command instructs the linker to allocate 256KB for x86 as the default partition size is not sufficient. Reference the [Getting more space on your Arduino 101](https://github.com/intel/zephyr.js#getting-more-space-on-your-arduino-101) section in the ZJS project for more information (Note: Set 'ROM=272' if you want to build multiserver_a101.js).

Then connect the Arduino 101 to your development host with a USB A/B cable, press the onboard `Master Reset` button, and flash the Arduino 101 board with the following command in few seconds:
```
$ make dfu
```
### For FRDM-K64F board
```
$ cd $ZJS_BASE/../../
$ make BOARD=frdm_k64f JS=<Path to SmartHome-Demo repo>/ocf-servers/zjs-servers/multiserver_k64f.js
```
Then connect the FRDM-K64F to your development host with a USB A/B cable, copy the new .bin file to that directory:
```
$ cp zephyr/zephyr.bin /media/<USERNAME>/MBED/
```

After successfully flashing all boards, press the `Master Reset` button again to run the uploaded OCF server script.

## Establish a BLE Connection from Gateway
The OCF server communicates with the OCF client or gateway over BLE through 6LoWPAN. On the SmartHome gateway with BLE capability, enter the following commands to establish a 6LoWPAN connection to the Arduino 101 board. Reference the [ZJS 6LoWPAN](https://github.com/intel/zephyr.js/blob/master/docs/6lowpan-ble.md) document for detailed instructions (Note: You have to run these commands as root):
```
# hciconfig # You should see the device hci0
# rfkill unblock bluetooth
# hciconfig hci0 up
# modprobe bluetooth_6lowpan
# echo 1 > /sys/kernel/debug/bluetooth/6lowpan_enable
# hcitool lescan
# echo "connect <ZJS OCF Sensors Address> 2"  >/sys/kernel/debug/bluetooth/6lowpan_control
(e.g. echo "connect FF:EE:DD:CC:BB:AA 2"  >/sys/kernel/debug/bluetooth/6lowpan_control)
```

## Connecting to your 6LoWPAN device by Net/Dgram
If you are using either the net or dgram module you will need to setup an IP route for the device so your Linux machine knows where to route the IP traffic. Here should be a comment at the top explaining how to setup the IP route as well as here:
```
$ ifconfig
bt0       Link encap:UNSPEC  HWaddr 5C-F3-70-FF-FE-78-1D-72-00-00-00-00-00-00-00-00
          inet6 addr: fe80::5ef3:70ff:fe78:1d72/64 Scope:Link
          UP POINTOPOINT RUNNING MULTICAST  MTU:1280  Metric:1
          RX packets:6 errors:0 dropped:0 overruns:0 frame:0
          TX packets:28 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1
          RX bytes:167 (167.0 B)  TX bytes:1200 (1.2 KB)

[eth0, lo, etc.]

$sudo ip -6 route add 2001:db8::/64 dev bt0
$sudo ip -6 addr add 2001:db8::2 dev bt0
```

| ZJS OCF server | Sensor | Port on Arduino 101/FRDM-K64F | 
|----------------|--------|---------------------------|
| led.js | onboard LED2 | n/a |
| temperature.js | onboard temperature sensor | n/a |
| multiserver_pub.js | [Grove PIR motion sensor](http://wiki.seeed.cc/Grove-PIR_Motion_Sensor/) | IO2/D3 |
|                | [Grove button](http://wiki.seeed.cc/Grove-Button/) | IO4/D1 |
|                | [Grove buzzer](http://wiki.seeed.cc/Grove-Buzzer/) | IO7/D7 |
|                | [Grove mini fan](http://wiki.seeed.cc/Grove-Mini_Fan/) | IO8/D6 |
|                | [Grove Temperature & Humidity sensor](http://wiki.seeed.cc/Grove-TemptureAndHumidity_Sensor-High-Accuracy_AndMini-v1.0/) | I2C |
| multiserver_a101.js| onboard LED2 | n/a |
|                | onboard temperature sensor | n/a |
|                | [Grove light sensor](http://wiki.seeed.cc/Grove-Light_Sensor/) | A0 |
||Actuator control board| PWM0(IO3)| 
| multiserver_k64f.js | onboard LED2 | n/a |
|                 | onboard Magnetometer | n/a |
|                 | onboard Accelerometer | n/a |

<sup>*1 The illuminance sensor values are converted from the onchip ADC, which is sensitive to the analog voltage input (AREF). The Grove base shield doesn't drive the AREF input while selecting 3.3V as Vcc through the power switch. It's recommended to turn the switch to 5V position to get correct ADC values.</sup>
