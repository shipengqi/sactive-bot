const {CONVERSATION_STATUS} = require('./constants');
const {
  ADAPTER_MAPPINGS,
  HELP_WORDS
} = require('../const');
const {
  createSuccess,
  createWarning
} = require('./response_formatter');
const _ = require('lodash');
const moment = require('moment');
HELP_WORDS.push('enterprise');
class ConversationManager {
  /**
  * @constructs ConversationManager
  * @param {hubot.Robot} @robot - instance of hubot's `Robot`.
  * @param {string} type - type for conversation manage.
  */
  constructor(robot, type) {
    this.robot = robot;
    this.type = type || 'user';
    this.conversationMappings = {};
  }

  /**
  * Add a new conversation.
  * @param {object} conversation - a new conversation.
  * @returns {object} Returns the conversation.
  */
  addConversation(conversation) {
    let response;
    let receiverUserId = conversation.receiverUserId;
    let options = {
      single: true
    };
    this.pauseConversations(receiverUserId);
    this.robot.logger.info(`Add new conversation ID: ${conversation.id}, name: ${conversation.name}`);
    this.conversationMappings[conversation.id] = conversation;

    conversation.on('end', final => {
      this.robot.logger.info(`Conversation ID: ${conversation.id} end`);
      this.robot.logger.debug(final);
      response = this.cancelConversation(receiverUserId, conversation.id, options);
      response = response.replace(response.split('\n')[0], '');
      if (response.includes('There is no active conversation')) {
        return;
      }
      setTimeout(() => {
        conversation.msg.send(createSuccess(this.robot, response, conversation.msg));
      }, 1000);
    });

    conversation.on('expired', () => {
      this.robot.logger.warning(`Conversation ID: ${conversation.id} expired`);
      response = `Conversation ID: ${conversation.id}. \nConversation \`${conversation.name}\` expired.`;
      this.cancelConversation(receiverUserId, conversation.id, options);
      conversation.msg.send(createWarning(this.robot, response, conversation.msg));
    });

    conversation.on('close', () => {
      this.robot.logger.info(`Conversation ID: ${conversation.id} close`);
      this.cancelConversation(receiverUserId, conversation.id, options);
    });

    return conversation;
  }

  /**
  * Resume a conversation.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  * @param {string} conversationId - conversation id.
  */
  resumeConversation(receiverUserId, conversationId) {
    let conversation = this.conversationMappings[conversationId];
    if (!conversation) {
      return `Cannot find conversation ID: ${conversationId}.`;
    }
    let conversationName = conversation.name;
    let lastQuestion = '';
    let lastReply = '';
    this.robot.logger.info(`Resume conversation ID: ${conversationId}, name: ${conversationName}`);
    if (!this._verifyPermission(receiverUserId, conversationId)) {
      return `Conversation: \`${conversationName}\` is not created by ID: ${receiverUserId}`;
    }
    this.pauseConversations(receiverUserId);
    this.conversationMappings[conversationId].resume();
    if (conversation.lastQuestion) {
      lastQuestion = conversation.lastQuestion;
    }
    if (conversation.lastReply) {
      lastReply = `\n**Last reply:** ${conversation.lastReply}`;
    }
    return `Resume conversation \`${conversationName}\` ID: ${conversationId} successfully. \n**Last question:** ${lastQuestion} ${lastReply}`;
  }

  /**
  * Pause a conversation.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  * @param {string} conversationId - conversation id.
  */
  pauseConversation(receiverUserId, conversationId) {
    let conversation = this.conversationMappings[conversationId];
    if (!conversation) {
      return `Cannot find conversation ID: ${conversationId}.`;
    }
    let conversationName = conversation.name;
    this.robot.logger.info(`Pause conversation ID: ${conversationId}, name: ${conversationName}`);
    if (!this._verifyPermission(receiverUserId, conversationId)) {
      return `Conversation: \`${conversationName}\` is not created by ID: ${receiverUserId}.`;
    }
    if (conversation.status === CONVERSATION_STATUS.PAUSED) {
      return `Conversation: \`${conversationName}\` has already be paused.`;
    }
    this.conversationMappings[conversationId].pause();
  }

  /**
  * Pause all conversations.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  */
  pauseConversations(receiverUserId) {
    this.robot.logger.info(`Pause all conversations of talk id: ${receiverUserId}`);
    let results = [];
    for (let id in this.conversationMappings) {
      let conversation = this.conversationMappings[id];
      if (conversation.receiverUserId === receiverUserId) {
        results.push(this.pauseConversation(receiverUserId, id));
      }
    }
    return results;
  }

  /**
  * Get all conversations.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  * @returns {array} Returns the conversations array.
  */
  getConversations(receiverUserId) {
    this.robot.logger.info(`Show all conversations of talk id: ${receiverUserId}`);
    let results = [];
    for (let id in this.conversationMappings) {
      let conversation = this.conversationMappings[id];
      if (conversation.receiverUserId === receiverUserId) {
        let result = this.getConversation(receiverUserId, id);
        results.push(result);
      }
    }
    return results;
  }

