const uuid = require('uuid');
const {AuthenticationAdapter} = require('./authentication_adapter');

class BasicAuthenticationAdapter extends AuthenticationAdapter {
  async getLoginUrl(integrationName, userInfo, msg, cmdCallback) {
    let loginId = uuid.v1();
    let loginCache = {
      botName: process.env.SBOT_NAME,
      platform: process.env.ADAPTER_NAME,
      userInfo: userInfo,
      integrationName: integrationName,
      msg: msg,
      callback: cmdCallback
    };

    this.setLoginInfoCache(loginId, loginCache);

    return `${this.AUTH_ENDPOINT}/login?integrationName=${integrationName}&loginId=${loginId}`;
  }

  async validateRefreshAuthInfo(authInfo) {
    let nowTime = new Date().getTime();
    if (nowTime - authInfo.lastAccessTime <= this.TOKEN_TTL) {
      authInfo.lastAccessTime = nowTime;
      this.logger.info('BasicAuthenticationAdapter refreshing');
      return true;
    } else {
      this.logger.info('BasicAuthenticationAdapter expired');
      return false;
    }
  }
}

module.exports = BasicAuthenticationAdapter;
