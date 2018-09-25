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
        this.type = message.MESSAGE_TYPES.STARTED;
        this.response = null;
    }
}

const max = (a, b) => a > b ? a : b;
const min = (a, b) => a < b ? a : b;
const sum = (a, b) => a + b;
const avg = (s, n) => Math.floor(s / n);

function generateReport() {
    let transactions = Array.from(_responses.values());

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

    report.totalRequests = transactions.length;

    const successTrans = transactions.filter(t => t.type === message.MESSAGE_TYPES.RESPONSE);
    if (successTrans.length > 0) {
        const successDurs = successTrans.map(t => (t.completedAt - t.startedAt));
        report.totalSuccess = successTrans.length;
        report.avgSuccess = avg(successDurs.reduce(sum), successDurs.length);
        report.maxSuccess = successDurs.reduce(max);
        report.minSuccess = successDurs.reduce(min);
    }

    const failedTrans = transactions.filter(t => t.type === message.MESSAGE_TYPES.ERROR);
    if (failedTrans.length > 0) {
        const failedDurs = failedTrans.map(t => (t.completedAt - t.startedAt));
        report.totalFailure = failedTrans.length;
        report.avgFailure = avg(failedDurs.reduce(sum), failedDurs.length);
        report.maxFailure = failedDurs.reduce(max);
        report.minFailure = failedDurs.reduce(min);
    }

    logger.info("-------------------------------------------------------");
    logger.info(`Total Requests: ${report.totalRequests}`);
    logger.info(`Total Successful Requests: ${report.totalSuccess}`);
    logger.info(`Total Failed Requests: ${report.totalFailure}`);
    logger.info(`Max Success Time: ${report.maxSuccess}`);
    logger.info(`Min Success Time: ${report.minSuccess}`);
    logger.info(`Avg Success Time: ${report.avgSuccess}`);
    logger.info(`Max Failure Time: ${report.maxFailure}`);
    logger.info(`Min Failure Time: ${report.minFailure}`);
    logger.info(`Avg Failure Time: ${report.avgFailure}`);
    logger.info("-------------------------------------------------------");

}

function sendRequests(request, number, wait) {

    if (!request || number === 0) {
        return;
    }

    let slavesCnt = _workers.length;

    if (wait === 0) {
        for (let i = 0; i < number; i++) {
            let requestId = i + 1;
            logger.debug("sending request");
            _responses.set(requestId, new Transaction(requestId));
            _workers[i % slavesCnt].send({ requestId, request });
        }
        return;
    }

    const requestId = (_requestsCnt - number) + 1;
    _responses.set(requestId, new Transaction(requestId));
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

function handleSlaveMessages(msg) {
    logger.debug("received response", msg);

    let transaction = _responses.get(msg.id);
    transaction.completedAt = msg.timestamp;
    transaction.type = msg.type;
    transaction.response = msg.data;

    if (msg.type === message.MESSAGE_TYPES.RESPONSE) {
        logger.info("", transaction);
        _responsesCnt += 1;
        if (_requestsCnt === _responsesCnt) {
            generateReport();
        }
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
    logger.debug("starting grpc client with options", options);
    const { service, endpoint, method, dataFile, protoFile, number, wait, protoRoot } = options;

    _requestsCnt = number;
    let workersNum = number > 1 ? os.cpus().length : 1;

    createSlaves(workersNum, [endpoint, service, method, protoFile, protoRoot]);

    const request = dataFile ? getRequestPayload(dataFile) : null;

    logger.debug("created request payload", request);
    sendRequests(request, number, wait);
}

module.exports = { run };
