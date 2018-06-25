const {UnifiedAdapter} = require('../unified_adapter');
const hubot_slack = require('hubot-slack');
const SlackWebClient = require('@slack/client').WebClient;
const logger = require('winston');
const UnifiedFormatter = require('../unified_formatter');
const Path = require('path');
const fs = require('fs');
const moment = require('moment');
const request = require('request');
const slackUtils = require('./slack_utils');
const Dust = require('dustjs-helpers');

// Load special filters for slack textual UnifiedResponseRender views.
Dust.filters.slackify = slackUtils.slackifyText;

class UnifiedSlackAdapterImpl extends UnifiedAdapter {
  /**
   * Extends the `UnifiedAdapter` for Hubot Enterprise to support Slack platform.
   * @constructs UnifiedSlackAdapterImpl
   * @augments UnifiedAdapter
   * @private
   * @param {hubot.Robot} @robot - instance of hubot's `Robot`.
   * @param {Object} @options - Configuration options for the `Robot`.
   */
  constructor(robot, options) {
    // Enforce interface
    let configFilePath = Path.join(__dirname, './unified.yml');
    super(robot, configFilePath);
    this.options = options;
    this._formatChannelObject = this._formatChannelObject.bind(this);
    this._formatChannelMessageObject = this._formatChannelMessageObject.bind(this);
    this._formatPrivateChannelMessageObject = this._formatPrivateChannelMessageObject.bind(this);
    this._formatPrivateChannelObject = this._formatPrivateChannelObject.bind(this);

    logger.setLevels(logger.config.syslog.levels);

    // hubot-slack will default to use process.env.HUBOT_SLACK_TOKEN
    if (this.options.bot_token) {
      this.he_adapter = hubot_slack.use(this.robot);
      this.slack_web_client = this.he_adapter.client.web;
      this.slack_bot_web_client = this.he_adapter.client.web;
    } else {
      logger.warning('No bot token found, slack bot (rtm) not set');
    }

    // If there is a slack api token, we will use the slack nodejs SDK
    // instead to perform API calls
    // since it provides more scopes (typically)
    if (this.options.api_token) {
      logger.info('Using external slack client to perform API calls.');
      this.slack_web_client = new SlackWebClient(this.options.api_token);
      if (!this.slack_bot_web_client) {
        this.slack_bot_web_client = this.slack_web_client;
      }
    } else {
      // Otherwise, default to the hubot-slack client which will probably
      // have errors scoping / being authorized for some API calls.
      logger.warning('Using hubot-slack web client to perform API calls.');
    }

    // Shortcuts
    this.channels = this.slack_web_client.channels;
    this.users = this.slack_web_client.users;
    this.pins = this.slack_web_client.pins;
    this.groups = this.slack_web_client.groups;
    this.chat = this.slack_bot_web_client.chat;
    this.team = this.slack_web_client.team;
    this.files = this.slack_web_client.files;
    this.im = this.slack_bot_web_client.im;

    // Only when adapter is needed
    if (this.he_adapter) {
      this.he_adapter.once('connected', () => {
        return this.emit('connected');
      });
    }
  }

  // Adapter methods to extend Hubot / Hubot Enterprise UnifiedAdapter class

  /**
   * Runs / initializes a Slack adapter.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  _run() {
    return this.he_adapter.run();
  }

  /**
   * Sends one or more messages to the current Slack channel.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.reply()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  _reply(envelope, ...messages) {
    return this.he_adapter.reply(envelope, ...Array.from(messages));
  }

  /**
   * Sends one or more emoticon messages to a Slack channel.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.send()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  _send(envelope, ...messages) {
    return this.he_adapter.send(envelope, ...Array.from(messages));
  }

  /**
   * Sends one or more emoticon messages to Hubot. Defaults to `send()` behavior.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.emote()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  // TODO: consider deprecating
  _emote(envelope, ...messages) {
    return this.he_adapter.emote(envelope, ...Array.from(messages));
  }

  /**
   * Sets the topic of a Slack channel.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.topic()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  _topic(envelope, ...strings) {
    return this.he_adapter.setTopic(envelope, strings);
  }

  /**
   * Closes the client connections to Slack.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [hubot slack adapter repo]{@link https://github.com/slackapi/hubot-slack}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.close()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {undefined}
   */
  _close() {
    return this.he_adapter.close();
  }

  // Chat Platform commands

  // ########################################################################
  // Channels
  /**
   * Archives a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.archive}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.archive#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.archive#errors) upon rejection.
   */
  _archiveChannel(channel_id) {
    return this.channels.archive(channel_id);
  }

