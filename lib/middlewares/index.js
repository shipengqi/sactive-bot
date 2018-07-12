const filterMiddleware = require('./filter_middleware');

function loadMiddlewares(robot) {
  let middlewares = [
    filterMiddleware
  ];

  for (let middleware of middlewares) {
    robot.receiveMiddleware(middleware);
  }
}

module.exports = {
  private: {
    filterMiddleware
  },
  loadMiddlewares
};