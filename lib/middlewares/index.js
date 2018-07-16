const filterMiddleware = require('./filter_middleware');
const misspellingMiddleware = require('./misspelling_middleware');
const helpMiddleware = require('./help_middleware');
const visualCommandMiddleware = require('./visual_command_middleware');

function loadMiddlewares(robot) {
  let middlewares = [
    filterMiddleware,
    misspellingMiddleware,
    helpMiddleware,
    visualCommandMiddleware
  ];

  for (let middleware of middlewares) {
    robot.receiveMiddleware(middleware);
  }
}

module.exports = {
  private: {
    filterMiddleware,
    misspellingMiddleware,
    helpMiddleware,
    visualCommandMiddleware
  },
  loadMiddlewares
};