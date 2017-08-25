# The IoT to Cloud Smart Home demo

## Introduction
This repository provides source code that allows to set-up and demonstrate an IoT to Cloud SmartHome demo leveraging [OCF](http://openconnectivity.org/) and [IoTivity](https://www.iotivity.org/) to communicate between smart appliances (OCF servers), a Home GW (OCF client) and a cloud-based portal (using the [IoT REST API Server](https://github.com/01org/iot-rest-api-server/)). The user can interact with the various devices via both an Android companion app (when on the local network) and via the cloud portal. For a more comprehensive overview of the architecture and a detailed step-by-step guide on how to put it all together, please take a look at our online [tutorial](https://01.org/smarthome).

## Source code and repository layout
The repository is organised as follows:
* `gateway`: code running on the Home Gateway
* `ocf-servers`: OCF server implementations in JavaScript (located in `js-servers` and `zjs-servers`).
   * Generic documentation on how to set them up is available [here](ocf-servers/js-servers/README.md)
   * The specifications for the OCF servers is availabe in the `ocf-servers/doc/` folder
* `sensors`: source code for the various Smart Devices that are based on the [Zephyr Project](https://www.zephyrproject.org/)
* `smarthome-web-portal`: code for the cloud portal
* `snap`: meta file for packaging the Home Gateway into a [snap](https://www.ubuntu.com/desktop/snappy)
* `package.json`: metadata file for the SmartHome GW and IoT Smart Devices that are implemented in JavaScript. It specifically eases the installation of all modules and dependencies using `npm`.

You will find dedicated README.md files in most of these subfolders that will explain in more details how to use their respective contents.

## How to set-up the IoT to Cloud Smart Home demo
Our online [tutorial](https://01.org/smarthome) is the most comprehensive source of information on how to set-up the various components that form this IoT to Cloud Smart Home demo. However, to simplify the deployment of parts of the demo, we have containerized a number of subsystems using [Docker](https://www.docker.com/). This allows to much more easily deploy and run some parts (or all) of the subsystems from this demo. There are 3 different Docker containers available:
1. SmartHome-Sensors: this container provides a number of Smart Devices (sensors) that are running in simulation mode. These Smart Devices (sensors) are also called "OCF servers" in the [OCF] terminology
2. SmartHome-Gateway: this container runs the Home Gateway function which includes a simplistic rule engine and the [IoT REST API Server] providing the bridge between the Smart Devices and the Cloud applications
3. SmartHome-Cloud: this containers runs the Web Portal and data analytics applications. It connects to Smart Homes through the Home Gateways

You will find more information about these containers in the `README.md` files respectively located under `ocf-servers/`, `gateway/` and `smarthome-web-portal/tools/docker/`.

## Generic instructions for the Docker containers

### Prerequisites

* Install Docker on your host OS following the official documentation at [Docker Platform Installation](https://www.docker.com/products/overview#/install_the_platform).

*Note:* You need to be `root` (or use `sudo`) by default to run `docker` on most host OSs. Configuring `docker` to run as an ordinary user is possible (one way is to add that user to the `docker` group) but currently compromises security.  If you do this however you can just drop the `sudo` prefixes in the examples below.

* Clone the `SmartHome-Demo` repository
```
$ git clone https://github.com/01org/SmartHome-Demo
$ cd SmartHome-Demo
```

### Getting (any of) the Smart Home containers
There are two options available: build it locally, or grab it from [Docker Hub](https://hub.docker.com).

#### Building a SmartHome-* Docker container
**Option 1:** build the Docker container
```
$ cd [gateway|ocf-servers|smarthome-web-portal]
$ docker build -t smarthome-[gateway|sensors|cloud]:v1 .
```
It will take a little while depending on your host machine as it compiles [IoTivity](https://www.iotivity.org) as part of the build process. If you are behind a proxy, please refer to this [README.md](./smarthome-web-portal/tools/docker/README.md) on how to pass the right variables to `docker`.

**Option 2:** get it from Docker Hub
Alternatively, you can grab any of the container from Docker Hub directly using the following command:
```
$ sudo docker pull smarthome2cloud/smarthome-sensors
$ sudo docker pull smarthome2cloud/smarthome-gateway
$ sudo docker pull smarthome2cloud/smarthome-cloud
```

#### Running the Docker containers
There are a few ways you can run the containers, one critical aspect is to get the networking part right. The `smarthome-sensors` and `smarthome-gateway` containers need to be on the same subnet in order for the OCF servers to be discovered by the gateway. This is the case by default if you run both containers on the same host machine (by default, both containers will be running in the `docker0` bridge network). If you intend to run those on different physical machines (that are on the same subnet), the easiest way is to use the `--network host` parameter. If you are interested in understanding more about networking and Docker, please visit the [Docker container networking](https://docs.docker.com/engine/userguide/networking/) page. 


**Option 1:** Running the containers within the `docker0` bridge network
When running both `smarthome-sensors` and `smarthome-gateway` containers on the bridge network, we recommend publishing port 8000 to a local port (e.g. 8001). 
When running `smarthome-cloud` container, we recommend publishing port 3000 and 4000 to a local port (eg. 3030 and 3031).

Example, using locally built containers. `smarthome2cloud` is  the username or organization name registered in Docker hub which is optional if the image is only for local use. You may replace it with your Docker hub account or ignore it by removing the slash before the repository name:
```
$ sudo docker run smarthome2cloud/smarthome-sensors:v1
$ sudo docker run -p 8001:8000 smarthome2cloud/smarthome-gateway:v1
$ sudo docker run -d --name portal -p 3030:3000 -p 3031:4000 smarthome2cloud/smarthome-cloud:v1
```
Alternatively, if you pulled the containers from Docker Hub, use:
```
$ sudo docker run smarthome2cloud/smarthome-sensors:latest
$ sudo docker run -p 8001:8000 smarthome2cloud/smarthome-gateway:latest
$ sudo docker run -d --name portal -p 3030:3000 -p 3031:4000 smarthome2cloud/smarthome-cloud:latest
```

To verify that the virtual Home Gateway is available and that the OCF servers are seen, open you browser and go to http://localhost:8001/api/oic/res.

We recommend using a browser for this and if you are using Google Chrome, we would recommend that you install the [JSON Viewer](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) extension (or similar tool) to make the output look more human-friendly.

*Note:* It is not strictly required to use Docker's port publishing (`-p 8001:8000` argument) to access the [IoT REST API Server], you can use the container's IP address directly instead of `localhost`. The container will print out its IP address when it starts, or you can also retrieve it using `docker inspect <container ID>`.

You can also use `curl` if you are familiar with it, e.g. `curl http://localhost:8001/api/oic/res`.

To verify, configure and troubleshoot the Home Cloud, go to the [README.md](smarthome-web-portal/tools/docker/README.md) file for details.

**Option 2:** Running the containers directly on the host network
If you built the containers locally. `smarthome2cloud` is  the username or organization name registered in Docker hub which is optional if the image is only for local use. You may replace it with your Docker hub account or ignore it by removing the slash before the repository name:
```
$ sudo docker run --network host smarthome2cloud/smarthome-sensors:v1
$ sudo docker run --network host smarthome2cloud/smarthome-gateway:v1
$ sudo docker run --network host -d --name <container-name> smarthome2cloud/smarthome-cloud:v1
```
Alternatively, if you pulled the containers from Docker Hub, use:
```
$ sudo docker run --network host smarthome2cloud/smarthome-sensors:latest
$ sudo docker run --network host smarthome2cloud/smarthome-gateway:latest
$ sudo docker run --network host -d --name <container-name> smarthome2cloud/smarthome-cloud:latest
```
In this case, you can check that the virtual Home Gateway is running by checking http://localhost:8000/api/oic/res. This should also list all the OCF servers running in the `smarthome-sensors` container.

The advantage of running with the `--network host` parameter is that the virtual gateway should see other OCF servers available on your local network (not just the ones from your container environment).

*Note:* this uses plain HTTP by default. It is possible to use HTTPS by giving the container the `-s` command-line argument; we can only **strongly** advise that you also provide a valid `certificate.pem` and `private.key` when doing so. Please check this [README.md](gateway/README.md) file for more details on how to do that.

*Note2:* similarly to what's described in the note above, you can tweak the behaviour of the `iot-rest-api-server` (e.g. changing the default port) by passing command-line arguments to the container, these are passed on as-is to the [IoT REST API Server] service.

By default, the [startup script](ocf-servers/start-ocf-servers-in-docker.sh) in the `smarthome-sensors` Docker container starts all the OCF servers in `ocf-servers/js-servers/`. In order to selectively start some of the OCF servers, or start multiple instances of some, follow the steps below:
1. Make a copy of the `ocf-servers/ocf-server.conf.template` file and rename it to `ocf-servers/ocf-server.conf`
2. Configure `ocf-servers/ocf-server.conf` adhering to the format as shown in the template. Put the OCF server name in the 1st column and the total number of the specified server type in the 2nd column. If the configuration file format is not compliant or it does not exist in the same directory as the script file, the [startup script](ocf-servers/start-ocf-servers-in-docker.sh) skips parsing and starts all OCF servers instead.
3. Share the configuration file on the host with the container process    
```
$ sudo docker run -v <path/to/ocf-server.conf/on/host>:/opt/SmartHome-Demo/ocf-servers/ocf-server.conf smarthome-sensors:v1
```
*Note*: Use the absolute path instead of relative path to point to the configuration file on the host server. 

To verify, configure and troubleshoot the Home Cloud, go to the [README.md](smarthome-web-portal/tools/docker/README.md) file for details.

[IoT REST API Server]: https://github.com/01org/iot-rest-api-server/
[OCF]: https://openconnectivity.org/
