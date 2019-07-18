const {JOIN_CHAR, ADAPTERS} = require('./constants');
const BasicAuthenticationAdapter = require('./basic_authentication_adapter');

// TODO support multiple auth adapters
class AuthenticationProxy {
  constructor(robot) {
    this.robot = robot;
    this.logger = robot.logger;
    this.authAdapters = {};
  }

  initAdapterForIntegration(integrationName, authentication) {
    if (!authentication) {
      this.logger.error('There is no authentication');
      return false;
    }
    let authAdapter = null;
    if (!authentication.adapter || !ADAPTERS[authentication.adapter]) {
      authentication.adapter = 'basic';
      authAdapter = new BasicAuthenticationAdapter(this.robot, integrationName, authentication);
    } else {
      this.logger.warn('Currently, only basic authentication is supported.');
    }
    this.logger.info(`Init authentication adapter ${authentication.adapter}`);
    this.authAdapters[integrationName] = authAdapter;
    return true;
  }

  getAuthAdapter(integrationName) {
    if (!integrationName) {
      this.logger.error('Args: integrationName is empty');
      return null;
    }
    return this.authAdapters[integrationName];
  }

  refreshAdapterAuthentication(integrationName, authentication) {
    if (!authentication) {
      this.logger.error('There is no authentication');
      return false;
    }
    this.logger.info(`Refreshing authentication for adapter ${authentication.adapter}`);
    this.authAdapters[integrationName].authentication = authentication;
    return true;
  }

  async getCredentialsCache(integrationName, userInfo) {
    if (!integrationName || !userInfo) {
      this.logger.error('Args: integrationName or userInfo is empty');
      return null;
    }
    let authKey = integrationName + JOIN_CHAR + Buffer.from(userInfo.name).toString('base64');
    this.logger.info(`Get cached credentials, integrationName: ${integrationName}, user: ${userInfo.name}, key: ${authKey}.`);
    return this.authAdapters[integrationName].getCredentialsCache(authKey);
  }

  deleteCredentialCache(integrationName, userInfo) {
    if (!integrationName || !userInfo) {
      this.logger.error('Args: integration name or userInfo is empty');
      return null;
    }
    this.logger.info(`Delete cached credential, integrationName: ${integrationName}, user: ${userInfo.name}`);
    let authKey = integrationName + JOIN_CHAR + Buffer.from(userInfo.name).toString('base64');
    this.authAdapters[integrationName].deleteCredentialCache(authKey);
  }

  async getLoginUrl(integrationName, userInfo, responseMsg, cmdCallback) {
    if (!userInfo || !integrationName) {
      const msg = 'Args: userInfo or integrationName is empty';
      this.logger.error(msg);
      return null;
    }
    return this.authAdapters[integrationName].getLoginUrl(integrationName, userInfo, responseMsg, cmdCallback);
  }
}

module.exports = AuthenticationProxy;
