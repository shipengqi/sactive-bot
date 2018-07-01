function encodeMiddleware(context, next, done) {
  let msg = context.response;

  if (!msg || !msg.message || !msg.message.text) {
    return done();
  }

  let robot = msg.robot;
  robot.processStatus = {
    str: msg.message.text,
    toBot: true,
    isHelp: false,
    isCommand: false
  };
  robot.logger.debug('Before encoding: ');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  let encodeString = encodeURI(msg.message.text);
  let decodeString = decodeURI(encodeString);
  msg.message.text = decodeString;
  robot.processStatus.str = decodeString;
  robot.logger.debug('After encoding: ');
  robot.logger.debug(JSON.stringify(robot.processStatus));

  return next();
}

module.exports = encodeMiddleware;