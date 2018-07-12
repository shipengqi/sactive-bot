function misspellingMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`Enter misspelling middleware: ${msg.message.text}`);
  if (robot.processStatus.similarity === 1) {
    msg.message.text = robot.processStatus.targetStr;
    return next();
  }

  if (robot.processStatus.similarity > 0 && robot.processStatus.similarity < 1 && robot.processStatus.isCommand && robot.processStatus.isHelp) {
    msg.message.text = robot.processStatus.targetStr;
    return next();
  }
  robot.logger.debug('Pass misspelling middleware:');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = misspellingMiddleware;