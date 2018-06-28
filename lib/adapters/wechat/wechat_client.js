const {TextMessage, User} = require('hubot');
const {EventEmitter} = require('events');
const request = require('axios');
const _ = require('lodash');
const url = require('url');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const {eval2} = require('../../utils');

class WechatClient extends EventEmitter {
  constructor(adapter, conf) {
    super();
    this.adapter = adapter;
    this.robot = this.adapter.robot;
    this.serverGroups = [];
    this.baseRequest = {
      Uin: process.env.SBOT_WX_UIN,
      DeviceID: process.env.SBOT_WX_DEVICE_ID,
      Skey: process.env.SBOT_WX_SKEY,
      Sid: process.env.SBOT_WX_SID
    };

    this.cookie = process.env.SBOT_WX_COOKIE;

    this.acceptFriend = process.env.SBOT_WX_ACCEPT_FRIEND;
    if (this.acceptFriend === 'no' || this.acceptFriend === 'n') {
      this.acceptFriend = false;
    }
    this.ignoreGroupMessage = process.env.SBOT_WX_IGNORE_GROUP;
    if (this.ignoreGroupMessage === 'no' || this.ignoreGroupMessage === 'n') {
      this.ignoreGroupMessage = false;
    }
    let profilePath = path.join(__dirname, './server_profile.yml');
    let config = fs.readFileSync(profilePath, 'utf8');
    yaml.safeLoadAll(config, profile => {
      let server = {
        wxApi: this._thunkify(profile['api']),
        pushApi: this._thunkify(profile['push'], {json: false}),
        fileApi: this._thunkify(profile['file'], {json: false})
      };
      return this.serverGroups.push(server);
    });
    this.once('initialized', this._syncCheck);
  }

  async init() {
    let servers = _.map(this.serverGroups, (server, i) => {
      return new Promise(async (resolve, reject) => {
        if (!this.initialized) {
          this.robot.logger.info(`[init] initializing wechat web api with server group ${i + 1}`);

          this.wxApi = server.wxApi;
          this.pushApi = server.pushApi;
          this.fileApi = server.fileApi;

          let _initRsp = await this.wxApi.post({
            uri: '/webwxinit',
            body: {
              BaseRequest: this.baseRequest
            }
          });
          if (_initRsp.BaseResponse.Ret !== 0) {
            this.robot.logger.warning(`[init] server group ${i} failed, ${this.serverGroups.length - i - 1} group remaining`);
          } else {
            this.robot.logger.info(`[init] init successed, Ret: ${_initRsp.BaseResponse.Ret}`);

            // save syncKey
            this.syncKey = _initRsp.SyncKey;
            this.syncCheckCount = Date.now();

            // own user info
            this.robot.me = _initRsp.User;

            // save contacts
            let contactRsp = await this.getContact();
            this.robot.contacts = contactRsp.MemberList;

            // save master info
            this.robot.master = _.find(contactRsp, u => {
              let master = process.env.SBOT_WX_MASTER;
              return (u.Alias === master) || (u.NickName === master) || (u.UserName === master);
            });

            // TODO group contacts
            this.initialized = true;
            this.initTime = new Date();

            this.emit('initialized');
            this.adapter.emit('connected');
          }
        }
      });
    });

    try {
      await Promise.all(servers);
    } catch (e) {
      this.robot.logger.info(e);
    }
  }

  async getContact() {
    await this.wxApi.get({
      uri: '/webwxgetcontact',
      qs: {
        seq: 0,
        r: Date.now(),
        skey: this.baseRequest.Skey
      }
    });
  }

