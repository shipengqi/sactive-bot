const encodeMiddleware = require('./encode_middleware');
const filterMiddleware = require('./filter_middleware');

function loadMiddlewares(robot) {
  let middlewares = [
    encodeMiddleware,
    filterMiddleware
  ];

  for (let middleware of middlewares) {
    robot.receiveMiddleware(middleware);
  }
}

module.exports = {
  encodeMiddleware,
  filterMiddleware,
  loadMiddlewares
};