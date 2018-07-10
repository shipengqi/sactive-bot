const fs = require('fs');
const http = require('http');
const https = require('https');
const App = require('sactive-web');

exports.use = robot => {
  let server = null;
  // validate cert file
  let enableTLS = robot.utils.envs('SBOT_ENABLE_TLS');
  let certFile = robot.utils.envs('SBOT_CERT_FILE_PATH');
  let keyFile = robot.utils.envs('SBOT_KEY_FILE_PATH');
  let baseUrl = robot.utils.envs('SBOT_SERVER_BASEURL');
  let isTLS = enableTLS.startsWith('y');
  if (isTLS) {
    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      throw new Error('Cannot find cert file or key file.');
    }
  }

  let port = robot.utils.envs('SBOT_SERVER_PORT');
  let app = new App({
    enableTransform: true,
    baseUrl: baseUrl
  });
  app.logger = robot.logger;
  // x-response-time
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    app.logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
    ctx.set('X-Response-Time', `${ms}ms`);
  });

  app.bindInstance('robot', robot);
  app.load(`${__dirname}/routers`);
  app.init();
  if (isTLS) {
    let options = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile)
    };
    server = https.createServer(options, app.callback()).listen(Number(port));
  } else {
    server = http.createServer(app.callback()).listen(Number(port));
    // server = app.listen(Number(port));
  }
  app.logger.info(`Start bot sever on port: ${port}`);
  return server;
};