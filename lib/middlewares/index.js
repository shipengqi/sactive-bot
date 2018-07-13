const filterMiddleware = require('./filter_middleware');
const misspellingMiddleware = require('./misspelling_middleware');
const helpMiddleware = require('./help_middleware');

function loadMiddlewares(robot) {
  let middlewares = [
    filterMiddleware,
    misspellingMiddleware,
    helpMiddleware
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