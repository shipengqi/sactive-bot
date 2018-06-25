const _ = require('lodash');
const ConversationSchema = require('./conversation_schema');
const ConversationManager = require('./conversation_manager');
const Conversation = require('./conversation');

class Dialog {
  /*
  * @constructs Dialog
  * @param {hubot.Robot} @robot - instance of hubot's `Robot`.
  * @param {string} type - type for conversation manage.
  * */
  constructor(robot, type) {
    this.robot = robot;
    this.type = type || 'user';
    this.conversationManage = new ConversationManager(this.robot, this.type);
  }

  /*
  * Init conversation schema.
  * @param {string} name - schema name.
  * @param {object} schema - schema object.
  * @returns {object} Returns the conversation schema.
  * */
  initSchema(name, schema) {
    let conversationSchema = new ConversationSchema(this.robot, name, schema);
    conversationSchema.init();
    return conversationSchema;
  }

  /*
  * Start a dialog.
  * @param {object} msg - the current response.
  * @param {string} conversationName - conversation name.
  * @param {object} schema - schema object.
  * @param {number} expireTime - expire time.
  * @returns {object} Returns a new conversation.
  * */
  startDialog(msg, conversationName, schema, integrationName, expireTime) {
    let receiverUserId = this.conversationManage.getId(msg.message);
    let conversation = new Conversation(this.robot, msg, receiverUserId, conversationName, schema, integrationName, expireTime);
    if (schema && schema.schema.type === 'nlu' && msg.message.rasaEntities) {
      let answers = msg.message.rasaEntities;
      let steps = [];
      _.forEach(schema.steps, value => {
        if (answers[value.entityName]) {
          value.isObtain = true;
          conversation.updateAnswers(answers[value.entityName]['value'], value.entityName);
        } else {
          steps.push(value);
        }
      });
      schema.steps = steps;
      conversation.conversationSchema = schema;
    }
    this.conversationManage.addConversation(conversation);
    conversation.start(msg);
    return conversation;
  }
}

module.exports = Dialog;
