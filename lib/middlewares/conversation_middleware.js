const {PREFIX} = require('./constants');

module.exports = function(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.debug(`${PREFIX.CONVERSATION} Enter: ${msg.message.text}`);
  if (robot.processStatus.isCommand) {
    return next();
  }

  if (robot.processStatus.isVC) {
    return next();
  }
  let dialog = robot.$.conversation;
  let existsConversation = dialog.existsConversation(msg.message);
  if (existsConversation) {
    robot.processStatus.isConversation = true;
    let receiverUserId = dialog.getId(msg.message);
    let conversation = dialog.getCurrentConversation(receiverUserId);
    conversation.receiveMessage(msg);
  }
  robot.logger.debug(`${PREFIX.CONVERSATION} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
};
