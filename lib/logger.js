const winston = require("winston");
const jsonStringify = require("fast-safe-stringify");
const { MESSAGE } = require("triple-beam");

const simpleFormat = winston.format(info => {

    const stringifiedRest = jsonStringify(Object.assign({}, info, {
        level: undefined,
        message: undefined,
        splat: undefined,
        timestamp: undefined
    }));

    if (info.level === "error" && info.error) {
        if (typeof info.error === "string") {
            info.errorMessage = `${info.error}`;
        } else {
            info.errorMessage = `${info.error.message}`;
            info.stack = info.error.stack;
        }

        delete info.error;
    }

    const padding = info.padding && info.padding[info.level] || "";
    if (stringifiedRest !== "{}") {
        info[MESSAGE] = `${info.timestamp} ${info.level}:${padding} ${info.message} ${stringifiedRest}`;
    } else {
        info[MESSAGE] = `${info.timestamp} ${info.level}:${padding} ${info.message}`;
    }

    return info;
});

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), simpleFormat()),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "grpc-client.log" })
    ]
});

module.exports = logger;
