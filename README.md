## grpcx

A command line tool which can be used to test gRPC api endpoints. 

This tool cab be used either as gRPC client or for the basic load testing of the gRPC apis.

### Installation

`npm install grpcx -g`

### Usage
``` sh
Usage: grpcx [options]

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

  let's see how each of the above options work  in the context of following sample protobuf file which I have taken from [official gRPC site](https://grpc.io/docs/quickstart/node.html#update-a-grpc-service):

  ``` protobuf
  syntax = "proto3";
  
  package helloworld;

  service Greeter {
    rpc SayHello (HelloRequest) returns (HelloReply) {}
  }

  message HelloRequest {
    string name = 1;
  }

  message HelloReply {
    string message = 1;
  }
  ```

  #### -e, --endpoint <endpoint>
  endpoint where service is running, for example if service is running in `localhost` and listening on port `7070` the value provided should be `localhost:7071`.

  #### -s, --service
  fully qualified service name, for example in the above example service name would be `helloworld.Greeter`.

  #### -m, --method
  name of the method we want to test, for example in the above example it would be `sayHello`.

  #### -p, --protoFile
  path of the `proto` file which has the service definitions present. It can be an absolute path, or if only base path is provided, then tool will look for the files in the current working directory.

  #### -d, --dataFile
  path of the `json` file which has the request payload defined, this is an optional parameter and needed for the apis which are parameterized.
  It can be either absolute path of base path.

  #### -r, --protoRoot
  this can take the list of one or more directories separated by comma. Tool will try to resolve the proto files and import statements by searching for the files in the provided directories.

  #### -n, --number
  this tool can also be used for simple load testing scenarios, in such cases this option can take number of times an api endpoint should be hit. Default value is 1.

  #### -w, --wait
  while using the tool for load testing, if it is desired to have some wait time between two request, this option can be used to provide the value in milliseconds. Default value is 0.

  #### Example Usage:
  In the context of above proto file, if we want to call `sayHello`, we can run following command:

  ``` sh
    grpcx -e localhost:7071 -s helloworld.Greeter -m sayHello -p <path of proto files>/hello.proto -d <path of data file>/data.json
  ```

### Output and Logs
This tool generates the log file in the current working directory which logs all the requests and responses one transaction per line. It also generates the summary as shown below:

``` bash
 {"requestId":1,"startedAt":1537863546867,"completedAt":1537863547871,"type":"RESPONSE","response":<response object>}
-------------------------------------------------------
Total Requests: 1
Total Successful Requests: 1
Total Failed Requests: 0
Max Success Time: 1004
Min Success Time: 1004
Avg Success Time: 1004
Max Failure Time: 0
Min Failure Time: 0
Avg Failure Time: 0
-------------------------------------------------------
```