  /**
   * Creates a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.create}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.createChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.create#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.create#errors) upon rejection.
   */
  _createChannel(channel_name) {
    return this.channels.create(channel_name);
  }

  /**
   * Retrieves the channel message history from the chat platform.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.history}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getChannelMessages()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - the unique id of the desired channel.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.history#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.history#errors) upon rejection.
   */
  _getChannelMessages(channel_id, options) {
    return this.channels.history(channel_id, options)
      .then(resp => Promise.resolve(resp.messages));
  }

  /**
   * Gets all the channels for the given team.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.list}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getChannels()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.list#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.list#errors) upon rejection.
   */
  _getChannels(options) {
    return this.channels.list(options)
      .then(resp => Promise.resolve(resp.channels));
  }

  /**
   * Invites a user to a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.invite}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.inviteUserToChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} user_id - The unique id of the user you want to invite.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.invite#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.invite#errors) upon rejection.
   */
  _inviteUserToChannel(channel_id, user_id) {
    return this.channels.invite(channel_id, user_id);
  }

  /**
   * Set the purpose (text) of a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.purpose}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setChannelPurpose()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} purpose - A text describing the purpose of the given channel.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.purpose#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.purpose#errors) upon rejection.
   */
  _setChannelPurpose(channel_id, purpose) {
    return this.channels.setPurpose(channel_id, purpose)
      .then(resp => Promise.resolve(resp.purpose));
  }

  /**
   * Set the topic (text) of a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/channels.topic}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setChannelTopic()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} topic - A text describing the topic of the given channel.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/channels.topic#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/channels.topic#errors) upon rejection.
   */
  _setChannelTopic(channel_id, topic) {
    return this.channels.setTopic(channel_id, topic)
      .then(resp => Promise.resolve(resp.topic));
  }

  // ########################################################################
  // Users

  /**
   * Get all users of a teams.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/users.list}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getUsers()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/users.list#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/users.list#errors) upon rejection.
   */
  _getUsers(options) {
    return this.users.list(options)
      .then(resp => Promise.resolve(resp.members));
  }

  // ########################################################################
  // Pins

  /**
   * Pin a message in a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/pins.create}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.pinMessage()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/pins.create#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/pins.create#errors) upon rejection.
   */
  _pinMessage(channel_id, options) {
    return this.pins.add(channel_id, options);
  }

  // ########################################################################
  // Groups

  /**
   * Archives a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.archive}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.archivePrivateChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.archive#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.archive#errors) upon rejection.
   */
  _archivePrivateChannel(channel_id) {
    return this.groups.archive(channel_id);
  }

  /**
   * Closes a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.close}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.closePrivateChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.close#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.close#errors) upon rejection.
   */
  _closePrivateChannel(channel_id) {
    return this.groups.close(channel_id);
  }

  /**
   * Creates a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.create}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.createPrivateChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_name - the desired private channel name (without # prefix)
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.create#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.create#errors) upon rejection.
   */
  _createPrivateChannel(channel_name, options) {
    return this.groups.create(channel_name, options);
  }

  /**
   * Retrieves the private channel message history from the chat platform.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.history}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getPrivateChannelMessages()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.history#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.history#errors) upon rejection.
   */
  _getPrivateChannelMessages(channel_id, options) {
    return this.groups.history(channel_id, options)
      .then(resp => Promise.resolve(resp.messages));
  }

  /**
   * Invites a user to a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.invite}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.inviteUserToPrivateChannel()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} user_id - The unique id of the user you want to invite.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.invite#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.history#errors) upon rejection.
   */
  _inviteUserToPrivateChannel(channel_id, user_id) {
    return this.groups.invite(channel_id, user_id);
  }

  /**
   * Set the purpose (text) of a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.purpose}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelPurpose()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} purpose - A text describing the purpose of the given channel.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.purpose#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.purpose#errors) upon rejection.
   */
  _setPrivateChannelPurpose(channel_id, purpose) {
    return this.groups.setPurpose(channel_id, purpose)
      .then(resp => Promise.resolve(resp.purpose));
  }

  /**
   * Set the topic (text) of a private channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.topic}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelTopic()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @param {string} topic - A text describing the topic of the given channel.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.topic#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.topic#errors) upon rejection.
   */
  _setPrivateChannelTopic(channel_id, topic) {
    return this.groups.setTopic(channel_id, topic)
      .then(resp => Promise.resolve(resp.topic));
  }

