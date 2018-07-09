const {Adapter} = require('hubot');
const _ = require('lodash');
const {WECHAT_ADAPTER_PREFIX} = require('./constants');
const WechatClient = require('./wechat_client');

class WechatAdapter extends Adapter {
  constructor(robot, options) {
    super(robot);
    this.wechat = new WechatClient(this, options);
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

exports.use = robot => {
  let options = {
    Uin: process.env.SBOT_WX_UIN,
    DeviceID: process.env.SBOT_WX_DEVICE_ID,
    Skey: process.env.SBOT_WX_SKEY,
    Sid: process.env.SBOT_WX_SID,
    cookie: process.env.SBOT_WX_COOKIE,
    acceptFriend: process.env.SBOT_WX_ACCEPT_FRIEND,
    ignoreGroupMessage: process.env.SBOT_WX_IGNORE_GROUP,
    wechatMaster: process.env.SBOT_WX_MASTER
  };
  return new WechatAdapter(robot, options);
};