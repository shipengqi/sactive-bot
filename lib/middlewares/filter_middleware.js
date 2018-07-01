function filterMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug('Before filtering: ');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  let botNameReg = new RegExp(`^(@?(?:${robot.name}|${robot.alias}):?)+( )+(.*)`, 'i');
  if (robot.adapterName === 'wechat') {
    if (msg.message.user.id.startsWith('@@')) {
      botNameReg = new RegExp(`^(@(?:${robot.name}|${robot.alias}):?)+(.*)`, 'i');
    } else {
      botNameReg = new RegExp('^(.*)$', 'i');
      msg.message.text = `@${robot.name} ${msg.message.text}`;
      robot.processStatus.str = msg.message.text;
    }
  }
  robot.logger.debug('After filtering: ');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  if (!botNameReg.test(msg.message.text)) {
    robot.processStatus.toBot = false;
    return done();
  }

  if (robot.adapterName === 'slack') {
    if (msg.message.user.id.startsWith('B')) {
      return done();
    }
  }

  return next();
}
module.exports = filterMiddleware;