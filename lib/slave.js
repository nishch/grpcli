//const debug = require("debug")("slave");
const grpc = require("grpc");
const path = require("path");
const protoLoader = require("@grpc/proto-loader");

const { MESSAGE_TYPES, Message } = require("./message");

let _makeCall;

function getProtoPkg(protoFile, protoRoot, options) {
    let includeDirs = protoRoot ? protoRoot.split(",") : null;

    let protoOptions = Object.assign({
        keepCase: true,
        enums: String,
        longs: String,
        defaults: true,
        oneofs: true
    }, options);

    if (path.isAbsolute(protoFile)) {
        includeDirs = includeDirs || [];
        includeDirs.push(path.dirname(protoFile));
        protoFile = path.basename(protoFile);
    } else if (!includeDirs) {
        includeDirs = [process.cwd()];
    }

    includeDirs && (protoOptions.includeDirs = includeDirs);

    let protoPkgDef = protoLoader.loadSync(protoFile, protoOptions);

    if (Object.keys(protoPkgDef).length === 0) {
        throw new Error("failed to load the service");
    }

    let protoPkg = grpc.loadPackageDefinition(protoPkgDef);

    return protoPkg;
}

function createClient(pkg, serviceName, endpoint, options) {
    let namespace, parent;

    if (serviceName.indexOf(".") > -1) {
        let fqns = serviceName.split(".");
        serviceName = fqns.pop();
        namespace = fqns;
    }

    parent = pkg;
    if (namespace) {
        for (const name of namespace) {
            parent = parent[name];
        }
    }

    const Service = parent[serviceName];

    if (!Service || typeof Service !== "function") {
        throw new TypeError("invalid service");
    }

    return new Service(endpoint, grpc.credentials.createInsecure());
}

function makeCall(client, method) {
    return (request) => {
        return new Promise((resolve, reject) => {
            //let now = new Date();
            //client[method](request, { deadline: now.setMilliseconds(now.getMilliseconds() + timeout) && now.getTime() }, (err, response) => {

            const cb = (err, response) => {
                if (err) {
                    return reject(err);
                }

                resolve(response);
            };

            if (!request) {
                client[method](cb);
                return;
            }

            client[method](request, cb);
        });
    };
}

function registerWithParent() {
    process.on("message", ({ requestId, request }) => {

        process.send(new Message(requestId, MESSAGE_TYPES.ACK));

        return _makeCall(request)
            .then(response => {
                process.send(new Message(requestId, MESSAGE_TYPES.RESPONSE, response));
            })
            .catch(error => {
                process.send(new Message(requestId, MESSAGE_TYPES.ERROR, error.message));
            });
    });
}

function execute() {
    const options = process.argv.slice(2);
    let [endpoint, service, method, protoFile, protoRoot] = options;
    const pkg = getProtoPkg(protoFile, protoRoot, options);
    const client = createClient(pkg, service, endpoint, options);
    _makeCall = makeCall(client, method);
    registerWithParent();
}

execute();
