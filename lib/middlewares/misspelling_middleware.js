function misspellingMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`Enter misspelling middleware: ${msg.message.text}`);
  robot.logger.debug('Pass misspelling middleware:');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = misspellingMiddleware;