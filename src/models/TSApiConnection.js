import { TSApiConnectionException } from "../exceptions/TSApiConnectionException.js";
import { TSApiAuthException } from "../exceptions/TSApiAuthException.js";

export class TSApiConnection {
    // Public class variables
    config = null;
    isConnecting = true;
    isOpen = false;
    isAuthenticated = false;
    authRequestSent = false;

    // Private class variables
    #events = new Map(); // Used to create custom event handler: https://javascript.plainenglish.io/building-a-simple-event-emitter-in-javascript-f82f68c214ad
    #socketUrl = null;
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
            this.isConnecting = false;
            this.isOpen = true;
            this.#auth();
            this.#emit('open', event);
        }

        this.#ws.onerror = (event) => {
            // No need to set isOpen to false here because event handler "onclose" is called parallel to "onerror" handler
            var data = {
                socketEvent: event,
                exception: new TSApiConnectionException("Error connecting to TeamSpeak remote apps API. Check connection parameters and try again."),
            }
            this.#emit('error', data);
        };

        this.#ws.onclose = (event) => {
            // If API connection closes after auth payload was sent and API is not authenticated then auth failed.
            // Send an exception via error event
            if (this.authRequestSent && this.isAuthenticated !== true) {
                var data = {
                    socketEvent: event,
                    exception: new TSApiAuthException("Access to TS API has been denied in remote apps section of TS client or the API key is invalid."),
                }
                this.#emit('error', data);
            }

            this.isOpen = false;
            this.isConnecting = false;
            this.isAuthenticated = false;

            this.#emit('close', event);
        }

        this.#ws.onmessage = (event) => {
            var message = JSON.parse(event.data);
            if (message.type === "auth") {
                this.#handleAuthResponse(message);
            }

            this.#emit('message', event);
        }
    }

    #auth() {
        var authPayload = {
            "type": "auth",
            "payload": {
                "identifier": this.config.get('app').identifier,
                "version": this.config.get('app').version,
                "name": this.config.get('app').name,
                "description": this.config.get('app').description,
                "content": {
                    "apiKey": this.config.get('api').key
                }
            }
        };

        // Use standard WebSocket send() because class0s send() method has auth check built in
        // We don't need to check if connection is open because "#auth()" is called immediately after WebSocket 'open' event in constructor 
        this.#ws.send(JSON.stringify(authPayload));
        this.authRequestSent = true;
    }

    #handleAuthResponse(message) {
        // Save API key if API returns "auth" response
        this.config.set({
            api: {
                key: message.payload.apiKey
            }
        });
        this.isAuthenticated = true;

        // Emit ready event once authenticated
        this.#emit('ready', message);
    }

    /**
     * Send data to API
     *
     * @param   {[Object]}  data  JSON Object to send to API
     *
     * @return  {[void]}
     */
    send(data = {}) {
        if (this.isOpen !== true) {
            throw new TSApiConnectionException("Can't send data to API. Connection not open.");
        }

        if (this.isAuthenticated !== true) {
            throw new TSApiAuthException("Cant send data to API. Not authenticated.");
        }

        this.#ws.send(JSON.stringify(data));
    }

    /**
     * Close WebSocket
     * 
     * @return {[void]}
     */
    close() {
        // If WebSocket is still connecting and close is called
        if (this.isOpen !== true && this.isConnecting) {
            throw new TSApiConnectionException("Can not close connection that is still connecting");
        } else if (this.isOpen) {
            this.isOpen = false;
            this.#ws.close();
        }
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