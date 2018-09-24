/**
 * grpc-client -s nlp.service.Nlp -e localhost:7071 -m getNlpResult -p nlp/service/nlp_service.proto -r /Users/ashu/mylab/grpc-client/node_modules/@westfield/polaris-protobuf -d /Users/ashu/mylab/grpc-client/example/data/nlp.json -n 10
 */

const fs = require("fs"),
    path = require("path"),
    os = require("os"),
    { fork } = require("child_process");

const logger = require("./logger");
const message = require("./message");

let _requestsCnt = 0, _responsesCnt = 0;
const _workers = [], _responses = new Map();

class Transaction {
    constructor(requestId) {
        this.requestId = requestId;
        this.startedAt = (new Date()).getTime();
        this.completedAt = null;
        this.status = message.MESSAGE_TYPES.STARTED;
        this.response = null;
    }
}

// let _requests,
//     _totalRequests = 0,
//     _schedulerCounter = 0,
//     _timedelay = 0,
//     _workers = [],
//     _matrix = { requests: [] };

const max = (a, b) => a > b ? a : b;
const min = (a, b) => a < b ? a : b;
const sum = (a, b) => a + b;
const avg = (s, n) => Math.floor(s / n);
const calculateTimeDelay = (numReq, timespan) => Math.floor(timespan / numReq);

// function generateStatistics(matrix) {
//     let requestsMatrix = matrix.requests.map(m => Object.assign(m, { duration: (m.endTime - m.startTime) }));

//     let allSuccess = requestsMatrix.filter(data => data.status !== "FATAL");
//     let allFailure = requestsMatrix.filter(data => data.status === "FATAL");
//     let maxSuccessTime = 0,
//         minSuccessTime = 0,
//         avgSuccessTime = 0,
//         maxFailureTime = 0,
//         minFailureTime = 0,
//         avgFailureTime = 0,
//         absoluteStartTime = 0,
//         absoluteRequestEndTime = 0,
//         absoluteResponseEndTime = 0;

//     let allSuccessDurations = allSuccess.map(s => s.duration);
//     let allFailureDurations = allFailure.map(s => s.duration);

//     if (requestsMatrix.length) {
//         absoluteStartTime = requestsMatrix.map(m => m.startTime).reduce(min) - matrix.timedelay;
//         absoluteRequestEndTime = requestsMatrix.map(m => m.startTime).reduce(max);
//         absoluteResponseEndTime = requestsMatrix.map(m => m.endTime).reduce(max);
//     }

//     if (allSuccess.length) {
//         maxSuccessTime = allSuccessDurations.reduce(max);
//         minSuccessTime = allSuccessDurations.reduce(min);
//         avgSuccessTime = avg(allSuccessDurations.reduce(sum, 0), allSuccessDurations.length);
//     }

//     if (allFailure.length) {
//         maxFailureTime = allFailureDurations.reduce(max);
//         minFailureTime = allFailureDurations.reduce(min);
//         avgFailureTime = avg(allFailureDurations.reduce(sum, 0), allFailureDurations.length);
//     }

//     requestsMatrix.forEach(m => logger.info("request info:", { status: m.status, duration: m.duration }));

//     logger.info("************************************************************************************************");
//     logger.info("----------------------------------------Final Statistics----------------------------------------");
//     logger.info("************************************************************************************************");
//     logger.info("", {
//         totalRequests: requestsMatrix.length,
//         totalRequestTime: absoluteRequestEndTime - absoluteStartTime,
//         totalResponseTime: absoluteResponseEndTime - absoluteStartTime,
//         succeeded: allSuccess.length,
//         failed: allFailure.length,
//         maxSuccessTime,
//         minSuccessTime,
//         avgSuccessTime,
//         maxFailureTime,
//         minFailureTime,
//         avgFailureTime
//     });
// }

function generateReport(transactions) {
    let report = {
        totalRequests: 0,
        totalSuccess: 0,
        totalFailure: 0,
        avgSuccess: 0,
        avgFailure: 0,
        maxSuccess: 0,
        maxFailure: 0,
        minSuccess: 0,
        minFailure: 0
    };

    const successTrans = transactions.filter(t => t.status === message.MESSAGE_TYPES.RESPONSE);
    const failedTrans = transactions.filter(t => t.status === message.MESSAGE_TYPES.ERROR);
    const successDurs = successTrans.map(t => (t.completedAt - t.startedAt));
    const failedDurs = failedTrans.map(t => (t.completedAt - t.startedAt));

    report.totalRequests = transactions.length;
    report.totalFailure = failedTrans.length;
    report.totalSuccess = successTrans.length;
    report.avgFailure = avg(failedDurs.reduce(sum), failedDurs.length);
    report.avgSuccess = avg(successDurs.reduce(sum), successDurs.length);
    report.maxFailure = failedDurs.reduce(max);
    report.maxSuccess = successDurs.reduce(max);
    report.minFailure = failedDurs.reduce(min);
    report.minSuccess = successDurs.reduce(min);
}

function sendRequests(request, number, wait) {

    if (!request || number === 0) {
        return;
    }

    let slavesCnt = _workers.length;

    if (wait === 0) {
        for (let i = 0; i < number; i++) {
            logger.info("sending request");
            _responses.set(i + 1, new Transaction(i + 1));
            _workers[i % slavesCnt].send({ requestId: i + 1, request });
        }
        return;
    }

    const requestId = (_requestsCnt - number) + 1;
    _responses.set(requestId, new Transaction(number));
    _workers[number % slavesCnt].send({ requestId, request });
    setTimeout(sendRequests, wait, request, number - 1, wait);
}

function getRequestPayload(dataFile) {
    try {
        const fileData = fs.readFileSync(dataFile, { encoding: "utf8" });
        return JSON.parse(fileData);
    } catch (error) {
        logger.error("failed to create request", { error });
    }
}

function handleSlaveMessages(message) {
    logger.info("received response", message);
    _responsesCnt += 1;

    let transaction = _responses.get(message.id);
    transaction.completedAt = message.timestamp;
    transaction.status = message.type;
    transaction.response = message.data;

    if (_requestsCnt === _responsesCnt) {
        generateReport(Array.from(_responses.values()));
    }
}

function createSlaves(count, args) {
    let workerPath = path.resolve(__dirname, "slave.js");

    for (let i = 0; i < count; i++) {
        let slave = fork(workerPath, args);

        slave.on("message", handleSlaveMessages);

        slave.on("error", (error) => {
            logger.error("slave error", { error });
        });

        slave.on("close", (code, signal) => {
            logger.error(`slave died with code ${code} and signal ${signal}`);
        });

        _workers.push(slave);
    }
}

function run(options) {
    logger.info("starting grpc client with options", options);
    const { service, endpoint, method, dataFile, protoFile, number, wait, protoRoot } = options;

    _requestsCnt = number;
    let workersNum = number > 1 ? os.cpus().length : 1;

    createSlaves(workersNum, [endpoint, service, method, protoFile, protoRoot]);

    const request = getRequestPayload(dataFile);

    logger.info("created request payload", request);
    sendRequests(request, number, wait);
}

module.exports = { run };
