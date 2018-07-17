const {PREFIX} = require('./constants');
const {CONVERSATION_INSTANCE_NAME} = require('../constants');
const {createDialog} = require('../conversation');
let reminderList = {};

function visualCommandMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.info(`${PREFIX.VC} Enter: ${msg.message.text}`);
  // ignore
  // if (!robot.processStatus.isCommand) {
  //   return next();
  // }
  let dialog = createDialog(robot, 'user', CONVERSATION_INSTANCE_NAME.VISUAL_COMMAND);
  let userId = dialog.getId(msg.message);
  // if similarList.length = 1, To determine whether the command.similarity = 1
  let commands = robot.processStatus.similarList;
  if (commands.length === 1 && commands[0].similarity === 1) {
    robot.logger.info(`${PREFIX.VC} matched command: ${commands[0].fullCommand}`);
    msg.message.text = commands[0].fullCommand;
    dialog.cancelConversations(userId);
    return next();
  }
  let existsConversation = dialog.existsConversation(msg.message);
  if (existsConversation) {
    if (!robot.processStatus.isCommand) {
      robot.processStatus.isVC = true;
      let conversation = dialog.getCurrentConversation(userId);
      conversation.receiveMessage(msg);
    } else {
      dialog.cancelConversations(userId);
    }
  }

  let visualCommandHandler = function(message) {
    let option = robot.processStatus.str.split(' ')[1];
    let command = reminderList[userId + '_' + option];
    if (option === 'skip') {
      dialog.cancelConversations(userId);
      return done();
    }
    if (!command) {
      message.reply(`You choosed an invalid option: *\`${robot.processStatus.str}\`*.`);
      let conversation = dialog.getCurrentConversation(userId);
      conversation.addChoice(/.*/i, visualCommandHandler);
      conversation._clearConversationExpireTime();
      return done();
    }
    message.reply(`You choosed: \`${command.command}\`.`);
    msg.message.text = command.fullCommand;

    dialog.cancelConversations(userId);
    return next();
  };

  if (commands.length > 1 || (commands.length === 1 && commands[0].similarity < 1)) {
    let REMINDER_COMMAND_LIST_MAXIMUM = Number(robot.utils.envs('REMINDER_COMMAND_LIST_MAXIMUM'));
    dialog.cancelConversations(userId);
    let conversation = dialog.start(msg, 'visual command');
    let listString = `You typed *\`${robot.processStatus.str}\`*, which is not a valid command. \nI assume you meant the following command list:\n`;
    commands.forEach((commandInfo, index) => {
      if (index === REMINDER_COMMAND_LIST_MAXIMUM) {
        return false;
      }
      listString += `\n ${index + 1}. \`${commandInfo.command}\``;
      reminderList[userId + '_' + (index + 1)] = {
        fullCommand: commandInfo.fullCommand,
        command: commandInfo.command
      };
    });
    listString += `\n\nPlease choose one of above. example: '@${robot.name} 1'.`;
    listString += `\nIf there's no command what you need, please input '@${robot.name} skip' to continue.`;
    msg.reply(listString);
    conversation.addChoice(/.*/i, visualCommandHandler);
    conversation._clearConversationExpireTime();
    return done();
  }

  robot.logger.debug(`${PREFIX.VC} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = visualCommandMiddleware;