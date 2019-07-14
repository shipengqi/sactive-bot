let {DEFAULT_TOKEN_TTL, DEFAULT_AUTH_TIMEOUT} = require('./constants');

class AuthenticationAdapter {
  constructor(robot, integrationName, authentication) {
    this.robot = robot;
    this.logger = robot.logger;
    this.integrationName = integrationName;
    this.authentication = authentication;
    // Default to 1800 seconds token expiration
    this.TOKEN_TTL = authentication ? authentication.TOKEN_TTL : DEFAULT_TOKEN_TTL;
    // Default to 60 * 5 seconds authMethod timeout
    this.AUTH_TIMEOUT = authentication ? authentication.AUTH_TIMEOUT : DEFAULT_AUTH_TIMEOUT;
    this.credentialsCache = new Map();
    this.loginCache = new Map();
  }

  getCredentialsCache(authKey) {
    return new Promise((resolve, reject) => {
      let authInfo = this.credentialsCache.get(authKey);
      if (!authInfo) {
        resolve(null);
      }
      return this.validateRefreshAuthInfo(authInfo)
        .then(res => {
          if (res) {
            return resolve(this.credentialsCache.get(authKey));
          } else {
            if (this.credentialsCache.has(authKey)) {
              this.credentialsCache.delete(authKey);
            }
            return resolve(null);
          }
        }).catch(e => {
          if (this.credentialsCache.has(authKey)) {
            this.credentialsCache.delete(authKey);
          }
          return resolve(null);
        });
    });
  }

  setCredentialsCache(authKey, authInfo) {
    this.logger.info(`Set credentials cache by authKey: ${authKey}.`);
    this.credentialsCache.set(authKey, authInfo);
  }

  deleteCredentialCache(authKey) {
    this.logger.info(`Delete credentials cache: ${authKey}.`);
    if (this.credentialsCache.has(authKey)) {
      this.credentialsCache.delete(authKey);
    }
  }

  setLoginInfoCache(loginId, loginInfo) {
    this.logger.info(`Set login info cache by loginId: ${loginId}`);
    this.loginCache.set(loginId, loginInfo);
  }

  getLoginInfo(loginId) {
    return this.loginCache.get(loginId);
  }

  deleteLoginCache(loginId) {
    this.logger.info(`Delete login info cache: ${loginId}.`);
    if (this.loginCache.has(loginId)) {
      this.loginCache.delete(loginId);
    }
  }

  // TODO: revise, this is an empty stub?
  getLoginUrl(integrationName, collaborationUser, msg, cmdCallback) {}

  // TODO: revise, this is an empty stub?
  validateRefreshAuthInfo(authInfo) {}
}

module.exports = {AuthenticationAdapter};
