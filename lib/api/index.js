const fs = require('fs');
const http = require('http');
const https = require('https');
const App = require('sactive-web');
const {envs} = require('../utils');

exports.use = robot => {
  let server = null;
  // validate cert file
  let enableTLS = envs('SBOT_ENABLE_TLS');
  let certFile = envs('SBOT_CERT_FILE_PATH');
  let keyFile = envs('SBOT_KEY_FILE_PATH');
  let isTLS = enableTLS.startsWith('y');
  if (isTLS) {
    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      throw new Error('Cannot find cert file or key file.');
    }
  }

  let port = Number(envs('SBOT_SERVER_PORT'));
  let app = new App({
    enableTransform: true,
    baseUrl: '/api'
  });
  app.bindInstance('robot', robot);
  app.load(`${__dirname}/routers`);
  app.init();
  if (isTLS) {
    let options = {
      key: fs.readFileSync('./ssl/xxxx.key'),
      cert: fs.readFileSync('./ssl/xxxx.pem')
    };
    server = https.createServer(options, app.callback()).listen(port);
  } else {
    server = http.createServer(app.callback()).listen(port);
  }

  return server;
};