  /**
  * Get a conversation.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  * @param {string} conversationId - conversation id.
  * @returns {object} Returns the conversation.
  */
  getConversation(receiverUserId, conversationId) {
    let conversation = this.conversationMappings[conversationId];
    if (!conversation) {
      return `Cannot find conversation ID: ${conversationId}.`;
    }
    let conversationName = conversation.name;
    this.robot.logger.info(`Show conversation ID: ${conversationId}, name: ${conversationName}`);
    if (!this._verifyPermission(receiverUserId, conversationId)) {
      return `Conversation: \`${conversationName}\` is not created by ID: ${receiverUserId}.`;
    }
    return {
      id: conversation.id,
      name: conversationName,
      status: conversation.status,
      startTime: conversation.startTime,
      allAnswers: conversation.allAnswers,
      lastQuestion: conversation.lastQuestion
    };
  }

  /**
  * Cancel a conversation.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  * @param {string} conversationId - conversation id.
  * @param {object} options - cancel single.
  */
  cancelConversation(receiverUserId, conversationId, options) {
    let conversation = this.conversationMappings[conversationId];
    if (!conversation) {
      return `Cannot find conversation ID: ${conversationId}.`;
    }
    let conversationStatus = conversation.status;
    let conversationName = conversation.name;
    let resumeRes = '';
    this.robot.logger.info(`Cancel conversation ID: ${conversationId}, name: ${conversationName}`);
    if (!this._verifyPermission(receiverUserId, conversationId)) {
      return `Conversation: \`${conversationName}\` is not created by ID: ${receiverUserId}.`;
    }
    this.conversationMappings[conversationId]._clearConversationExpireTime();
    delete this.conversationMappings[conversationId];
    if (options && options.single && (conversationStatus === CONVERSATION_STATUS.ACTIVE)) {
      let lineBreak = '\n';
      let lastPendingConversation = this._getLastPendingConversation(receiverUserId);
      if (lastPendingConversation && lastPendingConversation.id) {
        resumeRes = this.resumeConversation(receiverUserId, lastPendingConversation.id);
        resumeRes = lineBreak + resumeRes;
      } else {
        resumeRes = lineBreak + 'There is no active conversation.';
      }
    }
    return `Cancel conversation \`${conversationName}\` ID: ${conversationId} successfully. ${resumeRes}`;
  }

  _getLastPendingConversation(receiverUserId) {
    return _
      .chain(this.conversationMappings)
      .values()
      .filter(item => (item.status === CONVERSATION_STATUS.PAUSED) && (item.receiverUserId === receiverUserId))
      .sortBy('pauseTime')
      .last()
      .value();
  }

  /**
  * Cancel all conversations.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  */
  cancelConversations(receiverUserId) {
    this.robot.logger.info(`Cancel all conversations of talk id: ${receiverUserId}`);
    let results = [];
    for (let id in this.conversationMappings) {
      let conversation = this.conversationMappings[id];
      if (conversation.receiverUserId === receiverUserId) {
        let result = this.cancelConversation(receiverUserId, id);
        results.push(result);
      }
    }
    return results.join('\n');
  }

  /**
  * Get current active conversation.
  * @param {string} receiverUserId - `userId&roomId` or roomId.
  */
  getCurrentConversation(receiverUserId) {
    this.robot.logger.info(`Try to get current active conversation Of talk id: ${receiverUserId}`);
    for (let key in this.conversationMappings) {
      let value = this.conversationMappings[key];
      if ((value.receiverUserId === receiverUserId) && (value.status === CONVERSATION_STATUS.ACTIVE)) {
        return value;
      }
    }
    return null;
  }

  /**
  * Exists conversations.
  * @param {object} msg - the current context.
  */
  existsConversation(msg) {
    let receiverUserId = this.getId(msg);
    this.robot.logger.info(`Try to get exists conversation Of talk id: ${receiverUserId}`);
    for (let key in this.conversationMappings) {
      let value = this.conversationMappings[key];
      if (value.receiverUserId === receiverUserId) {
        return true;
      }
    }
    this.robot.logger.info(`There is no conversation Of talk id: ${receiverUserId}`);
    return false;
  }

  getId(msg) {
    let roomId = msg.room;
    let userId = '';
    if (ADAPTER_MAPPINGS.get(this.robot.adapterName) === 'msteams') {
      if (roomId.startsWith('19:')) {
        roomId = roomId.substr(3).split('@')[0];
      }
    }
    if (msg.user) {
      userId = msg.user.id;
    }

    return this.type === 'user' ? `${userId}&${roomId}` : roomId;
  }

  _cleanUp() {
    for (let id in this.conversationMappings) {
      let conversation = this.conversationMappings[id];
      this.cancelConversation(conversation.receiverUserId, id);
    }
  }
  _stripBotName(text) {
    let match = text.match(new RegExp(`^(@?(?:${this.robot.name}|${this.robot.alias}):?)?(.*)`, 'i'));
    return match[2].trim();
  }

  _verifyPermission(receiverUserId, conversationId) {
    if (receiverUserId !== this.conversationMappings[conversationId].receiverUserId) {
      return false;
    }
    return true;
  }
}

module.exports = ConversationManager;
