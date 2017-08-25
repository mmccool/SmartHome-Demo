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

# project home directory
PROJ_HOME=/opt/SmartHome-Demo

# directory for OCF servers
OCF_DIR=$PROJ_HOME/ocf-servers/js-servers

# configuration file name
CONFIG_FILE=$PROJ_HOME/ocf-servers/ocf-server.conf

# Print out container IP address
echo "This container IP address is: `hostname -i`"

# Set-up the path to where the node.js modules were installed
export NODE_PATH=$PROJ_HOME/node_modules/


parse_error=0
# Start all different OCF servers available
if [ -f "$CONFIG_FILE" ];
then
    while read ocf_server_name num; do
        # skip commented lines
        if [[ $ocf_server_name =~ "^\#.*" ]];
        then
            continue
        fi

        if [ -f "$OCF_DIR/$ocf_server_name.js" ];
        then
            if [[ $num =~ ^[0-9]+$ ]];
            then
                for i in $(seq 1 $num);
                do
                    echo "...Starting $ocf_server_name server..."
                    if [ "$i" == "1" ];
                    then 
                        /usr/bin/node "$OCF_DIR/$ocf_server_name.js" -s &
                    else
                        # create a new ocf server file
                        \cp -fR $OCF_DIR/$ocf_server_name.js $OCF_DIR/$ocf_server_name$i.js
                        rt="'/a/$ocf_server_name$i',"
                        sed -i "s#\(resourceInterfaceName\s*=\s*\).*#\1${rt}#" $OCF_DIR/$ocf_server_name$i.js
                        if [ $? -eq 0 ]; 
                        then
                            /usr/bin/node "$OCF_DIR/$ocf_server_name$i.js" -s &
                        else
                            parse_error=1
                            break
                        fi
                    fi
                    sleep 0.2
                done
            else
                parse_error=1
                break
            fi
        fi
    done < "$CONFIG_FILE"
fi

# conf file does not exist or got parsing error
if [ "$parse_error" == "1" ] || [ ! -f "$CONFIG_FILE" ];
then 
    echo "The configuration file was incorrect or not found. Starting all OCF servers (default)."
    for file in `ls -1 $OCF_DIR/*.js`
    do
	    /usr/bin/node $file -s &
	    sleep 0.2
    done
fi

keepgoing=true

trap "keepgoing=false" SIGINT

echo "Press [CTRL+C] to stop.."

while $keepgoing
do
	:
done
