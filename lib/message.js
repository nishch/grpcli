const MESSAGE_TYPES = {
    STARTED: "STARTED",
    ACK: "ACK",
    ERROR: "ERROR",
    RESPONSE: "RESPONSE"
};

class Message {
    constructor(id, msgType, data) {
        this.id = id;
        this.type = msgType;
        this.data = data || {};
        this.timestamp = (new Date()).getTime();
    }
}

module.exports = {
    MESSAGE_TYPES,
    Message
};
