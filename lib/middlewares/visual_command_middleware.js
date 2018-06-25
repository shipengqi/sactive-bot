const {
  VISUAL_COMMAND_LIST_MAXIMUM
} = require('./constants');
const {
  createVCDialog
} = require('../conversation');
const _ = require('lodash');
let commands = {};

function visualCommandMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  let dialog = new createVCDialog(robot);
  let receiverUserId = dialog.conversationManage.getId(msg.message);
  robot.logger.info('visual command middleware processing: ', msg.message.text);

  if (robot.processStatus.isHelp) {
    return done();
  }

  if (!robot.processStatus.toBot) {
    return done();
  }

  if (robot.processStatus.isCommand && robot.processStatus.similarity === 1) {
    dialog.conversationManage.cancelConversations(receiverUserId);
    return next();
  }

  let existsConversation = dialog.conversationManage.existsConversation(msg.message);
  if (existsConversation) {
    if (!robot.processStatus.isCommand) {
      robot.processStatus.isVC = true;
      let conversation = dialog.conversationManage.getCurrentConversation(receiverUserId);
      conversation.receiveMessage(msg);
    } else {
      dialog.conversationManage.cancelConversations(receiverUserId);
    }
  }

  let visualCommandHandler = function(message) {
    let command = commands[receiverUserId + '_' + robot.processStatus.str];
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
  };

  if (robot.processStatus.similarity > 0 && robot.processStatus.similarity < 1 && robot.processStatus.isCommand) {
    dialog.conversationManage.cancelConversations(receiverUserId);
    let conversation = dialog.startDialog(msg, 'visual command');
    let listString = `You typed *\`${robot.processStatus.str}\`*, which is not a valid command. \nI assume you meant the following command list:\n`;
    // robot.processStatus.list.sort((x, y) => {return y.similarity - x.similarity});
    _.each(robot.processStatus.list, (item, index) => {
      if (index === VISUAL_COMMAND_LIST_MAXIMUM) {
        return false;
      }
      listString += `\n ${index + 1}. *\`${item.targetStr}\`*`;
      commands[receiverUserId + '_' + (index + 1)] = {
        actualStr: item.actualStr,
        targetStr: item.targetStr
      };
    });
    listString += `\n\nPlease choose one of above. example: '@${robot.name} 1'.`;
    msg.reply(listString);
    conversation.addChoice(/.*/i, visualCommandHandler);
    conversation._clearConversationExpireTime();
    return done();
  }

  return next();
}

module.exports = {
  visualCommandMiddleware
};
