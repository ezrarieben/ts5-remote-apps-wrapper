import { TSApiConfig } from "./models/TSApiConfig.js";
import { TSApiConnection } from "./models/TSApiConnection.js";

export class TSApiWrapper {
    // Public class variables

    #events = new Map(); // Used to create custom event handler: https://javascript.plainenglish.io/building-a-simple-event-emitter-in-javascript-f82f68c214ad
    #connection = null;
    #config = null;

    constructor(config) {
        this.#config = new TSApiConfig(config);
        this.connect();
    }

    /**
     * Connect and subsequently authenticate to API
     * Also bind all the custom events
     *
     * @return  {[void]}
     */
    connect() {
        // Avoid opening duplicate connections
        if (this.#connection?.isOpen ||  this.#connection?.isConnecting) {
            return;
        }

        this.#connection = new TSApiConnection(this.#config);

        this.#connection.on('error', (params) => {
            this.#emit('apiError', params);
        });

        this.#connection.on('close', (params) => {
            this.#emit('apiConnectionClosed', params);
        });

        this.#connection.on('open', (params) => {
            this.#emit('apiConnectionOpen', params);
        });

        this.#connection.on('message', (params) => {
            this.#emit('apiIncomingMessage', params);

            var message = JSON.parse(params.data);

            // If message from TS API has a type we'll execute the type's message handler
            if (typeof message.type !== "undefined") {
                this.#messageHandler(message.type, message);
            }
        });

        this.#connection.on('ready', (message) => {
            this.#emit('apiReady', message);
        })
    }

    /**
     * Disconnect from API
     *
     * @return  {[void]}
     */
    disconnect() {
        this.#connection.close();
    }

    /**
     * Send data to API
     *
     * @param  {[Object]}   data   JSON Object to send to API
     */
    send(data = {}) {
        this.#connection.send(data);
    }

    #messageHandler(type, message) {
        var type = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter of type
        var eventName = 'tsOn' + type;


        if (this.#config.get('api').tsEventDebug) {
            console.log("Event received: " + eventName);
            console.log(message);
        }

        this.#emit(eventName, message);
    }

    /**
     * Register callback to custom event handler
     *
     * @param   {[string]}  event     Event name
     * @param   {[function]}  callback  Callback to execute when event is emitted
     *
     * @return  {[void]}            
     */
    on(event, callback) {
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        this.#events.get(event).push(callback);
    }

    /**
     * Remove callback from custom event handler
     *
     * @param   {[string]}  event     Event name
     * @param   {[function]}  callback  Callback to remove
     *
     * @return  {[void]}            
     */
    off(event, callback) {
        if (this.#events.has(event)) {
            const callbacks = this.#events.get(event).filter(cb => cb !== callback);
            this.#events.set(event, callbacks);
        }
    }

    /**
     * Emit event from custom event handler
     * 
     * @param {[string]} event      Event name
     * @param {[Object]} data       JSON Object of data to forward to callback
     * 
     * @return {[void]}
     */
    #emit(event, ...data) {
        if (this.#events.has(event)) {
            this.#events.get(event).forEach(callback => {
                setTimeout(() => callback(...data), 0);
            });
        }
    }
}