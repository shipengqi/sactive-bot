const logger = require('winston');
const {JOIN_CHAR} = require('../const');

class AuthenticationProxy {
  constructor(robot) {
    this.robot = robot;
    this.authAdapters = {};
  }

  initAdapterForIntegration(integrationName, authentication) {
    if (!authentication) {
      logger.error('There is no authentication');
      return false;
    }
    const authAdapter = new (require(`./${authentication.adapter}`))(this.robot, integrationName, authentication);
    logger.info(`Init authentication adapter ${authentication.adapter}`);
    this.authAdapters[integrationName] = authAdapter;
    return true;
  }

  refreshAdapterAuthentication(integrationName, authentication) {
    if (!authentication) {
      logger.error('There is no authentication');
      return false;
    }
    logger.info(`Refreshing authentication for adapter ${authentication.adapter}`);
    this.authAdapters[integrationName].authentication = authentication;
    return true;
  }

  getCredentialsCache(integrationName, collaborationUser) {
    if (!integrationName || !collaborationUser) {
      logger.error('Empty integrationName or collaborationUser');
      return null;
    }
    logger.info(`Get cached credentials, integrationName: ${integrationName}, collaborationUser: ${collaborationUser}.`);
    let authKey = integrationName + JOIN_CHAR + collaborationUser;
    return this.authAdapters[integrationName].getCredentialsCache(authKey);
  }

  deleteCredentialCache(integrationName, collaborationUser) {
    if (!integrationName || !collaborationUser) {
      logger.error('Empty integrationName or collaborationUser');
      return null;
    }
    logger.info(`Delete cached credential, integrationName: ${integrationName}, ` +
      `collaborationUser: ${collaborationUser}`);
    let authKey = integrationName + JOIN_CHAR + collaborationUser;
    this.authAdapters[integrationName].deleteCredentialCache(authKey);
  }

  getLoginUrl(integrationName, collaborationUser, responseMsg, cmdCallback) {
    if (!collaborationUser) {
      const msg = 'Empty collaborationUser';
      logger.error(msg);
      return null;
    }
    return this.authAdapters[integrationName].getLoginUrl(integrationName, collaborationUser, responseMsg, cmdCallback);
  }
}

module.exports = AuthenticationProxy;
