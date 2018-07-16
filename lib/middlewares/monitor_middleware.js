const {PREFIX} = require('./constants');
// todo: Record the commands that are commonly used by each user
function monitorMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`${PREFIX.MONITOR} Enter: ${msg.message.text}`);
  if (robot.processStatus.isVC) {
    return next();
  }

  if (robot.processStatus.isConversation) {
    return done();
  }
  robot.logger.debug(`${PREFIX.MONITOR} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = monitorMiddleware;