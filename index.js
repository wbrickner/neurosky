// The lengths to which I will go to avoid callbacks...
const connect = require("util").promisify(require("net").connect)
const { EventEmitter } = require("events")

class NeuroSky extends EventEmitter {
    /**
     * Options: port, host, raw (defaults to true).
     * @param {Object} options 
     */
    constructor(options = { autoReconnect: true }) {
        this.port = options.port || 13854
        this.host = options.host || "localhost"
        this.autoReconnect = !!options.autoReconnect
        this.auth = {
            appName: options.appName || "",
            appKey: options.appKey || ""
        }
        this.formatConfig = {
            enableRawOutput: !!options.raw,
            format: "Json"  // JSON must have the first letter capitalized. 
                            // This was written by old people.
        }

        this.client = null
    }

    safeParse(jsonString) {
        try {
            return JSON.parse(jsonString)
        }
        catch (e) {
            this.emit("parse_error", e)
            return {}
        }
    }

    safeParseStreamingJSON(jsonString) {
        // in the docs it says there can be multiple adjacent objects
        // seperated by \r
        return jsonString.split("\r").map(this.safeParse)
    }

    safeStringify(data) {
        try { return JSON.parse(data) }
        catch (e) { this.emit("serialize_error", e) }
    }
    
    onSocketReady() {
        // when the socket is ready to be written to,
        // write our auth data and wait for a response
        this.client.write(this.safeStringify(this.auth))
    }

    onAuthorized() {
        // the client is now authorized, and we can tell the headset
        // what data format we prefer
        this.client.write(this.safeStringify(this.formatConfig))
    }

    onData(data) {
        const objects = this.safeParseStreamingJSON(data)

        for (var j = 0, jlen = objects.length; j < jlen; ++j) {
            if (objects[j].isAuthorized) { this.client.emit("authorized") }
            else if (objects[j].rawEeg) { this.emit("raw", objects[j]) }
            else if (objects[j].blinkStrength) { this.emit("blink", objects[j]) }
            else if (objects[j].poorSignalLevel) { this.emit("signal-strength", objects[j]) }
            else if (objects[j].eSense) {
                if (typeof objects[j].eSense.attention === "number") { this.emit("attention", objects[j].eSense.attention) }
                if (typeof objects[j].eSense.meditation === "number") { this.emit("meditation", objects[j].eSense.meditation) }
            }
            else if (objects[j].eegPower) { this.emit("eeg", objects[j].eegPower) }
            else { this.emit("data", objects[j]) }
        }
    }

    onTimeout() {
        this.client.destroy("timeout")
    }

    onError(error) {
        this.emit("socket-error", error)

        if (this.autoReconnect) {
            this.attemptReconnect()
        }
    }

    async attemptReconnect() {
        this.emit("reconnecting")

        this.client.removeAllListeners()
        this.client = null

        console.info("Attempting to reconnect...")
        await this.connect()
    }

    /**
     * 
     */
    async connect() {
        if (this.client) { return }

        this.client = await connect(this.port, this.host)

        this.client.on("data", this.onData)
        this.client.on("ready", this.onSocketReady)
        this.client.on("timeout", this.onTimeout)
        this.client.on("error", this.onError)

        // hijacked the event emitter
        this.client.on("authorized", this.onAuthorized)
    }
}

module.exports = NeuroSky