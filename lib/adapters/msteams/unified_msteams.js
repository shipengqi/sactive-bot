const HubotBotFramework = require('hubot-botframework');
const MSGraph = require('@microsoft/microsoft-graph-client');
const { UnifiedAdapter } = require('../unified_adapter');
const UnifiedFormatter = require('../unified_formatter');
const MSTeamsAuthServer = require('./msteams_auth_server');
const MSTeamsClient = require('./ms_teams_client');
const {
  LOG_MSTEAMS_ADAPTER_PREFIX,
  GRAPH_DEFAULT_VERSION,
  GRAPH_BASE_URL,
  MESSAGE_ENDPOINT
} = require('./constants');
const Path = require('path');
const fs = require('fs');
const logger = require('winston');
const request = require('request');
const extend = require('extend');
const Store = require('jfs');
const MS_TEAMS_TOKEN_FILE = `${process.env.HUBOT_ENTERPRISE_ENV_DIR}/config/ms-teams-token.json`;
const MS_TEAMS_ADDRESS_FILE = `${process.env.HUBOT_ENTERPRISE_ENV_DIR}/config/ms-teams-address.json`;
const tokenStore = new Store(MS_TEAMS_TOKEN_FILE);
const addressStore = new Store(MS_TEAMS_ADDRESS_FILE);
const TeamsSource = 'msteams';
const AuthTokensKey = 'auth-tokens';
const AddressKey = 'address';
const strings = {
  UN_SUPPORT_ACTION: 'Unsupported action',
  ERROR_RETRIEVE_ADDRESS: 'Could not retrieve the team address'
};
const msteamsUtils = require('./msteams_utils');
const Dust = require('dustjs-helpers');

// Load special filters for MS Teams textual UnifiedResponseRender views.
Dust.filters.ifyText = msteamsUtils.msteamsifyText;
Dust.filters.ifyAttach = msteamsUtils.msteamsifyAttach;

class UnifiedMSTeamsAdapterImpl extends UnifiedAdapter {
  /**
     * Extends the `UnifiedAdapter` for Hubot Enterprise to support Slack platform.
     * @constructs UnifiedMSTeamsAdapterImpl
     * @augments UnifiedAdapter
     * @private
     * @param {hubot.Robot} @robot - instance of hubot's `Robot`.
     * @param {Object} @options - Configuration options for the `Robot`.
     */
  constructor(robot, options) {
    // Enforce interface
    let configFilePath = Path.join(__dirname, './unified.yml');
    super(robot, configFilePath);
    this.robot = robot;
    this.options = options;
    this.escapeMarkDownString = true;
    this._formatChannelObject = this._formatChannelObject.bind(this);
    this._formatChannelMessageObject = this._formatChannelMessageObject.bind(this);
    this._formatPrivateChannelMessageObject = this._formatPrivateChannelMessageObject.bind(this);
    this._formatPrivateChannelObject = this._formatPrivateChannelObject.bind(this);

    logger.setLevels(logger.config.syslog.levels);

    // Setup the BotFramework adapter for message transport
    process.env.BOTBUILDER_APP_ID = this.options.ms_app_id;
    process.env.BOTBUILDER_APP_PASSWORD = this.options.ms_app_password;
    if (this.options.messages_endpoint) {
      process.env.BOTBUILDER_ENDPOINT = this.options.messages_endpoint;
    }
    this.he_adapter = HubotBotFramework.use(this.robot);
    this.he_adapter.logger = logger;

    // Initialize Teams connector for teams specific APIs
    this.client = new MSTeamsClient(this.robot, this.he_adapter.connector, this.options);

    // Setup authentication server and register routes
    this.authServer = MSTeamsAuthServer.use(this.robot, this.userLoggedIn, this.options);

    // Initialize the Graph client
    this.graphClient = MSGraph.Client.init({authProvider: done => this.authProvider(done)});
    this.graphClient._apiCall = (path, opts = {}) => {
      return new Promise((resolve, reject) => {
        let options = extend(true, {}, {
          url: GRAPH_BASE_URL + GRAPH_DEFAULT_VERSION + path,
          headers: {}
        }, opts);

        let responseHandle = (error, res, value) => {
          if (error) {
            this.robot.logger.error(`Graph request error: ${error.message}`);
            return reject(error);
          } else {
            if (value && typeof value === 'string') {
              value = JSON.parse(value);
            }
            if ((res.statusCode !== 200) && ((value.error && value.error.message))) {
              return reject(new Error(value.error.message));
            }
            return resolve(value);
          }
        };
        this.authProvider((err, token) => {
          if (!err && token) {
            options.headers['Authorization'] = `BEARER ${token}`;
            this.robot.logger.debug(`Graph request ${options.url}`);
            if (options.method === 'put' && options.formData) {
              let temp = options.formData.attachments[0];
              delete options.formData;
              temp.pipe(request(options, responseHandle));
            } else {
              request(options, responseHandle);
            }
          } else {
            this.robot.logger.error(`Graph auth error: ${err.message}`);
            return reject(err);
          }
        });
      });
    };

    // Only accept calls from Microsoft Teams
    // Filter out all calls that are not messages.
    this.robot.receiveMiddleware((context, next, done) => {
      let source = __guard__(__guard__(__guard__(__guard__(context ? context.response : undefined, x3 => x3.envelope), x2 => x2.user), x1 => x1.activity), x => x.source);
      let type = __guard__(__guard__(__guard__(__guard__(context ? context.response : undefined, x7 => x7.envelope), x6 => x6.user), x5 => x5.activity), x4 => x4.type);
      if ((type !== 'message') || (source !== TeamsSource)) {
        return done();
      } else {
        return next();
      }
    });

    // Register the authentication middleware which forces users to log in
    //  before continuing conversation.
    this.robot.receiveMiddleware((context, next, done) => {
      return this.authenticationMiddleware(context, next, done);
    });
  }

