const _ = require('lodash');
const OPERATION_TYPES = {
  SHOW: 1,
  RESUME: 2,
  CANCEL: 3
};
module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: 'Admin module for sbot',
    name: 'admin'
  });
  let manager = robot.$.conversation;

  let tryToGetConversation = msg => {
    let existsConversation = manager.existsConversation(msg.message);
    if (!existsConversation) {
      return msg.reply('There is no conversation.');
    }
    let id = msg.match[1];
    let userId = manager.getId(msg.message);
    if (id) {
      id = id.toLowerCase();
    } else {
      let current = manager.getCurrentConversation(userId);
      id = current.id;
    }

    return {
      userId,
      id
    };
  };

  let createResponse = (any, type) => {
    let response = '';
    if (_.isString(any)) {
      response = any;
    } else {
      if (_.isArray(any)) {
        if (any[0].code) {
          for (let value of any) {
            response += `\n${value.msg}`;
          }
        } else {
          response += `**Conversation count:** ${any.length}`;
          for (let value of any) {
            response += `\n\n**ID:** ${value.id}\n**Name:** ${value.name} **Status:** ${value.status}`;
          }
        }
      } else {
        if (any.code) {
          response = any.msg;
        } else {
          if (type === OPERATION_TYPES.CANCEL) {
            response += 'Cancel conversation successfully, resume conversation:\n';
          }
          if (type === OPERATION_TYPES.RESUME) {
            response += 'Resume conversation:\n';
          }
          response += `**ID:** ${any.id}\n**Name:** ${any.name}\n**Status:** ${any.status}`;
          response += `\n**Last question:** ${any.lastQuestion}`;
        }
      }
    }

    return response;
  };
  let showConversation = msg => {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let userId = ids.userId;
    let id = ids.id;
    if (id === 'all') {
      response = manager.getConversations(userId);
    } else {
      response = manager.getConversation(userId, Number(id));
    }
    msg.reply(createResponse(response, OPERATION_TYPES.SHOW));
  };

  let cancelConversation = msg => {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let userId = ids.userId;
    let id = ids.id;
    if (id === 'all') {
      response = manager.cancelConversations(userId);
    } else {
      response = manager.cancelConversation(userId, Number(id));
    }
    msg.reply(createResponse(response, OPERATION_TYPES.CANCEL));
  };

  let resumeConversation = msg => {
    let response;
    let ids = tryToGetConversation(msg);
    if (!ids) {
      return;
    }
    let userId = ids.userId;
    let id = ids.id;
    response = manager.resumeConversation(userId, Number(id));
    msg.reply(createResponse(response, OPERATION_TYPES.RESUME));
  };

  robot.$.respond({
    verb: 'show',
    entity: 'conversation',
    shortDesc: `@${robot.name} admin show conversation [all|conversationId]`,
    integrationName: 'admin'
  }, showConversation);

  robot.$.respond({
    verb: 'cancel',
    entity: 'conversation',
    shortDesc: `@${robot.name} admin cancel conversation [all|conversationId]`,
    integrationName: 'admin'
  }, cancelConversation);

  robot.$.respond({
    verb: 'resume',
    entity: 'conversation',
    shortDesc: `@${robot.name} admin resume conversation [conversationId]`,
    integrationName: 'admin'
  }, resumeConversation);
};