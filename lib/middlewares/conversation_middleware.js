const {Dialog} = require('sbot-conversation');
const _ = require('lodash');

module.exports = function conversationMiddleware(customListener) {
  if (!_.isFunction(customListener)) {
    customListener = () => true;
  }

  return function(context, next, done) {
    let msg = context.response;
    let robot = msg.robot;

    robot.logger.debug('Conversation middleware processing: ', msg.message.text);

    let dialog = new Dialog(robot);
    if (!customListener(msg.message)) {
      return next();
    }
    let existsConversation = dialog.existsConversation(msg.message);
    if (existsConversation) {
      let receiverUserId = dialog.getId(msg.message);
      let conversation = dialog.getCurrentConversation(receiverUserId);
      conversation.receiveMessage(msg);
    }
    return next();
  };
};