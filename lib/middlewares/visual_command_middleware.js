function visualCommandMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`Enter visual command middleware: ${msg.message.text}`);
  robot.logger.debug('Pass visual command middleware:');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = visualCommandMiddleware;