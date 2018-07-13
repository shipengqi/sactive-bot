const {PREFIX} = require('./constants');
function monitorMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`${PREFIX.MONITOR} Enter: ${msg.message.text}`);
  robot.logger.debug(`${PREFIX.MONITOR} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = monitorMiddleware;