  generateSignInCard(user) {
    let model = {
      contentType: 'application/vnd.microsoft.card.hero',
      parts: [{
        title: `Hi ${user.name}!`,
        text: 'I don\'t think we\'ve talked before. You need to sign-in and your tenant admin has to consent to us talking before I can help you.',
        actions: [
          {
            type: 'openUrl',
            title: 'Sign in',
            value: this.authServer.getAuthorizeUri()
          },
          {
            type: 'openUrl',
            title: 'Admin consent',
            value: this.authServer.getAdminConsentUri()
          }
        ]
      }
      ]
    };
    return this.robot.adapter.UnifiedResponseRenderer.createMessage(model);
  }

  authProvider(done) {
    let tokens = this.robot.brain.get(AuthTokensKey);
    if (!tokens && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      tokens = tokenStore.getSync(AuthTokensKey);
      this.robot.brain.set(AuthTokensKey, tokens);
    }
    if (((tokens ? tokens.expires_on : undefined)) && (tokens.expires_on > Date.now())) {
      return done(null, tokens.access_token);
    }
    if (tokens ? tokens.refresh_token : undefined) {
      return this.authServer
        .refreshToken(tokens.refresh_token, done);
    }
    return done('unauthorized');
  }

  userLoggedIn(userId, tokens) {
    this.robot.brain.set(AuthTokensKey, tokens);
    return tokenStore.saveSync(AuthTokensKey, tokens);
  }

  // #
  // The authentication middleware to use to ensure users are logged in
  //  prior to conversing with them.
  //  This should be registered on the robot at constructor time.
  // #
  authenticationMiddleware(context, next, done) {
    let { response } = context;
    let { user } = response.envelope;
    let { activity } = user;

    this.robot.brain.set(AddressKey, activity.address);
    addressStore.saveSync(AddressKey, activity.address);
    let authTokens = this.robot.brain.get(AuthTokensKey);
    if (!authTokens && fs.existsSync(MS_TEAMS_TOKEN_FILE)) {
      authTokens = tokenStore.getSync(AuthTokensKey);
      this.robot.brain.set(AuthTokensKey, authTokens);
    }
    if ((authTokens ? authTokens.refresh_token : undefined)) {
      return next();
    }

    response.send(this.generateSignInCard(user, activity));
    response.finish();
    return done();
  }

