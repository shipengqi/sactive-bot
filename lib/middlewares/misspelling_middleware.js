const {
  NaturalLanguageProcess
} = require('../natural_language');
const {
  BOT_REPLY_MESSAGES
} = require('./constants');

function misspellingMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  if (!robot.processStatus.toBot) {
    return next();
  }
  let naturalLanguageProcess = new NaturalLanguageProcess(robot);
  robot.logger.info('Misspelling middleware processing: ', msg.message.text);
  let command = msg.message.text;
  let processResult = naturalLanguageProcess.misspellingProcess(command);
  robot.processStatus = Object.assign(robot.processStatus, processResult.status);
  robot.processStatus.list = processResult.list;
  robot.logger.info(`${JSON.stringify(robot.processStatus)}`);
  if (robot.processStatus.similarity === 1) {
    msg.message.text = robot.processStatus.actualStr;
    return next();
  }

  if (robot.processStatus.similarity > 0 && robot.processStatus.similarity < 1 && robot.processStatus.isCommand && robot.processStatus.isHelp) {
    msg.reply(BOT_REPLY_MESSAGES.MISSPELLING_MESSAGE(robot.processStatus));
    msg.message.text = robot.processStatus.actualStr;
    return next();
  }

  return next();
}

module.exports = {
  misspellingMiddleware
};
