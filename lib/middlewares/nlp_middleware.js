const {PREFIX} = require('./constants');
function NLPMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`Enter NLP middleware: ${msg.message.text}`);
  robot.logger.debug('Pass NLP middleware:');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = NLPMiddleware;