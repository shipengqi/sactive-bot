const {Adapter} = require('hubot');
const hubotSlack = require('hubot-slack');

class SlackAdapter extends Adapter {
  constructor(robot, options) {
    super(robot);
    this.options = options;

    // hubot-slack will default to use process.env.HUBOT_SLACK_TOKEN
    if (this.options.bot_token) {
      this.sbotAdapter = hubotSlack.use(this.robot);
      // client for api call
      // this.client = this.sbotAdapter.client.web;
    } else {
      this.robot.logger.warning('No bot token found, slack bot (rtm) not set');
    }

    // Only when adapter is needed
    if (this.sbotAdapter) {
      this.sbotAdapter.once('connected', () => {
        return this.emit('connected');
      });
    }
  }

  run() {
    return this.sbotAdapter.run();
  }

  reply(envelope, ...messages) {
    return this.sbotAdapter.reply(envelope, ...Array.from(messages));
  }

  send(envelope, ...messages) {
    return this.sbotAdapter.send(envelope, ...Array.from(messages));
  }

  // TODO: consider deprecating
  emote(envelope, ...messages) {
    return this.sbotAdapter.emote(envelope, ...Array.from(messages));
  }

  close() {
    return this.sbotAdapter.close();
  }
}

exports.use = robot => {
  let options = {
    bot_token: process.env.HUBOT_SLACK_TOKEN
  };
  return new SlackAdapter(robot, options);
};
