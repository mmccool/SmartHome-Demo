# The Smart Home demo snap

This folder contains the meta file `snapcraft.yaml` for building a snap that can run the Smart Home gateway function on [Intel Joule Development Kit](https://software.intel.com/en-us/iot/hardware/joule/dev-kit) running [Ubuntu Core](https://www.ubuntu.com/core), or Intel 64-bit architecture systems running Ubuntu desktop 16.04 LTS or above. **Snap** is a new secure, self-contained, remotely upgradeable Linux app packaging mechanism, which bundles the application code, its dependency libraries and runtimes in a package. It is sandboxed, confined from the OS and other apps through security mechanisms, which provides secure isolation and is installable either from the Ubuntu store or manually via the `snap` command. Most importantly, it can be updated and reverted without affecting the rest of the system.

## Prerequisites

Follow the instructions in this [setup guide](https://developer.ubuntu.com/en/snappy/start/intel-joule/) to flash the Ubuntu Core on Intel Joule development kit. Note that you will need to register a [Ubuntu SSO account](https://login.ubuntu.com/) in advance to import your SSH key, that key will be added to the Intel Joule development kit while configuring the board, so that you could enter the following commands on the development PC to login to the board, and install snap apps on the target.

#### On the development PC ####

```
$ ssh <developer_ID>@<IP_address_of_Intel_Joule_board>
Welcome to Ubuntu Core 16 (GNU/Linux 4.4.0-1000-joule x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage
Welcome to Snappy Ubuntu Core, a transactionally updated Ubuntu.

 * See https://ubuntu.com/snappy

It's a brave new world here in Snappy Ubuntu Core! This machine
does not use apt-get or deb packages. Please see 'snap --help'
for app installation and transactional updates.
```
#### On the SSH session connected to Intel Joule Development Kit ####
Use the following command to authenticate on `snapd` and the snap store, the credentials will be saved for further communication with snapd (authenticating is recommended but optional).
```
$ snap login
Email address: <Your_registered_email_address_to_store>
Password of "<Your_registered_email_address_to_store>":
```
Install the snap from the `edge` channel:
```
$ sudo snap install iotivity-smarthome-demo --edge
```
The [IoT REST API server](https://github.com/01org/iot-rest-api-server) will be started after installing the snap. You could verify the gateway function by launching a web browser and accessing the web service of URL `/api/system` on Intel Joule development kit at port 8000, or enter the following equivalent command on the development console.
```
$ wget -O- <IP_address_of_Intel_Joule_board>:8000/api/system
Connecting to 192.168.1.105:8000... connected.
HTTP request sent, awaiting response... 200 OK
Length: unspecified [application/json]
Saving to: ‘STDOUT’

-                          [<=>                         ]       0  --.-KB/s
{"hostname":"localhost.localdomain","type":"Linux","platform":"linux","arch":"x64","release":"4.4.0-1000-joule"...
```

#### Connect the required interfaces ####
Snaps are sandboxed, they need to communicate or share resources through interfaces. However, some interfaces are not auto-connected by `snapd` on install, enter the following commands to list the disconnected interfaces and manually connect the interfaces required by the commands of this snap. Although it shows only `bluetooth-control` and `network-control` interfaces were not auto-connected in below screenshot, you might need to manually connect any interfaces that are not connected (e.g. `bluez`, `home` interfaces) on install.
```
$ snap interfaces iotivity-smarthome-demo
Slot           Plug
bluez:service  bluez:client,iotivity-smarthome-demo:bluez
:network-bind  docker,iotivity-smarthome-demo,snapweb
-              iotivity-smarthome-demo:bluetooth-control
-              iotivity-smarthome-demo:network-control

$ snap connect iotivity-smarthome-demo:bluetooth-control

$ snap connect iotivity-smarthome-demo:network-control

$ snap connect iotivity-smarthome-demo:bluez bluez
...

$ snap interfaces iotivity-smarthome-demo
Slot                Plug
bluez:service       bluez:client,iotivity-smarthome-demo:bluez
:bluetooth-control  iotivity-smarthome-demo
:network-bind       docker,iotivity-smarthome-demo,snapweb
:network-control    iotivity-smarthome-demo
```

#### Commands introduced by the snap ####
In the SSH session with the Intel Joule development kit installed this snap, reference the following list for the defined commands and their functions:
* **run-gateway-server**  
  This command launches the Smart Home gateway server which supports 3D webGL UI at port 8080, and run the rule engine that handles the interactions between discovered OCF servers.
* **node** &lt;user script&gt;  
  Use this command to launch the [JavaScript based OCF servers](https://github.com/01org/SmartHome-Demo/tree/master/ocf-servers) included in the `ocf-servers` folder of the SmartHome-Demo repository, the required node.js library modules are preinstalled in the confined environment. For example, the following command represents the onboard LED on the Intel Edison board as an OCF LED resource:
```
root@edison:~# NODE_DEBUG=led iotivity-smarthome-demo.node /snap/iotivity-smarthome-demo/current/ocf-servers/js-servers/led.js
LED 1500: Create LED resource.
LED 1500: Send the response. value:  false
LED 1500: register() resource successful
```
* **rfkill**  
  Linux command line tool for enabling and disabling wireless devices. For example, issue the following command to unblock the Bluetooth interface.
```
$ sudo iotivity-smarthome-demo.rfkill unblock bluetooth
```
* **hciconfig**  
  Linux command line tool for configuring Bluetooth devices. Enter the following commands to turn on the Bluetooth radio.
```
$ sudo iotivity-smarthome-demo.hciconfig hci0 up

$ iotivity-smarthome-demo.hciconfig
hci0:  Type: BR/EDR  Bus: USB
       BD Address: 00:C2:C6:E6:9B:81  ACL MTU: 1021:4  SCO MTU: 96:6
       UP RUNNING
       RX bytes:42755 acl:28 sco:0 events:4177 errors:0
       TX bytes:590809 acl:28 sco:0 commands:3452 errors:0
```

## Build the snap from source

To build the Smart Home demo snap from the source in this repository, you’ll need to have `snapcraft` tools installed in the development PC. **Snapcraft** is a set of tools for easily creating snap packages for Linux distributions. Follow through [this tutorial](http://snapcraft.io/create/) to get familiar with the snaps build process.

The `snapcraft.yaml` file describes the entire build process for a snap, it guides the snapcraft tool fetching everything it needs to build the snap. However your development PC must have the required components and libraries installed, so that it’s capable of building the target components. For instance, the Smart Home demo relies on the open-source [iotivity-node](https://github.com/otcshare/iotivity-node) project which is built on top of a specific [IoTivity](https://www.iotivity.org/) release, your development PC will need to have those [dependencies](https://wiki.iotivity.org/build_iotivity_with_ubuntu_build_machine) and tools installed before building the Smart Home demo snap.

#### Build the snap on the development PC ####
```
$ cd SmartHome-Demo/snap/
$ snapcraft
```
Once successful building the `iotivity-smarthome-demo_`*&lt;version&gt;*`_amd64.snap`, you could download the snap file to the Intel Joule development kit through `scp` command, and install the snap from there.

#### Install the snap file without enforcing security on Intel Joule Development Kit ####
```
$ sudo snap install iotivity-smarthome-demo_<version>_amd64.snap --devmode
```
