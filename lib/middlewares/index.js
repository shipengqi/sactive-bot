const filterMiddleware = require('./filter_middleware');
const misspellingMiddleware = require('./misspelling_middleware');

function loadMiddlewares(robot) {
  let middlewares = [
    filterMiddleware,
    misspellingMiddleware
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