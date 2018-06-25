const {UnifiedAdapter} = require('../unified_adapter');
const hubot_mattermost = require('hubot-matteruser');
const UnifiedFormatter = require('../unified_formatter');
const Path = require('path');
const fs = require('fs');
const moment = require('moment');
require('./mattermost-client');
const logger = require('winston');
const uuid = require('uuid');
const strings = {
  CHANNEL_CREATED: 'Channel created',
  SUCCESS: 'Success!',
  PURPOSE_CHANGED: 'Purpose changed successfully',
  TOPIC_CHANGED: 'Topic changed successfully',
  ERROR_PINS: 'No such thing as \'pins\' in mattermost',
  ERROR_CREATE_CHANNEL: 'Failed to create channel',
  ERROR_GET_HISTORY: 'Error getting history:',
  GOT_HISTORY: 'Got history',
  ERROR_LIST_CHANNELS: 'Failed to fetch channels:',
  GOT_CHANNELS: 'Got channels:',
  ERROR_INVITE_USER: 'Error inviting user to channel',
  ERROR_SETTING_TOPIC: 'Error setting a channel topic',
  ERROR_DELETING_CHANNEL: 'Error deleting channel',
  ERROR_SETTING_CHANNEL_PURPOSE: 'Error setting channel purpose',
  ERROR_FETCHING_USERS: 'Failed to fetch users:',
  PUBLIC_CHANNEL_TYPE: 'O',
  PRIVATE_CHANNEL_TYPE: 'P',
  SUCCESSFULLY_POSTED_MSG: 'successfully posted message',
  ERROR_POSTING_MSG_TIMEOUT: 'timeout posting message',
  ERROR_CHANNEL_NOT_FOUND: 'Channel not found'
};

const {mmifyText} = require('./mattermost_utils');
const Dust = require('dustjs-helpers');

// Load special filters for mattermost textual UnifiedResponseRender views.
Dust.filters.mmify = mmifyText;

class UnifiedMattermostAdapterImpl extends UnifiedAdapter {
  /**
   * Extends the `UnifiedAdapter` for Hubot Enterprise to support the **Mattermost** platform.
   * @constructs UnifiedMattermostAdapterImpl
   * @augments UnifiedAdapter
   * @private
   * @param {hubot.Robot} @robot - instance of hubot's `Robot`.
   * @param {Object} @options - configuration options for the `Robot`. None for mattermost.
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

    this.he_adapter = hubot_mattermost.use(this.robot);
    this.he_adapter.logger = logger;

    // Only when adapter is needed
    if (this.he_adapter) {
      this.he_adapter.once('connected', () => {
        this.client = this.he_adapter.client;
        this.client.logger = logger;
        return this.emit('connected');
      });
    } else {
      logger.error('No @he_adapter defined.');
    }
  }

  // Adapter methods to extend Hubot / Hubot Enterprise UnifiedAdapter class

  /**
   * Runs / initializes a Mattermost adapter.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  _run() {
    return this.he_adapter.run();
  }

  /**
   * Sends one or more messages to the current Mattermost channel.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  _reply(envelope, ...messages) {
    return this.he_adapter.reply(envelope, ...Array.from(messages));
  }

  /**
   * Sends one or more emoticon messages to a Mattermost channel.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  _send(envelope, ...messages) {
    return this.he_adapter.send(envelope, ...Array.from(messages));
  }

  /**
   * Sends one or more emoticon messages to Hubot. Defaults to `send()` behavior.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  // TODO: consider deprecating
  _emote(envelope, ...messages) {
    return this.he_adapter.emote(envelope, ...Array.from(messages));
  }

  /**
   * Closes the client connections to Mattermost.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  _close() {
    return this.he_adapter.close();
  }

  /**
   * Sets the topic of a Mattermost channel.
   * It will create all necessary client connections to the chat platform.
   * For more information go to the following links:
   * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {undefined}
   */
  _topic(envelope, ...strings) {
    return this.he_adapter.setTopic(envelope, strings);
  }

  // Chat Platform commands

  // ########################################################################
  // Channels

