import { TSApiException } from "../exceptions/TSApiException.js";

export class TSApiConnection {
    // Public class variables
    config = null;

    // Private class variables
    #events = new Map(); // Used to create custom event handler: https://javascript.plainenglish.io/building-a-simple-event-emitter-in-javascript-f82f68c214ad
    #socketUrl = null;
    #isOpen = false;
    #sendQueue = [];
    #ws = null;

    /**
     * [constructor description]
     *
     * @param   {[TSApiConfig]}  config  TSApiConfig object with config
     *
     * @return  {[type]}          [return description]
     */
    constructor(config) {
        this.config = config;

        this.#socketUrl = "ws://" + this.config.get('api').host + ":" + parseInt(this.config.get('api').port) + "/";

        this.#ws = new WebSocket(this.#socketUrl);

        this.#ws.onopen = (event) => {
            this.#isOpen = true;

            // Send all messages to API in queue
            var i;
            for(i = 0; i < this.#sendQueue.length; i++) {
                this.send(this.#sendQueue[i]);
            }
            this.#sendQueue.splice(i); // Splice array using last iterated index to reset queue

            this.emit('open', event);
        }

        this.#ws.onerror = (event) => {
            this.emit('error', event);
            this.#onerror(event);
        };

        this.#ws.onclose = (event) => {
            this.#isOpen = false;

            this.emit('close', event);
        }

        this.#ws.onmessage = (event) => {
            this.emit('message', event);
        }
    }

    send(data) {
        if (this.#isOpen !== true) {
            // WebSocket is not ready to receive data yet so we'll add the data to the send queue
            this.#sendQueue.push(data);
            return;
        }

        this.#ws.send(JSON.stringify(data));
    }

    on(event, callback) {
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        this.#events.get(event).push(callback);
    }

    off(event, callback) {
        if (this.#events.has(event)) {
            const callbacks = this.#events.get(event).filter(cb => cb !== callback);
            this.#events.set(event, callbacks);
        }
    }

    emit(event, ...data) {
        if (this.#events.has(event)) {
            this.#events.get(event).forEach(callback => {
                setTimeout(() => callback(...data), 0);
            });
        }
    }

    #onerror(event) {
        throw new TSApiException("Error connecting to TeamSpeak remote apps API. Check connection parameters and try again.");
    }
}