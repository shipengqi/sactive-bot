// adapter administration script
const {
  createWarning,
  createSuccess
} = require('../lib/conversation');

module.exports = function(robot) {
  const switchBoard = robot.e.createDialog(robot);
  const tryToGetConversation = function(msg) {
    let existsConversation = switchBoard.conversationManage.existsConversation(msg.message);
    if (!existsConversation) {
      msg.send(createWarning(robot, 'There is no active conversation.', msg));
      return null;
    }
    let id = msg.match[1];
    let receiverUserId = switchBoard.conversationManage.getId(msg.message);
    if (id) {
      id = id.toLowerCase();
    } else {
      let current = switchBoard.conversationManage.getCurrentConversation(receiverUserId);
      id = current.id;
    }

    return {
      receiverUserId,
      id
    };
  };

  const showConversation = function(msg) {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let receiverUserId = ids.receiverUserId;
    let id = ids.id;
    if (id === 'all') {
      response = switchBoard.conversationManage.getConversations(receiverUserId);
    } else {
      response = switchBoard.conversationManage.getConversation(receiverUserId, id);
    }
    msg.send(createSuccess(robot, response, msg));
  };

  const cancelConversation = function(msg) {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let receiverUserId = ids.receiverUserId;
    let id = ids.id;
    if (id === 'all') {
      response = switchBoard.conversationManage.cancelConversations(receiverUserId);
    } else {
      response = switchBoard.conversationManage.cancelConversation(receiverUserId, id, {
        single: true
      });
    }
    msg.send(createSuccess(robot, response, msg));
  };

  const resumeConversation = function(msg) {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let receiverUserId = ids.receiverUserId;
    let id = ids.id;
    response = switchBoard.conversationManage.resumeConversation(receiverUserId, id);
    msg.send(createSuccess(robot, response, msg));
  };

  // register module
  robot.e.registerIntegration({
    shortDesc: 'Admin module for hubot enterprise',
    longDesc: 'Admin module contain number of calls for Chat platform ' +
    'managing',
    name: 'admin'
  });

  robot.e.create({
    verb: 'show',
    entity: 'conversation',
    entityDesc: 'show conversation',
    type: 'respond',
    help: '@botname admin show conversation [all|conversationId]',
    integrationName: 'admin'
  },
  showConversation
  );

  robot.e.create({
    verb: 'cancel',
    entity: 'conversation',
    entityDesc: 'cancel conversation',
    type: 'respond',
    help: '@botname admin cancel conversation [all|conversationId]',
    integrationName: 'admin'
  },
  cancelConversation
  );

  robot.e.create({
    verb: 'resume',
    entity: 'conversation',
    entityDesc: 'resume conversation',
    type: 'respond',
    help: '@botname admin resume conversation [conversationId]',
    integrationName: 'admin'
  },
  resumeConversation
  );
};