  /**
   * Archives a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _archiveChannel(channel_id) {
    return new Promise((resolve, reject) => {
      return this._deleteChannel(channel_id)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }
  /**
   * Creates a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.createChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _createChannel(channel_name, channel_type = null) {
    return new Promise((resolve, reject) => {
      let type;
      let team_id = this.client.teamID;
      let purpose = '';
      if (channel_type) {
        type = channel_type;
      } else {
        type = 'O';
      }
      let command = '/channels';
      let request_type = 'POST';
      let header = '';
      let options = {team_id: team_id, name: channel_name, display_name: channel_name, purpose: purpose, header: header, type: type};

      // api call to create the channel
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_CREATE_CHANNEL + ` ${channel_name}`);
          logger.debug(Object(data));
          return reject(data.error);
        } else {
          return resolve(strings.CHANNEL_CREATED);
        }
      });
    });
  }

  /**
   * Retrieves the channel message history from the chat platform.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/posts}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getChannelMessages()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - the unique id of the desired channel.
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/posts):
   * ```json
   * [
   *    {
    *      "id": "1jzigxmu8iyp3emgzqew699n1a",
    *      "create_at": 1490803309526,
    *      "update_at": 1490803309526,
    *      "delete_at": 0,
    *      "user_id": "q8d6y8m53jyx9rhb164nqhj6pc",
    *      "channel_id": "qqbrykzyatrrtbwhoyctmwug4r",
    *      "root_id": "",
    *      "parent_id": "",
    *      "original_id": "",
    *      "message": "hubot2 added to the channel by hubot",
    *      "type": "system_add_remove",
    *      "props": {},
    *      "hashtags": "",
    *      "pending_post_id": ""
    *    },
   *    {
    *      "id": "1ksuejwtkiy6fb7tnwzd4z165o",
    *      "create_at": 1490814629050,
    *      "update_at": 1490814629050,
    *      "delete_at": 0,
    *      "user_id": "q8d6y8m53jyx9rhb164nqhj6pc",
    *      "channel_id": "qqbrykzyatrrtbwhoyctmwug4r",
    *      "root_id": "",
    *      "parent_id": "",
    *      "original_id": "",
    *      "message": "hubot updated the channel display name from: channel_1 to: ",
    *      "type": "system_displayname_change",
    *      "props": {
    *        "new_displayname": "",
    *        "old_displayname": "channel_1"
    *      },
    *      "hashtags": "",
    *      "pending_post_id": ""
    *    }
   *  ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getChannelMessages(channel_id, options) {
    return new Promise((resolve, reject) => {
      let request_type = 'GET';
      let command = `/channels/${channel_id}/posts`;
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_GET_HISTORY);
          logger.debug(Object(data.error));
          // force authorization errors to become "not found" errors
          // this is needed because mattermost returns authorization errors on both
          // instances and it was decided that the message displayed should be "not found"
          if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
            return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
          } else {
            return reject(new Error(JSON.parse(data.error.message).error_message));
          }
        } else {
          logger.debug(strings.GOT_HISTORY);
          logger.debug(Object(data));
          // need the design of HOW the history will be returned
          let messages = [];
          for (let id of Array.from(data.order)) {
            messages.push(data.posts[id]);
          }
          return resolve(messages);
        }
      });
    });
  }

  /**
   * Gets both public and private channels for a team.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `_getChannels()` and `_getPrivateChannels()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget):
   * ```json
   * [
   *  {
    *    "id": "qqbrykzyatrrtbwhoyctmwug4r",
    *    "create_at": 1490725642985,
    *    "update_at": 1490815259843,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel_1",
    *    "name": "channel_1",
    *    "header": "generic topic",
    *    "purpose": "",
    *    "last_post_at": 1490815259888,
    *    "total_msg_count": 87,
    *    "extra_update_at": 1490726243020,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  },
   *  {
    *    "id": "f9dqc4d4fif6d8ceq3o3ijw8ow",
    *    "create_at": 1490725733905,
    *    "update_at": 1490725733905,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel1000",
    *    "name": "channel1000",
    *    "header": "",
    *    "purpose": "",
    *    "last_post_at": 0,
    *    "total_msg_count": 0,
    *    "extra_update_at": 1490725733933,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  }
   * ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getAllChannels(options) {
    return new Promise((resolve, reject) => {
      let team_id = this.client.teamID;
      let user_id = this.client.self.id;
      let request_type = 'GET';
      let command = `/users/${user_id}/teams/${team_id}/channels`;
      options = {};// no options
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_LIST_CHANNELS);
          logger.debug(Object(data));
          logger.debug(Object(header));
          return reject(data.error);
        } else {
          logger.debug(strings.GOT_CHANNELS);
          logger.debug(Object(data));
          return resolve(data);
        }
      });
    });
  }

  /**
   * Gets all the channels for the given team.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getChannels()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget):
   * ```json
   * [
   *  {
    *    "id": "qqbrykzyatrrtbwhoyctmwug4r",
    *    "create_at": 1490725642985,
    *    "update_at": 1490815259843,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel_1",
    *    "name": "channel_1",
    *    "header": "generic topic",
    *    "purpose": "",
    *    "last_post_at": 1490815259888,
    *    "total_msg_count": 87,
    *    "extra_update_at": 1490726243020,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  },
   *  {
    *    "id": "f9dqc4d4fif6d8ceq3o3ijw8ow",
    *    "create_at": 1490725733905,
    *    "update_at": 1490725733905,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel1000",
    *    "name": "channel1000",
    *    "header": "",
    *    "purpose": "",
    *    "last_post_at": 0,
    *    "total_msg_count": 0,
    *    "extra_update_at": 1490725733933,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  }
   * ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getChannels(options) {
    return this._getAllChannels(options)
      .then(channels => {
        let publicChannels = [];
        for (let channel of Array.from(channels)) {
          if (channel.type === strings.PUBLIC_CHANNEL_TYPE) {
            publicChannels.push(channel);
          }
        }
        return Promise.resolve(publicChannels);
      });
  }

  /**
   * Invites a user to a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%7Bchannel_id%7D~1add%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.inviteUserToChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _inviteUserToChannel(channel_id, user_id) {
    return new Promise((resolve, reject) => {
      let request_type = 'POST';
      let command = `/channels/${channel_id}/members`;
      let options = {
        'channel_id': channel_id,
        'user_id': user_id,
        'roles': 'system_user',
        'last_viewed_at': 0,
        'msg_count': 0,
        'mention_count': 0,
        'notify_props': {},
        'last_update_at': 0
      };
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_INVITE_USER);
          logger.debug(Object(data));
          // force authorization errors to become "not found" errors
          // this is needed because mattermost returns authorization errors on both
          // instances and it was decided that the message displayed should be "not found"
          if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
            return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
          } else {
            return reject(new Error(JSON.parse(data.error.message).error_message));
          }
        } else {
          return resolve(strings.SUCCESS);
        }
      });
    });
  }

  /**
   * Set the purpose (text) of a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1update%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setChannelPurpose()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.PURPOSE_CHANGED`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _setChannelPurpose(channel_id, purpose) {
    return new Promise((resolve, reject) => {
      let request_type = 'PUT';
      let command = `/channels/${channel_id}`;
      return this._getChannelById(channel_id)
        .then(channel => {
          channel.purpose = purpose;
          let options = channel;
          return this.client._apiCall(request_type, command, options, (data, header) => {
            if (data.error) {
              logger.error(strings.ERROR_SETTING_CHANNEL_PURPOSE);
              logger.debug(Object(data));
              // force authorization errors to become "not found" errors
              // this is needed because mattermost returns authorization errors on both
              // instances and it was decided that the message displayed should be "not found"
              if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
                return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
              } else {
                return reject(new Error(JSON.parse(data.error.message).error_message));
              }
            } else {
              logger.debug(JSON.stringify(data, ' ', 2));
              return resolve(`${strings.PURPOSE_CHANGED} to ${purpose}`);
            }
          });
        })
        .catch(error => {
          return reject(error);
        });
    });
  }

  /**
   * Set the topic (text) of a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1update%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setChannelTopic()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return `strings.TOPIC_CHANGED`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _setChannelTopic(channel_id, topic) {
    return new Promise((resolve, reject) => {
      let team_id = this.client.teamID;
      let request_type = 'PUT';
      let command = `/channels/${channel_id}`;
      return this._getChannelById(channel_id)
        .then(channel => {
          channel.header = topic;
          let options = channel;
          return this.client._apiCall(request_type, command, options, (data, header) => {
            if (data.error) {
              logger.error(strings.ERROR_SETTING_TOPIC);
              logger.debug(Object(data.error));
              // force authorization errors to become "not found" errors
              // this is needed because mattermost returns authorization errors on both
              // instances and it was decided that the message displayed should be "not found"
              if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
                return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
              } else {
                return reject(new Error(JSON.parse(data.error.message).error_message));
              }
            } else {
              logger.debug(JSON.stringify(data, ' ', 2));
              return resolve(`${strings.TOPIC_CHANGED} to ${topic}`);
            }
          });
        })
        .catch(error => {
          return reject(error);
        });
    });
  }

  /**
   * Deletes a channel - Same behavior as archive channel
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by several `private` methods in this adapter class.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _deleteChannel(channel_id) {
    return new Promise((resolve, reject) => {
      let request_type = 'DELETE';
      let command = `/channels/${channel_id}`;
      // the options are empty, and thus no options
      let options = {};
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_DELETING_CHANNEL);
          logger.debug(Object(data.error.message));
          // force authorization errors to become "not found" errors
          // this is needed because mattermost returns authorization errors on both
          // instances and it was decided that the message displayed should be "not found"
          if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
            return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
          } else {
            return reject(new Error(JSON.parse(data.error.message).error_message));
          }
        } else {
          return resolve(strings.SUCCESS);
        }
      });
    });
  }

  /**
   * Get the `id` for a channel using its name.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1name~1%7Bchannel_name%7D%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This is a utility method used by other methods in this class.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Returns a `id` as a string similar to the ones in the official
   * mattermost api [docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1name~1%7Bchannel_name%7D%2Fget)
   *   {
   *     "id": "qqbrykzyatrrtbwhoyctmwug4r"
   *       ...
   *   }
   *
   */
  // TODO: currently not being used anywhere. Consider removing.
  _getChannelIdByName(channel_name) {
    return new Promise((resolve, reject) => {
      let team_id = this.client.teamID;
      let request_type = 'GET';
      let command = `/teams/${team_id}/channels/name/${channel_name}`;
      let options = {};
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          return reject(data.error);
        } else {
          return resolve(`${data.id}`);
        }
      });
    });
  }
  /**
   * Get information for a channel using its `id`.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%7Bchannel_id%7D%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This is a utility method used by other methods in this class.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {Promise.<Object|Error>} Returns a `Promise`.
   * Returns a channel object similar to the ones in the official
   * mattermost api [docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%7Bchannel_id%7D%2Fget)
   *   {
   *     "id": "p7hucjzzxjycfj1tocuy5ngcrc",
   *     "create_at": 1489680401371,
   *     "update_at": 1489680401467,
   *     "delete_at": 0,
   *     "username": "hubot2",
   *     "auth_data": "",
   *     "auth_service": "",
   *     "email": "hubot2@localhot",
   *     "nickname": "",
   *     "first_name": "",
   *     "last_name": "",
   *     "position": "",
   *     "roles": "system_user",
   *     "locale": "en"
   *   }
   *
   */
  _getChannelById(channel_id) {
    return new Promise((resolve, reject) => {
      let request_type = 'GET';
      let command = `/channels/${channel_id}?page=0`;
      let options = {};
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          // force authorization errors to become "not found" errors
          // this is needed because mattermost returns authorization errors on both
          // instances and it was decided that the message displayed should be "not found"
          if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
            return reject(new Error(strings.ERROR_CHANNEL_NOT_FOUND));
          } else {
            return reject(new Error(JSON.parse(data.error.message).error_message));
          }
        } else {
          return resolve(data);
        }
      });
    });
  }

  // ########################################################################
  // Users

  /**
   * Get the `id` for a user using its name.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/users%2Fpaths%2F~1users~1name~1%7Busername%7D%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This is a utility method used by other methods in this class.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Returns a `id` as a string similar to the ones in the official
   * mattermost api [docs](https://api.mattermost.com/#tag/users%2Fpaths%2F~1users~1name~1%7Busername%7D%2Fget)
   *   {
   *     "id": "p7hucjzzxjycfj1tocuy5ngcrc",
   *       ...
   *   }
   *
   */
  // TODO: currently not being used anywhere. Consider removing.
  _getUserIdByName(username) {
    return new Promise((resolve, reject) => {
      let request_type = 'GET';
      let command = `/users/username/${username}`;
      let options = {};
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          return reject(data.error);
        } else {
          return resolve(`${data.id}`);
        }
      });
    });
  }

  /**
   * Get all users of a teams.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/users%2Fpaths%2F~1users~1%7Boffset%7D~1%7Blimit%7D%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getUsers()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @returns {Promise.<Object|Error>} Returns a `Promise`.
   * Returns an array of user objects similar to the ones in the official
   * mattermost api [docs](https://api.mattermost.com/#tag/users%2Fpaths%2F~1users~1%7Boffset%7D~1%7Blimit%7D%2Fget)
   * [
   *   {
   *     "id": "p7hucjzzxjycfj1tocuy5ngcrc",
   *     "create_at": 1489680401371,
   *     "update_at": 1489680401467,
   *     "delete_at": 0,
   *     "username": "hubot2",
   *     "auth_data": "",
   *     "auth_service": "",
   *     "email": "hubot2@localhot",
   *     "nickname": "",
   *     "first_name": "",
   *     "last_name": "",
   *     "position": "",
   *     "roles": "system_user",
   *     "locale": "en"
   *   },
   *   {
   *     "id": "q8d6y8m53jyx9rhb164nqhj6pc",
   *     "create_at": 1489413852949,
   *     "update_at": 1489413853637,
   *     "delete_at": 0,
   *     "username": "hubot",
   *     "auth_data": "",
   *     "auth_service": "",
   *     "email": "hubot@localhost",
   *     "nickname": "",
   *     "first_name": "",
   *     "last_name": "",
   *     "position": "",
   *     "roles": "system_user",
   *     "locale": "en"
   *   }
   * ]
   *
   */
  _getUsers(options) {
    return new Promise((resolve, reject) => {
      let request_type = 'GET';
      let command = '/users';
      return this.client._apiCall(request_type, command, options, (data, header) => {
        if (data.error) {
          logger.error(strings.ERROR_FETCHING_USERS);
          logger.debug(Object(data));
          logger.debug(Object(header));
          return reject(data.error);
        } else {
          let users = [];
          for (let user of Array.from(Object.getOwnPropertyNames(data))) { users.push(data[user]); }
          return resolve(users);
        }
      });
    });
  }

  /**
   * Pin a message in a channel. **Not implemented for mattermost**.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.pinMessage()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<Error>} Returns a rejected `Promise`.
   */
  // TODO: pins are expected to be released in the future by Mattermost.
  _pinMessage(channel_id, options) {
    return Promise.reject(new Error(strings.ERROR_PINS));
  }

  /**
   * Archives a private channel - Same behavior as `_archiveChannel()`
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.archivePrivateChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _archivePrivateChannel(channel_id) {
    return new Promise((resolve, reject) => {
      return this._deleteChannel(channel_id)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Closes a private channel - same behavior as `_archivePrivateChannel()`.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.archivePrivateChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the channel in the chat platform.
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _closePrivateChannel(channel_id) {
    return new Promise((resolve, reject) => {
      return this._deleteChannel(channel_id)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Creates a private channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.createPrivateChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _createPrivateChannel(channel_name, options) {
    return new Promise((resolve, reject) => {
      return this._createChannel(channel_name, 'P')
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Retrieves the private channel message history from the chat platform.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/posts}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getPrivateChannelMessages()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - the unique id of the desired channel.
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/posts):
   * ```json
   * [
   *    {
    *      "id": "1jzigxmu8iyp3emgzqew699n1a",
    *      "create_at": 1490803309526,
    *      "update_at": 1490803309526,
    *      "delete_at": 0,
    *      "user_id": "q8d6y8m53jyx9rhb164nqhj6pc",
    *      "channel_id": "qqbrykzyatrrtbwhoyctmwug4r",
    *      "root_id": "",
    *      "parent_id": "",
    *      "original_id": "",
    *      "message": "hubot2 added to the channel by hubot",
    *      "type": "system_add_remove",
    *      "props": {},
    *      "hashtags": "",
    *      "pending_post_id": ""
    *    },
   *    {
    *      "id": "1ksuejwtkiy6fb7tnwzd4z165o",
    *      "create_at": 1490814629050,
    *      "update_at": 1490814629050,
    *      "delete_at": 0,
    *      "user_id": "q8d6y8m53jyx9rhb164nqhj6pc",
    *      "channel_id": "qqbrykzyatrrtbwhoyctmwug4r",
    *      "root_id": "",
    *      "parent_id": "",
    *      "original_id": "",
    *      "message": "hubot updated the channel display name from: channel_1 to: ",
    *      "type": "system_displayname_change",
    *      "props": {
    *        "new_displayname": "",
    *        "old_displayname": "channel_1"
    *      },
    *      "hashtags": "",
    *      "pending_post_id": ""
    *    }
   *  ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getPrivateChannelMessages(channel_id, options) {
    return new Promise((resolve, reject) => {
      return this._getChannelMessages(channel_id, options)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Invites a user to a private channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%7Bchannel_id%7D~1add%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.inviteUserToPrivateChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _inviteUserToPrivateChannel(channel_id, user_id) {
    return new Promise((resolve, reject) => {
      return this._inviteUserToChannel(channel_id, user_id)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Set the purpose (text) of a private channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1update%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelPurpose()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.PURPOSE_CHANGED`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _setPrivateChannelPurpose(channel_id, purpose) {
    return new Promise((resolve, reject) => {
      return this._setChannelPurpose(channel_id, purpose)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Set the topic (text) of a private channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1update%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelTopic()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return `strings.TOPIC_CHANGED`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _setPrivateChannelTopic(channel_id, topic) {
    return new Promise((resolve, reject) => {
      return this._setChannelTopic(channel_id, topic)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Gets all the private channels for the given team.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.getChannels()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget):
   * ```json
   * [
   *  {
    *    "id": "qqbrykzyatrrtbwhoyctmwug4r",
    *    "create_at": 1490725642985,
    *    "update_at": 1490815259843,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "P",
    *    "display_name": "channel_1",
    *    "name": "channel_1",
    *    "header": "generic topic",
    *    "purpose": "",
    *    "last_post_at": 1490815259888,
    *    "total_msg_count": 87,
    *    "extra_update_at": 1490726243020,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  },
   *  {
    *    "id": "f9dqc4d4fif6d8ceq3o3ijw8ow",
    *    "create_at": 1490725733905,
    *    "update_at": 1490725733905,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "P",
    *    "display_name": "channel1000",
    *    "name": "channel1000",
    *    "header": "",
    *    "purpose": "",
    *    "last_post_at": 0,
    *    "total_msg_count": 0,
    *    "extra_update_at": 1490725733933,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  }
   * ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getPrivateChannels() {
    return this._getAllChannels()
      .then(channels => {
        let privateChannels = [];
        for (let channel of Array.from(channels)) {
          if (channel.type === strings.PRIVATE_CHANNEL_TYPE) {
            privateChannels.push(channel);
          }
        }
        return Promise.resolve(privateChannels);
      });
  }

  /**
   * Gets all the instant message channels for the given team.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `_getChannels()` and `_getPrivateChannels()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<Object[]|Error>} Returns a `Promise`.
   * Upon resolve it will return an array of `JSON` objects that represent the messages.
   * More info at the [official mattermost posts docs](https://api.mattermost.com/#tag/channels%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%2Fget):
   * ```json
   * [
   *  {
    *    "id": "qqbrykzyatrrtbwhoyctmwug4r",
    *    "create_at": 1490725642985,
    *    "update_at": 1490815259843,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel_1",
    *    "name": "channel_1",
    *    "header": "generic topic",
    *    "purpose": "",
    *    "last_post_at": 1490815259888,
    *    "total_msg_count": 87,
    *    "extra_update_at": 1490726243020,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  },
   *  {
    *    "id": "f9dqc4d4fif6d8ceq3o3ijw8ow",
    *    "create_at": 1490725733905,
    *    "update_at": 1490725733905,
    *    "delete_at": 0,
    *    "team_id": "d9u1n5id6pyw8f8nzz7oiogppw",
    *    "type": "O",
    *    "display_name": "channel1000",
    *    "name": "channel1000",
    *    "header": "",
    *    "purpose": "",
    *    "last_post_at": 0,
    *    "total_msg_count": 0,
    *    "extra_update_at": 1490725733933,
    *    "creator_id": "q8d6y8m53jyx9rhb164nqhj6pc"
    *  }
   * ]
   * ```
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  _getInstantMessageChannels(options) {
    return this._getAllChannels()
      .then(channels => {
        let instantMessageChannels = [];
        for (let channel of Array.from(channels)) {
          let channelId = channel.id;
          if (channelId && (channelId.charAt(0) === 'D')) {
            instantMessageChannels.push(channel);
          }
        }
        return Promise.resolve(instantMessageChannels);
      });
  }

  /**
   * Creates an instant message channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/channels}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.createPrivateChannel()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_name - the desired channel name (without # prefix)
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   * Upon resolve it will return a string containing `strings.SUCCESS`.
   * Upon rejection, it should return an `Error` with a `message` property that holds a
   * stringified version of the error object returned from the Mattermost API servers.
   */
  // FIXME: should return channel object
  _createInstantMessageChannel(userId) {
    return new Promise((resolve, reject) => {
      return this._getUsers()
        .then(users => {
          for (let i = 0; i < users.length; i ++) {
            let user = users[i];
            if (user.username == this.robot.name) {
              let command = '/channels/direct';
              let request_type = 'POST';
              let options = [user.id, userId];
              console.log(options);
              this.client._apiCall(request_type, command, options, (data, header) => {
                if (data.error) {
                  logger.debug(Object(data));
                  return reject(data.error);
                } else {
                  return resolve(data);
                }
              });
              break;
            }
          }
        })
        .catch(e => {
          return resolve(e);
        });
    });
  }

  /**
   * Post / send a new message to a channel.
   * For more information go to the following links:
   * * [Mattermost API Reference (official)]{@link https://api.mattermost.com/#tag/posts%2Fpaths%2F~1teams~1%7Bteam_id%7D~1channels~1%7Bchannel_id%7D~1posts~1create%2Fpost}
   * * [`hubot-matteruser` adapter repo]{@link https://github.com/loafoe/hubot-matteruser}.
   * * [Mattermost javascript SDK]{@link https://github.com/loafoe/mattermost-client}
   *
   * **Developer notes:**
   * * This method is called by the `UnifiedAdapter` API public method `adapter.postMessage()`.
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the public / private channel in the chat platform.
   * @param {string} text - The text of the message.
   * @returns {Promise.<Object|Error>} Returns a `Promise`.
   */
  _postMessage(channel_id, text, options) {
    return this.client.postMessage(text, channel_id);
  }

  // Formatter functions

  /**
   * Converts a Mattermost message `Object` into a _unified / standardized_ `Message` object.
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatMessageObject(rawMessage) {
    return UnifiedFormatter.Message.create(
      rawMessage.message,
      rawMessage.user_id,
      rawMessage.id,
      rawMessage.type || 'unified_message',
      moment.utc(rawMessage.create_at).format(),
      rawMessage.subtype,
      // TODO: how do we get reactions / emojis
      rawMessage.reactions || [],
      rawMessage.props.attachments,
      rawMessage
    );
  }

  /**
   * Converts a Mattermost message `Object` into a _unified / standardized_ `Message` object.
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatChannelMessageObject(rawMessage) {
    return this._formatMessageObject(rawMessage);
  }

  /**
   * Converts a Mattermost channel `Object` into a _unified / standardized_ `Channel` object.
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawChannel - A channel object returned by the chat platform.
   * @returns {Channel} The formatted channel object given the inputs provided.
   */
  _formatChannelObject(rawChannel) {
    return UnifiedFormatter.Channel.create(
      rawChannel.name,
      rawChannel.id,
      'unified_channel',
      `${rawChannel.created_at}`,
      `${rawChannel.updated_at}` || `${rawChannel.created_at}`,
      // TODO: need to pre-fetch members
      rawChannel.members || [],
      rawChannel.creator_id || 'N/A',
      0,
      rawChannel.delete_at !== 0,
      rawChannel.header,
      rawChannel.purpose,
      rawChannel.team_id,
      // TODO: investigate how to pre-fetch previous names
      [],
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawMessage - A message object returned by the chat platform.
   * @returns {Message} The formatted message given the inputs provided.
   */
  _formatPrivateChannelMessageObject(rawMessage) {
    return this._formatMessageObject(rawMessage);
  }

  /**
   * Converts a Mattermost _private_ channel `Object` into a _unified / standardized_ `Channel` object.
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawChannel - A channel object returned by the chat platform.
   * @returns {Channel} The formatted channel object given the inputs provided.
   */
  _formatPrivateChannelObject(rawPrivateChannel) {
    return UnifiedFormatter.Channel.create(
      rawPrivateChannel.name,
      rawPrivateChannel.id,
      'unified_channel',
      `${rawPrivateChannel.created_at}`,
      `${rawPrivateChannel.updated_at}` || `${rawPrivateChannel.created_at}`,
      // TODO: need to pre-fetch members
      rawPrivateChannel.members || [],
      rawPrivateChannel.creator_id || 'N/A',
      0,
      rawPrivateChannel.delete_at !== 0,
      rawPrivateChannel.header,
      rawPrivateChannel.purpose,
      rawPrivateChannel.team_id,
      // TODO: investigate how to pre-fetch previous names
      [],
      rawPrivateChannel
    );
  }

  /**
   * Converts a Mattermost user `Object` into a _unified / standardized_ `User` object.
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
   * @memberof UnifiedMattermostAdapterImpl
   * @param {Object} rawUser - A user object returned by the chat platform.
   * @returns {Channel} The formatted user object given the inputs provided.
   */
  _formatUserObject(user) {
    return UnifiedFormatter.User.create(
      user.username,
      user.id,
      // FIXME: investigate why team_id seems to be missing in some instances
      user.team_id || 'N/A',
      user.email || null,
      user.delete_at !== 0,
      // FIXME: investigate how to identify bot users in mattermost
      user.is_bot,
      // FIXME: investigate how to pre-fetch info about user.
      null
    );
  }

  /**
   * upload attachments.
   * For more information go to the following links:
   * * [MatterMost (official) API]{@link https://api.mattermost.com/#tag/files}
   *
   * @private
   * @memberof UnifiedMattermostAdapterImpl
   * @param {string} channel_id - The unique id of the public / private channel in the chat platform.
   * @param {string} dirPath - file absolute path.
   * @returns Returns a `Promise`.
   */
  _uploadFile(channelId, dirPath) {
    return new Promise((resolve, reject) => {
      // let teamId  = this.client.teamID;
      let command = '/files';
      let requestType = 'POST';
      let options = {
        channel_id: channelId,
        files: fs.createReadStream(dirPath)
      };

      return this.client._apiCall(requestType, command, options, (data, header) => {
        if (data.error) {
          logger.error(data.error);
          logger.debug(Object(data));
          return reject(data.error);
        } else {
          this.client.postMessage(data, channelId);
          return resolve(data);
        }
      });
    });
  }
}

exports.use = robot => {
  // TODO: these options should be passed / configurable.
  let options = {};
  return new UnifiedMattermostAdapterImpl(robot, options);
};
