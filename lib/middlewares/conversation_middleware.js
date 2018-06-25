const {
  createDialog
} = require('../conversation');

function conversationMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  // let mentionBotRequired = process.env.MENTION_BOT_REQUIRED || "no";
  robot.logger.info('Conversation middleware processing: ', msg.message.text);
  if (robot.processStatus.isCommand) {
    return next();
  }

  if (robot.processStatus.isVC) {
    return next();
  }

  // if (mentionBotRequired === "no" && !robot.processStatus.toBot) {
  //  return next();
  // }

  let dialog = createDialog(robot);
  let existsConversation = dialog.conversationManage.existsConversation(msg.message);
  if (existsConversation) {
    robot.processStatus.isConversation = true;
    let receiverUserId = dialog.conversationManage.getId(msg.message);
    let conversation = dialog.conversationManage.getCurrentConversation(receiverUserId);
    conversation.receiveMessage(msg);
  }
  return next();
}

module.exports = {
  conversationMiddleware
};