  /**
   * Gets all the private channels for the given team.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/groups.list}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getPrivateChannels()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/groups.list#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/groups.list#errors) upon rejection.
   */
  _getPrivateChannels(options) {
    return this.groups.list(options)
      .then(resp => Promise.resolve(resp.groups));
  }

  /**
   * Gets all im channels that the user has.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/im.list}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getInstantMessageChannels()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/im.list#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/im.list#errors) upon rejection.
   */
  _getInstantMessageChannels(options) {
    return this.im.list(options)
      .then(resp => Promise.resolve(resp.ims));
  }

  /**
   * Gets all im channels that the user has.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/im.open}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getInstantMessageChannels()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/im.open#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/im.open#errors) upon rejection.
   */
  _createInstantMessageChannel(userId) {
    return this.im.open(userId)
      .then(resp => Promise.resolve(resp));
  }

  // Chat

  /**
   * Post / send a new message to a channel.
   * For more information go to the following links:
   * * [hubot-slack adapter]{@link https://slackapi.github.io/hubot-slack/}.
   * * [Slack (official) web API]{@link https://api.slack.com/methods/chat.postMessage}
   * * [Slack (official) javascript SDK]{@link https://slackapi.github.io/node-slack-sdk/}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.postMessage()`.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the public / private channel in the chat platform.
   * @param {string} message - The message to be sent
   * @param {Object} options - options for the message.
   * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
   * Upon resolve it will return a `JSON` response `Object` similar to [this]{@link https://api.slack.com/methods/chat.postMessage#response} or a `SlackAPIError` similar to [this](https://api.slack.com/methods/chat.postMessage#errors) upon rejection.
   */
  _postMessage(channelId, message, options) {
    const processMessage = (channelId, msg, opts) => {
      return new Promise((resolve, reject) => {
        if (msg instanceof this.UnifiedResponseRenderer.Message) {
          return this.UnifiedResponseRenderer.private.UnifiedResponseRenderer.render(msg)
            .then(resp => {
              msg = resp.text;
              opts = {attachments: resp.attachments};
              return this.chat.postMessage(channelId, msg, opts)
                .then(resp => resolve(resp.message)).catch(e => reject(e));
            });
        } else {
          return this.chat.postMessage(channelId, msg, opts)
            .then(resp => resolve(resp.message)).catch(e => reject(e));
        }
      });
    };

    if (channelId && (channelId.charAt(0) === 'D')) {
      return this._getInstantMessageChannels()
        .then(imList => {
          let directChannelIsExist = false;
          for (let i = 0; i < imList.length; i ++) {
            let item = imList[i];
            if (item.id === channelId) {
              directChannelIsExist = true;
              break;
            }
          }
          if (directChannelIsExist) {
            return processMessage(channelId, message, options);
          } else {
            return this._createInstantMessageChannel(options.userId)
              .then(channel => {
                return processMessage(channel.id, message, options);
              });
          }
        }).catch(e => Promise.reject(e));
    } else {
      return processMessage(channelId, message, options);
    }
  }

  /**
   * Converts a Slack message `Object` into a _unified / standardized_ `Message` object.
   * For more information go to the following links:
   * * [`Message` return object]{@link Message}
   * * [`UnifiedFormatter` class]{@link UnifiedFormatter}
   * * [`UnifiedFormatter.Message` namespace]{@link UnifiedFormatter.Message}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatMessageObject(rawMessage) {
    return UnifiedFormatter.Message.create(
      rawMessage.text,
      rawMessage.user || rawMessage.bot_id,
      rawMessage.ts,
      rawMessage.type,
      moment.utc(moment.unix(Number(rawMessage.ts))).format(),
      rawMessage.subtype,
      rawMessage.reactions,
      rawMessage.attachments,
      rawMessage
    );
  }

  /**
   * Converts a Slack message `Object` into a _unified / standardized_ `Message` object.
   * For more information go to the following links:
   * * [`Message` return object]{@link Message}
   * * [`UnifiedFormatter` class]{@link UnifiedFormatter}
   * * [`UnifiedFormatter.Message` namespace]{@link UnifiedFormatter.Message}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatChannelMessageObject(rawMessage) {
    return this._formatMessageObject(rawMessage);
  }

  /**
   * Converts a Slack channel `Object` into a _unified / standardized_ `Channel` object.
   * For more information go to the following links:
   * * [`Channel` return object]{@link Channel}
   * * [`UnifiedFormatter` class]{@link UnifiedFormatter}
   * * [`UnifiedFormatter.Channel` namespace]{@link UnifiedFormatter.Channel}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawChannel - A channel object returned by the chat platform.
   * @returns {Channel} The formatted channel object given the inputs provided.
   */
  _formatChannelObject(rawChannel) {
    return UnifiedFormatter.Channel.create(
      rawChannel.name,
      rawChannel.id,
      rawChannel.type || 'unified_channel',
      `${rawChannel.created}`,
      `${rawChannel.lastRead}` || `${rawChannel.created}`,
      rawChannel.members,
      rawChannel.creator,
      rawChannel.unreadCount,
      rawChannel.isArchived,
      rawChannel.topic.value,
      rawChannel.purpose.value,
      // TODO: implement pre-fetching teaminfo
      this.teamInfo ? this.teamInfo.id : 'N/A',
      rawChannel.previousNames,
      rawChannel
    );
  }

