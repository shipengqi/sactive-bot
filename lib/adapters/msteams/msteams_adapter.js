const HubotBotFramework = require('hubot-botframework');
const {Adapter} = require('hubot');
const MSTeamsAuthServer = require('./msteams_auth_server');
const MSTeamsClient = require('./ms_teams_client');
const {
  LOG_MSTEAMS_ADAPTER_PREFIX,
  MESSAGE_ENDPOINT
} = require('./constants');
const Path = require('path');
const logger = require('winston');

class MSTeamsAdapter extends Adapter {
  constructor(robot, options) {
    // Enforce interface
    let configFilePath = Path.join(__dirname, './unified.yml');
    super(robot, configFilePath);
    this.robot = robot;
    this.options = options;

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
  };

  run() {
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Initializing`);
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Starting BotFramework Adapter`);
    this.he_adapter.run();
    this.robot.logger.info(`${LOG_MSTEAMS_ADAPTER_PREFIX} Initializing Authentication Server`);
    return this.authServer.initialize();
  }

  reply(envelope, ...messages) {
    return this.sbotAdapter.reply(envelope, ...messages);
  }

  send(envelope, ...messages) {
    return this.sbotAdapter.send(envelope, ...messages);
  }

  emote(envelope, ...messages) {
    return this.sbotAdapter.emote(envelope, ...messages);
  }

  close() {
    return this.sbotAdapter.close();
  }
}

exports.use = function(robot) {
  let options = {
    ms_app_id: process.env.MICROSOFT_APP_ID,
    ms_app_password: process.env.MICROSOFT_APP_PASSWORD,
    tenant_id: process.env.MICROSOFT_TENANT_ID,
    host: process.env.MICROSOFT_AUTH_SERVER_HOST,
    messages_endpoint: MESSAGE_ENDPOINT
  };
  return new MSTeamsAdapter(robot, options);
};
