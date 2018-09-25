## grpc-client

A command line tool which can be used to test gRPC api endpoints. 

This tool cab be used either as gRPC client or for the basic load testing of the gRPC apis.

### How to use?
``` sh
Usage: grpc-client [options]

Options:

  -v, --version                output the version number
  -e, --endpoint <endpoint>    service endpoint in <host>:<port> format
  -s, --service <service>      fully qualified name of the gRPC service in <package name>.<service name> format
  -m, --method <method>        method name of the gRPC service
  -p, --protoFile <protoFile>  protocol buffer file which has the service definition
  -d, --dataFile [dataFile]    (optional) path of the json file which has the request payload defined
  -n, --number [number]        (optional) number of times request should be made (default: 1)
  -w, --wait [wait]            (optional) minimum wait time between 2 requests in milliseconds (default: 0)
  -r, --protoRoot [protoRoot]  (optional)comma separated directories where protocol buffer files are present
  -h, --help                   output usage information
  ```