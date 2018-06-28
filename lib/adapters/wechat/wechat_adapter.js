const {Adapter} = require('hubot');
const _ = require('lodash');
const {WECHAT_ADAPTER_PREFIX} = require('./constants');
const WechatClient = require('./wechat_client');

class WechatAdapter extends Adapter {
  constructor(robot) {
    super(robot);
    this.wechat = new WechatClient(this);
    this.sbotAdapter = this;
    if (this.sbotAdapter) {
      this.sbotAdapter.once('connected', () => {
        this.emit('connected');
      });
    }
  }

  send(envelope, ...strings) {
    this.robot.logger.info(`${WECHAT_ADAPTER_PREFIX} Send`);

    return _.forEach(strings, content => {
      this.wechat.send(envelope.user.id, content);
    });
  }

  reply(envelope, ...strings) {
    this.robot.logger.info(`${WECHAT_ADAPTER_PREFIX} Reply`);
    return _.forEach(strings, content => {
      return this.wechat.send(envelope.user.id, content);
    });
  }
  run() {
    return this.wechat.init();
  }
}

exports.use = robot => new WechatAdapter(robot);