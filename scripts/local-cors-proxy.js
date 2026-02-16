// Simple local CORS proxy for development
// Usage: node scripts/local-cors-proxy.js

const cors_proxy = require('cors-anywhere');

const host = 'localhost';
const port = 8080;

cors_proxy.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: ['origin', 'x-requested-with'],
  removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
  console.log('Local CORS Proxy running on http://' + host + ':' + port);
});
