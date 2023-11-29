export class TSApiConfig {
    #config = {
        api: {
            host: 'localhost',
            port: 5899,
            key: '',
        },
        app: {
            name: "TS Remote Apps Wrapper",
            identifier: "ts5-remote-apps-wrapper",
            version: "1.0.0",
            description: "An API wrapper written in JavaScript for TeamSpeak 5's remote apps WebSocket feature.",
        }
    }

    constructor(config = {}) {
        this.#config = this.#mergeConfig(this.#config, config);
    }

    /**
     * Gets a config object according to it's key
     *
     * @param   {[string]}  key  Key of config object to retreive
     *
     * @return  {[Mixed]}       Config JSON object. "null" if config object is not set.
     */
    get(key) {
        return this.#config[key];
    }

    /**
     * Merge two json objects without loosing keys
     * 
     * @param   {[Object]}  a   JSON Object a
     * @param   {[Object]}  b   JSON Object b
     * 
     * @return {{Object}}   Two JSON objects merged without loosing any subkeys
     */
    #mergeConfig(a, b) {
        for (var key in b) {
            if (key in a) {
                a[key] = typeof a[key] === 'object' && typeof b[key] === 'object' ? this.#mergeConfig(a[key], b[key]) : b[key];
            }
        }

        return a;
    }
} 