function monitorMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`Enter monitor middleware: ${msg.message.text}`);
  robot.logger.debug('Pass monitor middleware:');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = monitorMiddleware;