  // #
  // Internal method to fetch the AAD Id of the team that the chat is
  //  happening in. This Id is used in numerous dependent MS Graph calls.
  //  This method returns a promise.
  //
  // Some of this data can probably be cached to avoid making the graph
  //  calls every time.
  // #
  getTeamId(conversationId) {
    if (!conversationId.startsWith('19:')) {
      return Promise.resolve(null);
    }
    conversationId = conversationId.substr(3).split('@')[0];

    let teamId = this.robot.brain.get(conversationId);
    if (teamId) {
      return Promise.resolve(teamId);
    }
    let options = {
      method: 'get',
      headers: {
        'Accept': 'application/json'
      }
    };
    return this.graphClient
      ._apiCall('/me/joinedTeams', options)
      .then(response => {
        let teams = (response ? response.value : undefined) || [];
        let promises = teams.map(element => {
          return this.graphClient
            ._apiCall(`/groups/${element.id}/channels`, options);
        });

        return Promise.all(promises)
          .then(responses => {
            let thisTeamId = null;
            let responseNum = 0;
            for (response of Array.from(responses)) {
              let channels = (response ? response.value : undefined) || [];
              for (let channel of Array.from(channels)) {
                let channelId = channel.id.replace(/-/g, '');
                teamId = teams[responseNum].id;
                this.robot.brain.set(channelId, teamId);
                if (channelId === conversationId) {
                  thisTeamId = teamId;
                }
              }
              responseNum ++;
            }
            if (thisTeamId) {
              return Promise.resolve(thisTeamId);
            }
            return Promise.reject('Channel not found in any team.');
          });
      });
  }

  // Adapter methods to extend Hubot / Hubot Enterprise UnifiedAdapter class

