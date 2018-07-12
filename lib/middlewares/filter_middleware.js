function filterMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  // ignore if msg.message or msg.message.text is null
  if (!msg || !msg.message || !msg.message.text) {
    return done();
  }
  robot.logger.debug(`Enter filter middleware: ${msg.message.text}`);
  // define message process status
  robot.processStatus = {
    str: msg.message.text, // source string
    targetStr: msg.message.text,
    toBot: true, // if @bot, default true
    isHelp: false,
    isCommand: false,
    isConversation: false
  };
  let botNameReg = new RegExp(`^(@?(?:${robot.name}|${robot.alias}):?)+( )+(.*)`, 'i');
  if (robot.adapterName === 'wechat') {
    if (msg.message.user.id.startsWith('@@')) { // message from wechat group
      botNameReg = new RegExp(`^(@(?:${robot.name}|${robot.alias}):?)+(.*)`, 'i');
    } else { // message from wechat separate chat without @bot, so add @bot automatically
      msg.message.text = `@${robot.name} ${msg.message.text}`;
      robot.processStatus.str = msg.message.text;
    }
  }
  // ignore if not @bot
  if (!botNameReg.test(msg.message.text)) {
    robot.processStatus.toBot = false;
    return done();
  }
  // ignore message from system in salck
  if (robot.adapterName === 'slack') {
    if (msg.message.user.id.startsWith('B')) {
      return done();
    }
  }
  robot.logger.debug('Pass filter middleware: ');
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = filterMiddleware;