const {Adapter} = require('hubot');
const _ = require('lodash');
const {WECHAT_ADAPTER_PREFIX} = require('./constants');
const WechatClient = require('./wechat_client');
const WechatAuthServer = require('./wechat_auth_server');

class WechatAdapter extends Adapter {
  constructor(robot, options) {
    super(robot);
    this.wechat = new WechatClient(this, options);
    this.authServer = new WechatAuthServer(robot);
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

  async run() {
    let baseRequest = await this.authServer.run();
    let options = {
      Uin: baseRequest.uin,
      DeviceID: baseRequest.deviceid,
      Skey: baseRequest.skey,
      Sid: baseRequest.sid,
      pass_ticket: baseRequest.pass_ticket
    };
    return this.wechat.init(options);
  }
}

exports.use = robot => {
  let options = {
    acceptFriend: process.env.SBOT_WX_ACCEPT_FRIEND,
    ignoreGroupMessage: process.env.SBOT_WX_IGNORE_GROUP,
    wechatMaster: process.env.SBOT_WX_MASTER
  };
  return new WechatAdapter(robot, options);
};