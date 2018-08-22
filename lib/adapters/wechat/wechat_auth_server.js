const request = require('request');
const extend = require('extend');
const fs = require('fs');
const http = require('http');
const https = require('https');
const parseString = require('xml2js').parseString;
const App = require('sactive-web');
const {
  WECHAT_ADAPTER_PREFIX,
  WECHAT_URIS
} = require('./constants');

const app = new App();

class WeChatAuthServer {
  constructor(robot) {
    this.logger = robot.logger;
    this.utils = robot.utils;
    this.uuid = null;
    this.appid = 'wx782c26e4c19acffb';
    this.fun = 'new';
    this.lang = 'zh_CN';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36';
    this.redirectUri = null;
    this.serverPort = this.utils.envs('SBOT_WECHAT_AUTH_PORT');
  }

  async getUUID() {
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} Get WeChat UUID ...`);
    let options = {
      method: 'GET',
      url: WECHAT_URIS.GETUUID,
      qs: {
        appid: this.appid,
        fun: this.fun,
        lang: this.lang,
        _: Date.now()
      }
    };
    let result = await this._apiCall(options);
    if (result === '') {
      return false;
    }
    let r = /window.QRLogin.code = (\d+); window.QRLogin.uuid = "(\S+?)"/.exec(result);
    if (Number(r[1]) === 200) {
      this.logger.info(`${WECHAT_ADAPTER_PREFIX} Get WeChat UUID successfully ...`);
      this.uuid = r[2];
      return true;
    }
    return false;
  }

  getQRCode() {
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} Get WeChat login QR code ...`);
    let self = this;
    app.route({
      name: 'getQRCode',
      method: 'get',
      path: '/login',
      handler: function(ctx, next) {
        ctx.redirect(`${WECHAT_URIS.GETQRCODE}/${self.uuid}`);
      }
    });
    app.init();
    let enableTLS = this.utils.envs('SBOT_ENABLE_TLS');
    let certFile = this.utils.envs('SBOT_CERT_FILE_PATH');
    let keyFile = this.utils.envs('SBOT_KEY_FILE_PATH');
    let isTLS = enableTLS.startsWith('y');
    let protocol = 'http';
    if (isTLS) {
      protocol = 'https';
      let options = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      };
      https.createServer(options, app.callback()).listen(Number(this.serverPort));
    } else {
      http.createServer(app.callback()).listen(Number(this.serverPort));
    }
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} 
    \n*********************************************
    \n Access ${protocol}://localhost:${this.serverPort}/login,
    \n And scan the QR code to login.
    \n*********************************************`);
  }

  async waitForLogin(tip = 1) {
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} Waiting for login with tip: ${tip}`);
    let options = {
      method: 'get',
      url: WECHAT_URIS.WAITLOGIN,
      qs: {
        tip: tip,
        uuid: this.uuid,
        _: Date.now()
      }
    };
    let result = await this._apiCall(options);
    if (result === '') {
      return false;
    }
    let code = /window.code=(\d+);/.exec(result);
    let statusCode = Number(code[1]);
    if (statusCode === 201) {
      return true;
    } else if (statusCode === 200) {
      let redirectUri = /window.redirect_uri="(\S+?)";/.exec(result);
      this.redirectUri = `${redirectUri[1]}&fun=new`;
      return true;
    } else if (statusCode === 408) {
      this.logger.warn(`${WECHAT_ADAPTER_PREFIX} Login timeout ...`);
      return false;
    } else {
      this.logger.error(`${WECHAT_ADAPTER_PREFIX} Login failed ...`);
      return false;
    }
  }

  async login() {
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} Login ...`);
    let options = {
      method: 'get',
      url: this.redirectUri
    };
    let result = await this._apiCall(options);
    if (result === '') {
      this.logger.warn(`${WECHAT_ADAPTER_PREFIX} login info is empty ...`);
      return false;
    }
    let baseRequest = await this._parseXml(result);
    if (!baseRequest.error || !baseRequest.error.skey || !baseRequest.error.wxsid || !baseRequest.error.wxuin) {
      this.logger.warn(`${WECHAT_ADAPTER_PREFIX} login info error ...`);
      this.logger.debug(result);
      return false;
    }
    return {
      skey: baseRequest.error.skey[0],
      sid: baseRequest.error.wxsid[0],
      uin: baseRequest.error.wxuin[0],
      deviceid: 'e' + Math.random().toString().substring(2, 17),
      pass_ticket: baseRequest.error.pass_ticket[0] || ''
    };
  }

  async run() {
    this.logger.info(`${WECHAT_ADAPTER_PREFIX} Web WeChat start login ...`);
    let uuid = await this.getUUID();
    if (!uuid) {
      return false;
    }
    this.getQRCode();
    while (true) {
      this.logger.info(`${WECHAT_ADAPTER_PREFIX} 
      \n*********************************************
      \n Waiting for the confirmation on your phone to login.
      \n*********************************************`);
      if (!await this.waitForLogin()) {
        continue;
      }
      if (!await this.waitForLogin(0)) {
        continue;
      }
      break;
    }
    let res = await this.login();
    if (!res) {
      this.logger.error(`${WECHAT_ADAPTER_PREFIX} Get Login info failed ...`);
    }
    return res;
  }

  _parseXml(xml) {
    return new Promise((resolve, reject) => {
      parseString(xml, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  _apiCall(options) {
    let headers = extend({}, {
      'User-Agent': this.userAgent
    }, options.headers);
    options.headers = headers;
    let proxy = process.env.HTTP_PROXY_ENDPOINT || process.env.http_proxy || process.env.https_proxy;
    if (proxy) {
      options.proxy = proxy;
    }
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        return resolve(body);
      });
    });
  }
}

module.exports = WeChatAuthServer;