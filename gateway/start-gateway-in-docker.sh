#!/bin/bash

#
# Copyright (c) 2017 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Print out container IP address
echo "This container IP address is: `hostname -i`"

# Set-up the path to where the node.js modules were installed
export NODE_PATH=/opt/SmartHome-Demo/gateway/node_modules/

# Start the Home Gateway
/usr/bin/node /opt/SmartHome-Demo/gateway/gateway-server.js -r &
sleep 0.2

# Start IoT REST API server

# First we will check if we were given a certificate and private key
if [ -f "/opt/security-files/certificate.pem" \
	-a -f "/opt/security-files/private.key" ]
then
	echo "Certificate and private key successfully found."
	cp -f /opt/security-files/certificate.pem /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/config/
	cp -f /opt/security-files/private.key /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/config/
else
	for arg in "$@"
	do
		if [ "$arg" = "-s" ]
		then
			echo
			echo "*** WARNING ***"
			echo
			echo "No certificate or private key was found although you are requesting to use 'https'. We highly recommended that you provide a valid certificate and private key."
			echo
			echo "We will proceed using a certificate and private key that was generated for testing purposes only but be aware that the certificate is self-signed and browsers do not recognise it so you will get warnings."
			echo
			echo "We highly recommend that you get a proper certificate from a known certificate authority and its corresponding private key if you want to use 'https'"
			echo
			echo "If/once you have those, you can provide those by exposing a folder hosting both your 'private.key' and 'certificate.pem' (using these *exact filenames* and sharing it with this container under '/opt/security-files' using a data volume."
			echo
			echo "Here is an example of how to do just that:"
			echo
			echo "   $ sudo docker run -v /path/to/your/folder:/opt/security-files smarthome2cloud/smarthome-gateway -s"
			echo
			echo "*** Now that you have been warned, swiftly moving on... ***"

			# This generate certificates for testing purposes (highly unsecured)
			/bin/bash /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/config/generate-key-and-cert.sh
		fi
	done
fi

# We blindly pass all container command-line arguments to the IoT REST API Server
/usr/bin/node /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/index.js "$@" &

keepgoing=true

trap "keepgoing=false" SIGINT SIGTERM SIGHUP SIGQUIT

echo "Press [CTRL+C] to stop.."

while $keepgoing
do
	:
done

echo "Cleaning up certificate and private key inside the container and exiting..."
rm -f /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/config/private.key
rm -f /opt/SmartHome-Demo/gateway/node_modules/iot-rest-api-server/config/certificate.pem
echo "Done... bye!"
