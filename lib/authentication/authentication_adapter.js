const os = require('os');
const {
  DEFAULT_TOKEN_TTL,
  DEFAULT_AUTH_TIMEOUT
} = require('./constants');
let {CREDENTIALS_CACHE, LOGIN_CACHE} = require('./authentication_cache');
class AuthenticationAdapter {
  constructor(robot, integrationName, authentication) {
    this.robot = robot;
    this.logger = robot.logger;
    this.integrationName = integrationName;
    this.authentication = authentication;
    // Default to 1800 seconds token expiration
    this.TOKEN_TTL = authentication.TOKEN_TTL ? authentication.TOKEN_TTL * 1000 : DEFAULT_TOKEN_TTL;
    // Default to 60 * 5 seconds authHandler timeout
    this.AUTH_TIMEOUT = authentication.AUTH_TIMEOUT ? authentication.AUTH_TIMEOUT * 1000 : DEFAULT_AUTH_TIMEOUT;
    let protocol = 'http';
    if (process.env.SBOT_ENABLE_TLS.startsWith('y')) {
      protocol = 'https';
    }
    this.AUTH_ENDPOINT = `${protocol}://${process.env.SBOT_SERVER_HOST || os.hostname()}:${process.env.SBOT_SERVER_PORT}`;
  }

  async getCredentialsCache(authKey) {
    let authInfo = CREDENTIALS_CACHE.get(authKey);
    if (!authInfo) {
      return null;
    }
    let result = await this.validateRefreshAuthInfo(authInfo);
    if (result) {
      return authInfo;
    } else {
      CREDENTIALS_CACHE.delete(authKey);
      return null;
    }
  }

  setCredentialsCache(authKey, authInfo) {
    this.logger.info(`Set credentials cache by authKey: ${authKey}.`);
    CREDENTIALS_CACHE.set(authKey, authInfo);
  }

  deleteCredentialCache(authKey) {
    this.logger.info(`Delete credentials cache: ${authKey}.`);
    if (CREDENTIALS_CACHE.has(authKey)) {
      CREDENTIALS_CACHE.delete(authKey);
    }
  }

  setLoginInfoCache(loginId, loginInfo) {
    this.logger.info(`Set login info cache by loginId: ${loginId}`);
    LOGIN_CACHE.set(loginId, loginInfo);
  }

  getLoginInfo(loginId) {
    this.logger.info(`Get login info cache: ${loginId}.`);
    return LOGIN_CACHE.get(loginId);
  }

  getAuthentication() {
    this.logger.info(`Get authentication for: ${this.integrationName}.`);
    return this.authentication;
  }

  deleteLoginCache(loginId) {
    this.logger.info(`Delete login info cache: ${loginId}.`);
    if (LOGIN_CACHE.has(loginId)) {
      LOGIN_CACHE.delete(loginId);
    }
  }

  // TODO: revise, this is an empty stub?
  async getLoginUrl(integrationName, userInfo, msg, cmdCallback) {}

  // TODO: revise, this is an empty stub?
  async validateRefreshAuthInfo(authInfo) {}
}

module.exports = {AuthenticationAdapter};
