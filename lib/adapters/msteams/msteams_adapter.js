const HubotBotFramework = require('hubot-botframework');
const {Adapter} = require('hubot');
const {MSTEAMS_ADAPTER_PREFIX} = require('./constants');

class MSTeamsAdapter extends Adapter {
  constructor(robot) {
    super(robot);
    this.robot = robot;
    this.sbotAdapter = HubotBotFramework.use(this.robot);
    if (this.sbotAdapter) {
      this.sbotAdapter.once('connected', () => {
        this.sbotAdapter.logger = this.robot.logger;
        return this.emit('connected');
      });
    }
  };

  run() {
    this.robot.logger.info(`${MSTEAMS_ADAPTER_PREFIX} Initializing`);
    this.robot.logger.info(`${MSTEAMS_ADAPTER_PREFIX} Starting Microsoft Teams Adapter`);
    this.sbotAdapter.run();
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
  return new MSTeamsAdapter(robot);
};
