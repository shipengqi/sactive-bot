const {PREFIX} = require('./constants');
function NLPMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`${PREFIX.NLP} Enter: ${msg.message.text}`);
  robot.logger.debug(`${PREFIX.NLP} Pass: ${msg.message.text}`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = NLPMiddleware;