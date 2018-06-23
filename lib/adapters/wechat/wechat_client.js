const {EventEmitter} = require('events');
const fetch = require('node-fetch');
const _ = require('lodash');

class WechatClient extends EventEmitter {
  constructor(adapter) {
    super();
    this.adapter = adapter;
    this.robot = adapter.robot;
    this.serverGroups = [];
    this.options = {
      Uin: process.env.HUBOT_WECHAT_UIN,
      DeviceID: process.env.HUBOT_WECHAT_DEVICE_ID,
      Skey: process.env.HUBOT_WECHAT_SKEY,
      Sid: process.env.HUBOT_WECHAT_SID
    };
    this.cookie = process.env.HUBOT_WECHAT_COOKIE;
    this.acceptFriend = process.env.HUBOT_WX_ACCEPT_FRIEND || false;
    this.ignoreGroupMessage = process.env.HUBOT_WX_IGNORE_GROUP || false;
  }
}

module.exports = WechatClient;