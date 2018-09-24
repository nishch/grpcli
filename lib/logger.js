const winston = require("winston");
const { MESSAGE } = require("triple-beam");

const simpleFormat = winston.format(info => {

    if (info.level === "error" && info.error) {
        if (typeof info.error === "string") {
            info.errorMessage = `${info.error}`;
        } else {
            info.errorMessage = `${info.error.message}`;
            info.stack = info.error.stack;
        }

        delete info.error;
    }

    const infoCopy = Object.assign({}, info);
    delete infoCopy.timestamp;
    delete infoCopy.level;
    delete infoCopy.splat;
    delete infoCopy.message;

    const payload = JSON.stringify(infoCopy);


    if (payload !== "{}") {
        info[MESSAGE] = `${info.level === "debug" ? (info.timestamp + " ") : ""}${info.message} ${payload}`;
    } else {
        info[MESSAGE] = `${info.level === "debug" ? (info.timestamp + " ") : ""}${info.message}`;
    }

    return info;
});

const logger = winston.createLogger({
    level: "info",
    format: simpleFormat(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "grpc-client.log" })
    ]
});

module.exports = logger;
