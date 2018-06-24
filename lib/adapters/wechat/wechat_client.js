const {TextMessage, User} = require('hubot');
const {EventEmitter} = require('events');
const request = require('node-fetch');
const _ = require('lodash');
const url = require('url');
const util = require('util');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

class WechatClient extends EventEmitter {
  constructor(adapter, conf) {
    super();
    this.adapter = adapter;
    this.robot = this.adapter.robot;
    this.serverGroups = [];
    this.baseRequest = {
      Uin: process.env.HUBOT_WX_UIN,
      DeviceID: process.env.HUBOT_WX_DEVICE_ID,
      Skey: process.env.HUBOT_WX_SKEY,
      Sid: process.env.HUBOT_WX_SID
    };

    this.cookie = process.env.HUBOT_WX_COOKIE;

    this.acceptFriend = process.env.HUBOT_WX_ACCEPT_FRIEND || false;
    this.ignoreGroupMessage = process.env.HUBOT_WX_IGNORE_GROUP || false;

    const profilePath = path.join(__dirname, '..', 'server-profile.yml');
    const config = fs.readFileSync(profilePath, 'utf8');
    yaml.safeLoadAll(config, profile => {
      const server = {
        wxApi: this._thunkify(profile['api']),
        pushApi: this._thunkify(profile['push'], {json: false}),
        fileApi: this._thunkify(profile['file'], {json: false})
      };
      return this.serverGroups.push(server);
    });
    this.once('initialized', this._syncCheck);
  }

  init() {
    let f_resolve = _.map(this.serverGroups, (server, i) => {
      return function () {
        if (!this.initialized) {
          this.robot.logger.info(`[init] initializing wechat web api with server group ${i + 1}`);

          this.wxApi = server.wxApi;
          this.pushApi = server.pushApi;
          this.fileApi = server.fileApi;

          const _initRsp = this.wxApi.post({
            uri: '/webwxinit',
            body: {
              BaseRequest: this.baseRequest
            }
          });

          if (_initRsp.BaseResponse.Ret !== 0) {
            return this.robot.logger.warning(`[init] server group ${i} failed, ${this.serverGroups.length - i - 1} group remaining`);
          } else {
            this.robot.logger.info(`[init] init successed, Ret: ${_initRsp.BaseResponse.Ret}`);

            // save syncKey
            this.syncKey = _initRsp.SyncKey;
            this.syncCheckCount = Date.now();

            // own user info
            this.robot.me = _initRsp.User;

            // save contacts
            const contactRsp = this.getContact();
            this.robot.contacts = contactRsp.MemberList;

            // save master info
            this.robot.master = _.find(contactRsp, u => {
              const master = process.env.HUBOT_WX_MASTER;
              return (u.Alias === master) || (u.NickName === master) || (u.UserName === master);
            });

            // TODO group contacts
            this.initialized = true;
            this.initTime = new Date();

            this.emit('initialized');
            this.adapter.emit('connected');
          }
        }
      }.bind(this);
    });
  }

  getContact() {
    this.wxApi.get({
      uri: '/webwxgetcontact',
      qs: {
        seq: 0,
        r: Date.now(),
        skey: this.baseRequest.Skey
      }
    });
  }

  send(to, content) {
    let msgId = (Date.now() + Math.random().toFixed(3)).replace('.', '');
    this.wxApi.post({
      uri: '/webwxsendmsg',
      body: {
        BaseRequest: this.baseRequest,
        Msg: {
          Type: 1,
          Content: content,
          ClientMsgId: msgId,
          LocalID: msgId,
          FromUserName: this.robot.me.UserName,
          ToUserName: to
        },
        Scene: 0
      }
    });
  }
}

module.exports = WechatClient;