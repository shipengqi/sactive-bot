const {envs} = require('../utils');
const App = require('sactive-web');

class ApiServer {
  constructor(robot, options) {
    this.options = options;
    new App();
  }
}

exports.use = robot => {
  let options = {
    port: envs('SBOT_SERVER_PORT')
  };

  let app = new ApiServer(robot, options);
  return app;
};