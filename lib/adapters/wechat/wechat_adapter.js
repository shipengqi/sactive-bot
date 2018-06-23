const {Adapter} = require('hubot');
const _ = require('lodash');
const WechatClient = require('./wechat_client');
const {WECHAT_ADAPTER_LOG_PREFIX} = require('./constants');

class WechatAdapter extends Adapter {
  constructor(robot) {
    super(robot);
    this.wechatClient = new WechatClient(this);
    robot.logger.info(`${WECHAT_ADAPTER_LOG_PREFIX} Adapter loaded. Using appId ${@appId}`);
  }

  send(envelope, ...messages) {
    this.robot.logger.info(`${WECHAT_ADAPTER_LOG_PREFIX} send`);
    _.each(messages, msg => {
      this.wechatClient.send(envelope.user.id, msg);
    });
  }

  reply(envelope, ...messages) {
    this.robot.logger.info(`${WECHAT_ADAPTER_LOG_PREFIX} reply`);
    this.send(envelope, ...messages);
  }

  run() {
    this.wechatClient.init();
  }
}

exports.use = function(robot) {
  return new WechatAdapter(robot);
};