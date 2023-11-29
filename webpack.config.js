const path = require('path');

module.exports = {
    mode: 'development', // Keep useful names for modules and classes 
    entry: './src/TSApiWrapper.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'ts5-remote-apps-wrapper.min.js',
        library: {
            name: 'TSRemoteAppWrapper',
            type: 'umd',
        },
    },
};