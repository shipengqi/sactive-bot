const {PREFIX} = require('./constants');
const {createDialog} = require('../conversation');
let reminderList = {};

function visualCommandMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.info(`${PREFIX.VC} Enter: ${msg.message.text}`);
  // ignore
  if (!robot.processStatus.isCommand) {
    return next();
  }
  let dialog = createDialog(robot, 'user', 'VisualCommand');
  let userId = dialog.getId(msg.message);
  // if similarList.length = 1, To determine whether the command.similarity = 1
  let commands = robot.processStatus.similarList;
  if (commands.length === 1 && commands[0].similarity === 1) {
    msg.message.text = `@${robot.name} ${commands[0].command}`;
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
  let REMINDER_COMMAND_LIST_MAXIMUM = Number(robot.utils.envs('REMINDER_COMMAND_LIST_MAXIMUM'));
  dialog.cancelConversations(userId);
  let conversation = dialog.start(msg, 'visual command');
  let listString = `You typed *\`${robot.processStatus.str}\`*, which is not a valid command. \nI assume you meant the following command list:\n`;
  for (let [index, commandInfo] of commands) {
    if (index === REMINDER_COMMAND_LIST_MAXIMUM) {
      break;
    }
    listString += `\n ${index + 1}. *\`${item.targetStr}\`*`;
    commands[receiverUserId + '_' + (index + 1)] = {
      actualStr: item.actualStr,
      targetStr: item.targetStr
    };
  }
  listString += `\n\nPlease choose one of above. example: '@${robot.name} 1'.`;
  listString += `\nIf there's no command what you need, please input '@${robot.name} skip' to continue.`;
  msg.reply(listString);
  conversation.addChoice(/.*/i, visualCommandHandler);
  conversation._clearConversationExpireTime();
  return done();

  robot.logger.debug(`${PREFIX.VC} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

function visualCommandHandler(message) {
  let command = commands[receiverUserId + '_' + robot.processStatus.str];
  if (robot.processStatus.str === 'skip') {
    dialog.conversationManage.cancelConversations(receiverUserId);
    return next();
  }
  if (!command) {
    message.reply(`You choosed an invalid option: *\`${robot.processStatus.str}\`*.`);
    let conversation = dialog.conversationManage.getCurrentConversation(receiverUserId);
    conversation.addChoice(/.*/i, visualCommandHandler);
    conversation._clearConversationExpireTime();
    return done();
  }
  message.reply(`You choosed: \`${command.targetStr}\`.`);
  msg.message.text = command.actualStr;

  dialog.conversationManage.cancelConversations(receiverUserId);
  return next();
}

module.exports = visualCommandMiddleware;