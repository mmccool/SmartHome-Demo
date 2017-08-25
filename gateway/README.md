# The Home Gateway

The Home Gateway can run on a variety of Operating Systems (OS), from Linux-based OS such as [Ubuntu](https://www.ubuntu.com/) or [Yocto](https://www.yoctoproject.org/) to Windows and Mac OS. This is possible thanks to the [Docker] container set-up which is described below. There are three ways you can set-up the Home Gateway function, in no particular order:

1. [Docker] container
2. [Snap](https://snapcraft.io/) package
3. Native installation

This README.md only covers options 1. and 3. Deploying the SmartHome Gateway via [`snap`](https://snapcraft.io/) is described in great details in this [README.md](../snap/README.md). We shall note that using the [Docker] container or [`snap`](https://snapcraft.io/) package is the quickest way to do it so this is what we recommend you do for the very first time.

## SmartHome Gateway in a [Docker] container

In order to make deploying the SmartHome Gateway easy, a [Docker] container has been created and is available on [Docker Hub](https://hub.docker.com). It is called [smarthome2cloud/smarthome-gateway](https://hub.docker.com/r/smarthome2cloud/smarthome-gateway/). You will find more detailed instructions on how to pull it and run it in the [top-level README.md](../README.md).

### User manual

There is some generic information on how to create and run the different [Docker] containers that are part of this set-up in the top-level [README.d](../README.me) file. We won't repeat much of the same information here and we will instead give a concrete example of how you can quickly get the Home Gateway function up and running using [Docker].

The starting point is a host machine that has [Docker] installed in it. From that point on, follow these simple steps:
```
$ sudo docker pull smarthome2cloud/smarthome-gateway
$ sudo docker run --net host smarthome2cloud/smarthome-gateway
```
And that's it! You can verify that the Home Gateway function is up and running by checking http://localhost:8000/api/system from your favourite browser. The page should display information about your system.

By default, the Home Gateway uses HTTP and port 8000, you can actually change that by passing command-line arguments to the container. It will accept all command-line arguments that the [IoT REST API Server] accepts.

Should you wish to use HTTPS instead of HTTP, you can use the `-s` command-line argument. It is **highly** recommended in such case that you also provide a private key (`private.key`) and certificate (`certificate.pem`) from a known certificate authority. If you don't, a key and certificate will be auto-generated but should be used for testing only. You will get warnings when using them. Assuming you have a valid key and certificate, here is how you can pass them on to the [Docker] container:
1. Create a folder on your host and place both `certificate.pem` and `private.key` in it (you **must** use these exact filenames).
2. Start the [Docker] container exposing this folder to the `/opt/security-files` folder inside the container.
Here is a concrete example, using HTTPS and port 9000:
```
$ sudo docker run -v /path/to/host/folder:/opt/security-files --net host smarthome2cloud/smarthome-gateway -p 9000 -s
```
Go to https://localhost:9000/api/system to verify that the Home Gateway is indeed up and running.

### Technical description

Internally, this [Docker] container uses the [`start-gateway-in-docker.sh`](./start-gateway-in-docker.sh) script to start the following couple of services:
* Home Gateway SW: the core is provided by the content of this folder and started by the [`gateway-server.js`](./gateway-server.js) script
* [IoT REST API Server]: this is the service that exposes the OIC (OCF) API over HTTP(S)

The [IoT REST API Server] can take a number of command-line arguments that tweak its behaviour, by default it starts on port 8000 using HTTP. Should you want to change any of these, you can pass any of the [IoT REST API Server] command-line arguments to the [Docker] container and they will be used. The command-line arguments that are available today are:
```
usage: node index.js [options]
options:
  -h, --help
  -v, --verbose
  -p, --port <number>
  -s, --https
  -c, --cors
```

For more details, please take a look at the [Dockerfile](./Dockerfile).

## Native installation

A native installation assumes that you have [node.js](https://nodejs.org/) running on your system, please refer to the [node.js](https://nodejs.org/) website or your OS documentation for how to install it. You will also need to install a set of tools and development libraries to build [IoTivity](https://wiki.iotivity.org). Here is an example when running Ubuntu: [build dependencies for Ubuntu](https://wiki.iotivity.org/build_iotivity_with_ubuntu_build_machine). Once ready, proceed to the following sections to:
1. Install the `node.js` dependencies
2. Start the SmartHome Gateway services

First of all, copy the content of this Github repository to your target system (we assume that this entire repo has been copied under `/opt` throughout the rest of this document):
```
$ cd /opt
$ sudo git clone https://github.com/01org/SmartHome-Demo
$ cd SmartHome-Demo
```

### Node.js dependencies

Here are the `node.js` dependencies that you need to install next:
* [IoT REST API Server]
* [IoTivity-node](https://www.npmjs.com/package/iotivity-node): this is in fact automatically pulled in when installing the [IoT REST API Server]
* [Express](https://www.npmjs.com/package/express)
* [WebSocket](https://www.npmjs.com/package/websocket)
* [mraa](https://www.npmjs.com/package/mraa): this is only needed if you want to use the Smart Power Meter with a serial line connection. See this [README.md](../sensors//DC_power_meter/README.md) for more details on the Smart Power Meter.

Example:
```
$ cd /opt/SmartHome-Demo
$ sudo npm install iot-rest-api-server express websocket
$ sudo npm install mraa #optional
```

### How to start the Home GW services

1. Starting services manually

There are two services you need to start to have a fully functional Home Gateway:

  + The `gateway-server`
      ```
      $ cd /opt/SmartHome-Demo
      $ /usr/bin/node gateway/gateway-server.js & # Start server with 3D UI and rules engine.
      ```
   OR
      ```
      $ /usr/bin/node gateway/gateway-server.js -r & # Start server with rules engine only.
      ```

  + The `IoT REST API Server`
      ```
      $ cd /opt/SmartHome-Demo
      $ /usr/bin/node node_modules/iot-rest-api-server/index.js &
      ```

2. Automating things with [systemd]

For those Linux operating systems that use `systemd`, we provide `systemd` service files in the [`systemd-files`](./systemd-files) folder. Follow these few steps below to use those:
```
$ sudo cp -r /opt/SmartHome-Demo/gateway/systemd-files/* /lib/systemd/system/
$ sudo systemctl daemon-reload
$ sudo systemctl start smarthome-gateway
$ sudo systemctl start iot-rest-api-server
```

If you want those to be started automatically when you bring up the system, enable them in `systemd`:
```
$ sudo systemctl enable smarthome-gateway
$ sudo systemctl enable iot-rest-api-server
```

[Docker]: https://www.docker.com/
[IoT REST API Server]: https://github.com/01org/iot-rest-api-server
[systemd]: https://www.freedesktop.org/wiki/Software/systemd/