  /**
   * Stub for `_formatChannelMessageObject()`
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatPrivateChannelMessageObject(rawMessage) {
    return this._formatMessageObject(rawMessage);
  }

  /**
   * Converts a Slack _private_ channel `Object` into a _unified / standardized_ `Channel` object.
   * For more information go to the following links:
   * * [`Channel` return object]{@link Channel}
   * * [`UnifiedFormatter` class]{@link UnifiedFormatter}
   * * [`UnifiedFormatter.Channel` namespace]{@link UnifiedFormatter.Channel}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawChannel - A channel object returned by the chat platform.
   * @returns {Channel} The formatted channel object given the inputs provided.
   */
  _formatPrivateChannelObject(rawChannel) {
    return UnifiedFormatter.PrivateChannel.create(
      rawChannel.name,
      rawChannel.id,
      rawChannel.type || 'unified_private_channel',
      `${rawChannel.created}`,
      `${rawChannel.lastRead}` || `${rawChannel.created}`,
      rawChannel.members,
      rawChannel.creator,
      rawChannel.unreadCount,
      rawChannel.isArchived,
      rawChannel.topic.value,
      rawChannel.purpose.value,
      // TODO: implement pre-fetching teaminfo
      this.teamInfo ? this.teamInfo.id : 'N/A',
      rawChannel.previousNames,
      rawChannel
    );
  }

  /**
   * Converts a Slack user `Object` into a _unified / standardized_ `User` object.
   * For more information go to the following links:
   * * [`User` return object]{@link User}
   * * [`UnifiedFormatter` class]{@link UnifiedFormatter}
   * * [`UnifiedFormatter.User` namespace]{@link UnifiedFormatter.User}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` in several API public methods
   *   in order to convert chat platform response objects into _unified / standardized_ objects.
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {Object} rawUser - A user object returned by the chat platform.
   * @returns {Channel} The formatted user object given the inputs provided.
   */
  _formatUserObject(rawUser) {
    return UnifiedFormatter.User.create(
      rawUser.name,
      rawUser.id,
      rawUser.team_id,
      rawUser.profile.email || null,
      rawUser.deleted,
      rawUser.is_bot,
      rawUser.profile
    );
  }

  /**
   * upload attachments.
   * For more information go to the following links:
   * * [Slack (official) web API]{@link https://api.slack.com/methods/files.upload}
   *
   * @private
   * @memberof UnifiedSlackAdapterImpl
   * @param {string} channel_id - The unique id of the public / private channel in the chat platform.
   * @param {string} dirPath - file absolute path.
   * @returns Returns a `Promise`.
   */
  _uploadFile(channelId, dirPath) {
    return new Promise((resolve, reject) => {
      let fileName = Path.basename(dirPath);
      let options = {
        method: 'post',
        url: 'https://slack.com/api/files.upload',
        formData: {
          token: this.options.bot_token,
          file: fs.createReadStream(dirPath),
          channels: channelId,
          filename: fileName
        }
      };
      return request(options, (err, res, body) => {
        if (err) {
          logger.error(err);
          return reject(err);
        } else {
          return resolve(body);
        }
      });
    });
  }
}

exports.use = robot => {
  // TODO: these options should be passed / configurable.
  let options = {
    bot_token: process.env.HUBOT_SLACK_TOKEN,
    api_token: process.env.HUBOT_SLACK_API_TOKEN,
    logger: logger,
    logLevel: process.env.LOG_LEVEL || 'debug'
  };
  return new UnifiedSlackAdapterImpl(robot, options);
};
