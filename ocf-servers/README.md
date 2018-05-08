# The Smart Devices (aka OCF servers)
## JavaScript OCF servers
A number of JavaScript-based OCF servers are provided in the [`js-servers`](./js-servers/) and [`zjs-servers`](./zjs-servers/) folders for `node.js` and [`zephyr.js`](https://github.com/01org/zephyr.js) respectively. The `node.js` dependencies (that can be installed using `npm`) are:
* [IoTivity-node](https://www.npmjs.com/package/iotivity-node)
* [lodash.mergewith](https://www.npmjs.com/package/lodash.mergewith)
* [lodash.assignin](https://www.npmjs.com/package/lodash.assignin)
* [mraa](https://www.npmjs.com/package/mraa)
* [noble](https://www.npmjs.com/package/noble) (only for some)
* [uuid](https://www.npmjs.com/package/uuid)

## Docker container startup script
The [`start-ocf-servers-in-docker.sh`](./start-ocf-servers-in-docker.sh) 
script is used when building a Docker container that runs Smart Devices 
(sensors) as OCF servers. 
These IoT Smart Devices are simulated devices implemented by the scripts 
in the `ocf-servers/js-servers/` folder. 
All scripts accept the `-s` (or `--simulation`) argument that forces them 
to start in simulation mode, 
this is what we use when running in a Docker container.

For more details, please take a look at the [Dockerfile](./Dockerfile).

[Docker]: https://www.docker.com/

## Device startup script
The [`start-ocf-servers.sh`](./start-ocf-servers.sh) 
script can use the same configuration file as the Docker script, 
but can start the scripts on an actual device and can map to physical
pin numbers.

It is also suitable for automatic startup under systemd.  A suggested
service file has been provided.  Copy to `/etc/systemd/system` and enable
the `ocfservers.service` to get the devices in the configuration file to 
start at boot.

    cp ocfservers.service /etc/systemd/system
    systemctl enable ocfservers.service
    systemctl start ocfservers.service

Don't forget to open the CoAP port in the firewall at some point, too:

    iptables -A INPUT -p udp --dport 5683 -j ACCEPT
