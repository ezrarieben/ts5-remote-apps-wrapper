import { TSApiConfig } from "./models/TSApiConfig.js";
import { TSApiConnection } from "./models/TSApiConnection.js";
import { TSApiException } from "./exceptions/TSApiException.js";

export class TSApiWrapper {
    // Public class variables
    config = null;
    api = null;
    authRequestSent = false;
    isAuthenticated = false;

    constructor(config) {
        this.config = new TSApiConfig(config);

        this.api = new TSApiConnection(this.config);
        this.#auth();
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

        this.api.send(authPayload);
        this.authRequestSent = true;

        // If API connection closes after auth payload was sent and API is not authenticated
        this.api.on('close', (event) => {
            if (this.authRequestSent && this.isAuthenticated !== true) {
                throw new TSApiException("Access to TS API has been denied in remote apps section of TS client or the API key is invalid.");
            }
        });

        this.api.on('message', (event) => {
            var message = JSON.parse(event.data);
            if(message.type === "auth") {
                this.isAuthenticated = true;
                console.log(message);
            }
        });
    }
}