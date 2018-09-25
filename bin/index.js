#!/usr/bin/env node

const program = require("commander");
const master = require("../lib/master");

program
    .version(require("../package.json").version, "-v, --version")
    .option("-e, --endpoint <endpoint>", "service endpoint in <host>:<port> format")
    .option("-s, --service <service>", "fully qualified name of the gRPC service in <package name>.<service name> format")
    .option("-m, --method <method>", "method name of the gRPC service")
    .option("-p, --protoFile <protoFile>", "protocol buffer file which has the service definition")
    .option("-d, --dataFile [dataFile]", "(optional) path of the json file which has the request payload defined")
    .option("-n, --number [number]", "(optional) number of times request should be made", 1)
    .option("-w, --wait [wait]", "(optional) minimum wait time between 2 requests in milliseconds", 0)
    //.option("-t, --timeout [timeout]", "max number of milliseconds to wait for the response")
    .option("-r, --protoRoot [protoRoot]", "(optional)comma separated directories where protocol buffer files are present")
    .parse(process.argv);

let { service, endpoint, method, dataFile, protoFile, number, wait, timeout, protoRoot } = program;

if (!endpoint || !service || !method || !protoFile) {
    program.outputHelp();
    process.exit(0);
}

const options = {
    service,
    endpoint,
    method,
    dataFile,
    protoFile,
    number: Number(number),
    wait: Number(wait),
    timeout,
    protoRoot
};

master.run(options);

