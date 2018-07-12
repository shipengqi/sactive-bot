const Help = require('../help/help');
const {
  HELP_WORDS
} = require('../const');

function helpMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  if (!robot.processStatus.isHelp) {
    return next();
  }
  robot.logger.debug(`Help middleware processing: ${msg.message.text}`);
  let help = new Help(robot, HELP_WORDS);
  // continues only if its a standart text message event
  if (msg && msg.message) {
    if (!msg.message.text) {
      return next();
    }
  }
  // process and show help messages
  help.processHelp(msg, robot.e.registrar);
  return next();
}

module.exports = helpMiddleware;