  async send(to, content) {
    let msgId = (Date.now() + Math.random().toFixed(3)).replace('.', '');
    try {
      await this.wxApi.post({
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
    } catch (e) {
      console.log(e.stack);
    }
  }

  async _syncCheck() {
    this.robot.logger.info('[syncCheck] sync checking');
    try {
      let keys = _.map(this.syncKey.List, key => `${key.Key}_${key.Val}`);
      let check = await this.pushApi.get({
        uri: '/synccheck',
        qs: {
          r: Date.now(),
          skey: this.baseRequest.Skey,
          sid: this.baseRequest.Sid,
          uin: this.baseRequest.Uin,
          deviceid: this.baseRequest.DeviceID,
          synckey: keys.join('|'),
          _: this.syncCheckCount ++
        }
      });
      let synccheck = eval2(_.replace(check, 'window.', ''));
      if (synccheck.retcode !== '0') {
        this.robot.logger.error('[syncCheck] sync check failed ,request rejected');
        this.robot.shutdown();
      }

      if (synccheck.selector !== '0') {
        this.robot.logger.info('[sync] sync message');
        let sync = await this.wxApi.post({
          uri: '/webwxsync',
          qs: {
            sid: this.baseRequest.Sid,
            skey: this.baseRequest.Skey
          },
          body: {
            BaseRequest: this.baseRequest,
            SyncKey: this.syncKey,
            rr: Date.now()
          }
        });

        // update sync key
        this.syncKey = sync.SyncKey;
        await this._resolveMessage(sync, synccheck.selector);
        process.nextTick(this._syncCheck.bind(this));
      }
    } catch (e) {
      if (_.includes(['ECONNRESET', 'ETIMEDOUT'], e.code)) {
        process.nextTick(this._syncCheck.bind(this));
      }
      console.log(e.stack);
    }
  }

  async _resolveMessage(sync, selector) {
    let fMessages = _.map(sync.AddMsgList, message => {
      return async () => {
        let from = message.FromUserName;
        let content = message.Content;

        // normal message
        if (message.MsgType === 1) {
          // message from group
          let groupUser;
          if (this._isGroup(message.FromUserName)) {
            let array, val;
            array = /([@0-9a-z]+):<br\/>([\s\S]*)/.exec(message.Content);
            val = array[array.length - 2];
            groupUser = val !== null ? val : 'anonymous';
            content = array[array.length - 1];
          }

          this._notifyHubot(from, content, groupUser, message.MsgId);
        }

        // system notification
        if (message.MsgType === 10000) {
          this.robot.logger.info(content);
        }

        // friend request
        if ((message.MsgType === 37) && (from === 'fmessage')) {
          if (this.acceptFriend) {
            this.robot.logger.debug('verify friend: ');
            this.robot.logger.debug(`${message.RecommendInfo}`);
            const rsp = await this.verifyFriend({
              Value: message.RecommendInfo.UserName,
              VerifyUserTicket: message.RecommendInfo.Ticket
            });
            this.robot.logger.debug(rsp);
          }
        }
      };
    });
    try {
      await Promise.all(fMessages);
    } catch (e) {
      console.log(e.stack);
    }
  }

  async verifyFriend(user) {
    let res = await this.wxApi.post({
      uri: '/webwxverifyuser',
      qs: {
        r: Date.now()
      },
      body: {
        BaseRequest: this.baseRequest,
        Opcode: 3,
        SceneList: [33],
        SceneListCount: 1,
        VerifyContent: '',
        VerifyUserList: [user],
        VerifyUserListSize: 1,
        skey: this.baseRequest.Skey
      }
    });
    return res;
  }

  _notifyHubot(from, content, groupUser, MsgId) {
    let user = new User(from, {groupUser});
    if (!this._isGroup(from && this.ignoreGroupMessage)) {
      this.robot.receive(new TextMessage(user, content, MsgId));
    }
  }

  _isGroup(username) {
    return _.startsWith(username, '@@');
  }

  _thunkify(meta, conf) {
    let _client = _.stubObject();
    _.forEach(['get', 'post'], method => {
      return _client[method] = options => {
        let domain = url.parse(meta.domain);

        let defaultOptions = {
          timeout: 32000,
          baseUrl: meta.domain,
          forever: true,
          json: true,
          pool: {
            maxSockets: Infinity
          },
          headers: {
            'Host': domain.host,
            'Cookie': this.cookie,
            'Cache-Control': 'no-cache'
          }
        };
        let proxy = process.env.HTTP_PROXY_ENDPOINT || process.env.http_proxy || process.env.https_proxy;
        if (proxy) {
          defaultOptions.proxy = proxy;
        }

        let configuredOption = _.defaultsDeep(conf, defaultOptions);
        options = _.defaultsDeep(options, configuredOption);

        return callback => {
          let r = request.defaults(options);
          return r[method](options, (err, res, body) => {
            if (!err) {
              return callback(null, body);
            } else {
              return callback(err);
            }
          });
        };
      };
    });
    return _client;
  }
}

module.exports = WechatClient;