  /**
     * Runs / initializes a MSTeams adapter.
     * It will create all necessary client connections to the chat platform.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.run()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _run() {
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Initializing`);
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Starting BotFramework Adapter`);
    this.he_adapter.once('connected', () => {
      this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} BotFramework Adapter connected`);
      return this.emit('connected');
    });
    this.he_adapter.run();
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Initializing Authentication Server`);
    return this.authServer.initialize();
  }

  /**
     * Sends one or more messages to the current MSTeams channel.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.reply()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _reply(context, ...messages) {
    return this.he_adapter.reply(context, ...Array.from(messages));
  }

  /**
     * Sends one or more emoticon messages to a MSTeams channel.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.send()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _send(context, ...messages) {
    return this.he_adapter.send(context, ...Array.from(messages));
  }

  /**
     * Sends one or more emoticon messages to Hubot. Defaults to `send()` behavior.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.emote()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _emote(context, ...messages) {
    return this.he_adapter.emote(context, ...Array.from(messages));
  }

  /**
     * Sets the topic of a MSTeams channel.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.topic()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _topic(context, ...messages) {
    return this.he_adapter.topic(context, ...Array.from(messages));
  }

  /**
     * Closes the client connections to MSTeams.
     * For more information go to the following links:
     * * [open source hubot documentation]{@link https://hubot.github.com/docs/adapters/development/}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.close()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {undefined}
     */
  _close() {
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Shutting down`);
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Shutting down BotFramework Adapter`);
    this.he_adapter.close();
    return this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Goodbye`);
  }

  // Chat Platform commands

  // ########################################################################
  // Channels
  /**
     * Archives a channel.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {string} channelId - The unique id of the channel in the chat platform.
     * @returns {Promise.<string|Error>} Returns a `Promise`.
     */
  _archiveChannel(channelId) {
    return new Promise((resolve, reject) => {
      return this._deleteChannel(channelId)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  }

  /**
   * Deletes a channel - Same behavior as archive channel
   * For more information go to the following links:
   * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
   * * [Microsoft Graph API]{@link https://developer.microsoft.com/en-us/graph/docs/api-reference/beta/resources/teams_api_overview}.
   *
   * **Developer notes:**
   * * This method is called by several `private` methods in this adapter class.
   *
   * @private
   * @memberof UnifiedMSTeamsAdapterImpl
   * @param {string} channelId - The unique id of the channel in the chat platform.
   * @returns {Promise.<string|Error>} Returns a `Promise`.
   */
  _deleteChannel(channelId) {
    let address = this.robot.brain.get(AddressKey);
    if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      address = addressStore.getSync(AddressKey);
      this.robot.brain.set(AddressKey, address);
    }
    if (!address || !(address ? address.conversation : undefined)) {
      return Promise.reject(new Error(Str.ERROR_RETRIEVE_ADDRESS));
    }
    let options = {
      method: 'delete'
    };
    return this.getTeamId(address.conversation.id)
      .then(teamId => {
        if (!teamId) {
          return Promise.reject(new Error('Channels can only be deleted from a team chat.'));
        }
        return this.graphClient
          ._apiCall(`/groups/${teamId}/channels/${channelId}`, options);
      });
  }

  /**
     * Creates a channel.
     * For more information go to the following links:
     * * [MS Teams API Reference (official)]{@link https://developer.microsoft.com/en-us/graph/docs/api-reference/beta/resources/teams_api_overview}
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.createChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {string} channelName - the desired channel name (without # prefix)
     * @returns {Promise.<string|Error>} Returns a `Promise`.
     */
  // FIXME: should return channel object
  _createChannel(channel_name) {
    let address = this.robot.brain.get(AddressKey);
    if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      address = addressStore.getSync(AddressKey);
      this.robot.brain.set(AddressKey, address);
    }
    if (!address || !(address ? address.conversation : undefined)) {
      return Promise.reject(new Error(strings.ERROR_RETRIEVE_ADDRESS));
    }

    return this.getTeamId(address.conversation.id)
      .then(teamId => {
        if ((!teamId)) {
          return Promise.reject(new Error('Channels can only be created from a team chat.'));
        }
        // let channel = {
        //   displayName: channel_name,
        //   description: ""
        // };
        let options = {
          headers: {
            'Content-Type': 'application/json'
          },
          json: {
            'displayName': channel_name,
            'description': ''
          },
          method: 'post'
        };
        return this.graphClient
          ._apiCall(`/groups/${teamId}/channels`, options);
      });
  }

  /**
     * Retrieves the channel message history from the chat platform.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _getChannelMessages() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Gets all the channels for the given team.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _getChannels() {
    let address = this.robot.brain.get(AddressKey);
    if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      address = addressStore.getSync(AddressKey);
      this.robot.brain.set(AddressKey, address);
    }
    if (!address || !(address ? address.conversation : undefined)) {
      return Promise.reject(new Error(strings.ERROR_RETRIEVE_ADDRESS));
    }
    let options = {
      method: 'get',
      headers: {
        'Accept': 'application/json'
      }
    };
    return this.getTeamId(address.conversation.id)
      .then(teamId => {
        if (!teamId) {
          return Promise.resolve([]);
        }

        return this.graphClient
          ._apiCall(`/groups/${teamId}/channels`, options)
          .then(response => {
            let channels = (response ? response.value : undefined) || [];
            return Promise.resolve(channels);
          });
      });
  }

  /**
     * Invites a user to a channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _inviteUserToChannel(channel_id, user_id) {
    let text = `<@${user_id.trim()}> has been invited.`;
    return this._postMessage(channel_id, text);
  }

  /**
     * Set the purpose (text) of a channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _setChannelPurpose() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Set the topic (text) of a channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archiveChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _setChannelTopic() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  // ########################################################################
  // Users

  /**
     * Get all users of a teams.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.getUsers()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
     * Upon resolve it will return a `JSON` response `Object`.
     */
  _getUsers() {
    let address = this.robot.brain.get(AddressKey);
    if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      address = addressStore.getSync(AddressKey);
      this.robot.brain.set(AddressKey, address);
    }
    if (!address || !(address ? address.conversation : undefined)) {
      return Promise.reject(new Error(strings.ERROR_RETRIEVE_ADDRESS));
    }

    return this.client.getConversationMembers(address)
      .then(result => {
        let users = [];
        for (let teamsUser of Array.from(result)) {
          let user = this.robot.brain.userForId(teamsUser.id);
          // Merge in the newly fetched values.
          for (let key in teamsUser) {
            user[key] = teamsUser[key];
          }
          users.push(user);
        }
        return users;
      });
  }

  // ########################################################################
  // Pins

  /**
     * Pin a message in a channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.pinMessage()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _pinMessage() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  // ########################################################################
  // Groups

  /**
     * Archives a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.archivePrivateChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _archivePrivateChannel() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Closes a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.closePrivateChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _closePrivateChannel() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Creates a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.createPrivateChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _createPrivateChannel() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Retrieves the private channel message history from the chat platform.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.getPrivateChannelMessages()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _getPrivateChannelMessages() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Invites a user to a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.inviteUserToPrivateChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _inviteUserToPrivateChannel() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Set the purpose (text) of a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelPurpose()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _setPrivateChannelPurpose() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Set the topic (text) of a private channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.setPrivateChannelTopic()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _setPrivateChannelTopic() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Gets all the private channels for the given team.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.getPrivateChannels()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _getPrivateChannels() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Gets all im channels that the user has.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.getInstantMessageChannels()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _getInstantMessageChannels() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  /**
     * Creates an instant message channel.
     * unsupported action.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.createInstantMessageChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     */
  _createInstantMessageChannel() {
    logger.error(strings.UN_SUPPORT_ACTION);
    return Promise.reject(new Error(strings.UN_SUPPORT_ACTION));
  }

  // Chat

  /**
     * Post / send a new message to a channel.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.postMessage()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {string} channel_id - The unique id of the public channel in the chat platform.
     * @param {string} text - The text of the message.
     * @param {Object} options - options for the message.
     * @returns {Promise.<Object|SlackAPIError>} Returns a `Promise`.
     * Upon resolve it will return a `JSON` response `Object`
     */
  _postMessage(channelId, text, options) {
    let address = this.robot.brain.get(AddressKey);
    if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
      address = addressStore.getSync(AddressKey);
      this.robot.brain.set(AddressKey, address);
    }
    if (!address || !(address != null ? address.conversation : undefined)) {
      return Promise.reject(new Error(strings.ERROR_RETRIEVE_ADDRESS));
    }

    // We have to clone the address because the ms-teams-client is going
    //  to modify it and we don't want it to modify the original address.
    address = clone(address);

    // If the channel id does not start with 19:, then the id is the AAD
    //  object id and we have to remove the - and prepend 19: and append
    //  @thread.skype to get the teams channel Id.
    if (!channelId) {
      return Promise.reject(new Error('channel not found'));
    }

    if (text === '') {
      return Promise.reject(new Error('text cannot be null'));
    }
    if (!channelId.startsWith('19:')) {
      channelId = `19:${channelId.replace(/-/g, '')}@thread.skype`;
    }

    let fakeContext = {
      message: {
        user: {
          activity: {
            entities: []
          }
        }
      },
      user: {
        activity: {
          address
        }
      }
    };

    return this.processMessage(text)
      .then(processMessages => {
        // Utilize the underlying adapter's formatting function to generate
        //  the message object.
        let messages = this.he_adapter
          .using(TeamsSource)
          .toSendable(fakeContext, processMessages.text);

          // The underlying adapter can convert one message into many
        if (!Array.isArray(messages)) {
          messages = [messages];
        }

        messages = messages.filter(message => message.type === 'message');
        for (let k in messages) {
          let v = messages[k];
          v.attachments = processMessages.attachments;
        }

        this.client.postMessages(channelId, messages);

        return Promise.resolve({
          text: text,
          type: 'message',
          userId: 'userId',
          messageId: 'id'});
      });
  }

  processMessage(msg, opts) {
    return new Promise((resolve, reject) => {
      if (msg instanceof this.UnifiedResponseRenderer.Message) {
        return this.UnifiedResponseRenderer.private.UnifiedResponseRenderer.render(msg)
          .then(resp => {
            return resolve(resp);
          });
      } else {
        return resolve({
          text: msg,
          attachments: []
        });
      }
    });
  }

  _formatMessageObject(rawMessage) {
    return UnifiedFormatter.Message.create(
      rawMessage.text,
      rawMessage.userId,
      rawMessage.messageId,
      rawMessage.type,
      rawMessage.time,
      rawMessage.subtype,
      rawMessage.reactions,
      rawMessage.attachments,
      rawMessage
    );
  }

  _formatChannelMessageObject() {}

  /**
     * Converts a MSTeams channel `Object` into a _unified / standardized_ `Channel` object.
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
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {Object} rawChannel - A channel object returned by the chat platform.
     * @returns {Channel} The formatted channel object given the inputs provided.
     */
  _formatChannelObject(rawChannel) {
    return UnifiedFormatter.Channel.create(
      rawChannel.displayName,
      rawChannel.id,
      'unified_channel',
      'N/A',
      'N/A',
      [],
      'N/A',
      0,
      false,
      'N/A',
      'N/A',
      'N/A',
      // TODO: investigate how to pre-fetch previous names
      [],
      rawChannel
    );
  }

  _formatPrivateChannelMessageObject() {}

  _formatPrivateChannelObject() {}

  /**
     * Converts a MSTeams user `Object` into a _unified / standardized_ `User` object.
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
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {Object} rawUser - A user object returned by the chat platform.
     * @returns {Channel} The formatted user object given the inputs provided.
     */
  _formatUserObject(rawUser) {
    return UnifiedFormatter.User.create(
      rawUser.name,
      rawUser.id,
      'N/A', // In MS Teams users can belong to many teams
      rawUser.email,
      false,
      rawUser.id.startsWith('28:'),
      rawUser
    );
  }

  /**
     * upload attachments.
     * For more information go to the following links:
     * * [`hubot-botframework` adapter repo]{@link https://github.com/Microsoft/BotFramework-Hubot}.
     *
     * **Developer notes:**
     * * This method is called by the `UnifiedAdapter` API public method `adapter.createInstantMessageChannel()`.
     *
     * @private
     * @memberof UnifiedMSTeamsAdapterImpl
     * @param {string} channelId - The unique id of the public / private channel in the chat platform.
     * @param {string} dirPath - file absolute path.
     * @returns Returns a `Promise`.
     */
  _uploadFile(channelId, dirPath) {
    return new Promise((resolve, reject) => {
      let address = this.robot.brain.get(AddressKey);
      if (!address && fs.existsSync(MS_TEAMS_ADDRESS_FILE)) {
        address = addressStore.getSync(AddressKey);
        this.robot.brain.set(AddressKey, address);
      }
      if (!address || !(address ? address.conversation : undefined)) {
        return reject(new Error(strings.ERROR_RETRIEVE_ADDRESS));
      }
      let filename = Path.basename(dirPath);

      this.getTeamId(address.conversation.id)
        .then(teamId => {
          if (!teamId) {
            reject(new Error('Attachments can only be uploaded to a team chat.'));
          }
          this.graphClient
            ._apiCall(`/groups/${teamId}/channels/${channelId}`, {
              method: 'get',
              headers: {
                'Accept': 'application/json'
              }
            })
            .then(channelInfo => {
              return this.graphClient
                ._apiCall(`/groups/${teamId}/drive/root:/${channelInfo.displayName}/${filename}:/content`, {
                  headers: {
                    'Content-Type': 'text/plain'
                  },
                  formData: {
                    attachments: [
                      fs.createReadStream(dirPath)
                    ]
                  },
                  method: 'put'
                })
                .then(response => {
                  resolve(response);
                })
                .catch(e => {
                  reject(e);
                });
            });
        });
    });
  }
}

exports.use = function(robot) {
// TODO: these options should be passed / configurable.
  let http_proxy_endpoint = process.env.http_proxy || process.env.https_proxy || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  let options = {
    ms_app_id: process.env.MICROSOFT_APP_ID,
    ms_app_password: process.env.MICROSOFT_APP_PASSWORD,
    tenant_id: process.env.MICROSOFT_TENANT_ID,
    host: process.env.MICROSOFT_AUTH_SERVER_HOST,
    messages_endpoint: MESSAGE_ENDPOINT,
    http_proxy_endpoint
  };
  return new UnifiedMSTeamsAdapterImpl(robot, options);
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

function clone(obj) {
  if ((obj == null) || (typeof obj !== 'object')) {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof RegExp) {
    let flags = '';
    if (obj.global != null) { flags += 'g'; }
    if (obj.ignoreCase != null) { flags += 'i'; }
    if (obj.multiline != null) { flags += 'm'; }
    if (obj.sticky != null) { flags += 'y'; }
    return new RegExp(obj.source, flags);
  }

  const newInstance = new obj.constructor();

  for (let key in obj) {
    newInstance[key] = clone(obj[key]);
  }

  return newInstance;
}
