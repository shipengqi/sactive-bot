const {Adapter} = require('hubot');
const hubotMattermost = require('hubot-matteruser');

class MattermostAdapter extends Adapter {
  constructor(robot) {
    super(robot);
    this.robot = robot;
    this.sbotAdapter = hubotMattermost.use(this.robot);
    if (this.sbotAdapter) {
      this.sbotAdapter.once('connected', () => {
        // client for api call
        this.client = this.sbotAdapter.client;
        this.client.logger = this.robot.logger;
        return this.emit('connected');
      });
    }
  }

  run() {
    return this.sbotAdapter.run();
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

exports.use = robot => {
  return new MattermostAdapter(robot);
};
