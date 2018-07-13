const {PREFIX} = require('./constants');

function helpMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.info(`${PREFIX.HELP} Enter: ${msg.message.text}`);
  if (robot.processStatus.isHelp) {
    let helpString = robot.helper.parsing(msg.message.text);
    msg.reply(helpString);
    return done();
  }
  robot.logger.debug(`${PREFIX.HELP} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = helpMiddleware;