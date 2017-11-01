#!/bin/bash
# Start OCF servers on actual device.
# Uses absolute paths so suitable for starting as a systemd service.

# project home directory
PROJ_HOME=/opt/SmartHome-Demo

# directory for OCF servers
OCF_DIR=$PROJ_HOME/ocf-servers/js-servers

# configuration file name
CONFIG_FILE=$PROJ_HOME/ocf-servers/ocf-servers-`hostname`.conf

# delay between launching device servers
LAUNCH_DELAY=5s

# Print out container IP address
echo "This device's IP address is: `hostname -i`"

# Set up the path to where the node.js modules were installed
export NODE_PATH=$PROJ_HOME/node_modules/:/usr/lib/node_modules:$NODE_PATH

# debug flags
NODE_DEBUG="led button toggle buzzer motion"

parse_error=0
# Check if the configuration file exists
if [ -f "$CONFIG_FILE" ];
then
    while read line; do
        aline=($line)
        aline_len=${#aline[@]}

        ocf_server_name=${aline[0]}
        if [[ $ocf_server_name =~ ^\#.* ]];
        then
            # echo but skip comments
            echo "$line"
            continue
        fi
        echo "Instantiating server:"
        echo "  type: $ocf_server_name"

        # extract pin (required value)
        if [ $aline_len -lt 2 ];
        then
          echo "ERROR: Missing pin value"
          parse_error=1
          break
        fi
        pin=${aline[1]};
        echo "  pin: $pin"

        # extract description (if not specified, "" is used)
        # Note only one word is taken... will be used in URL
        if [ $aline_len -gt 2 ];
        then
          desc=${aline[2]}
        else
          desc=""
        fi
        echo "  desc: $desc"
        echo "  name: $ocf_server_name$desc"

        if [ -f "$OCF_DIR/$ocf_server_name.js" ];
        then
            if [[ $pin =~ ^[0-9]+$ ]];
            then
                echo "  starting $ocf_server_name$desc on pin $pin"
                # this weirdness is needed since uuid is based on command name...
                cp $OCF_DIR/$ocf_server_name.js $OCF_DIR/DEV/$ocf_server_name$desc.js
                (export NODE_PATH; export NODE_DEBUG; /usr/bin/node "$OCF_DIR/DEV/$ocf_server_name$desc.js" $pin $desc) &
                sleep $LAUNCH_DELAY
            else
                echo "ERROR: Malformed pin value"
                parse_error=1
                break
            fi
        else
            echo "ERROR: No server $ocf_server_name"
            parse_error=1
            break
        fi
    done < "$CONFIG_FILE"
fi

# Abort if configuration file does not exist or if we got a parsing error
if [ "$parse_error" == "1" ] || [ ! -f "$CONFIG_FILE" ];
then 
    echo "The configuration file was incorrect or not found. Aborting."
    exit 1
fi

# Continue until get a signal to stop.  When killed, all child processes will 
# also stop.
keepgoing=true

trap "keepgoing=false" SIGINT

echo "Send SIGINT to stop.."
while $keepgoing
do
    sleep 1s
done
