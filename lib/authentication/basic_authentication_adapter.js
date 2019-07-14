let {AuthenticationAdapter} = require('./authentication_adapter');
let {STATUS_CODE, MESSAGES, JOIN_CHAR, ROUTER_URIS, AUTH_PATH} = require('../const');
let logger = require('winston');
let AuthInfo = require('./auth_info');
let uuid = require('uuid');

class BasicAuthenticationAdapter extends AuthenticationAdapter {
  constructor(robot, integrationName, authentication) {
    super(robot, integrationName, authentication);
    this.basicAuthPath = `${ROUTER_URIS.CHATOPS_CHATBOT}/${process.env.CHAT_PLATFORM_OPTION}/${process.env.HUBOT_NAME}/${AUTH_PATH.BASIC_AUTH}`;
    this.initBasicAuthRouter(integrationName);
  }

  initBasicAuthRouter(integrationName) {
    logger.info(`BasicAuthenticationAdapter integrationName: ${integrationName}`);
    logger.info(`BasicAuthenticationAdapter authentication: ${JSON.stringify(this.authentication)}`);
    let prefix = 'basic_auth_';
    let thisAdapterKey = prefix + integrationName;
    if (!(this.robot && this.robot.unifiedApp)) {
      logger.error('There is no unifiedApp in BasicAuthenticationAdapter');
      return false;
    }
    let app = this.robot.unifiedApp;
    app.set(thisAdapterKey, this);
    if (!app.get(this.basicAuthPath)) {
      logger.info(`Init the router ${this.basicAuthPath}`);
      app.post(this.basicAuthPath, (req, res) => {
        logger.info('Basic authentication request start!');
        logger.info('Login Id: ' + req.body.loginId);
        let loginInfo = this.getLoginInfo(req.body.loginId);
        let credentialCacheKey = {
          collaborationUser: loginInfo.collaborationUser,
          integrationName: loginInfo.integrationName
        };
        logger.info(`Credential cache key: ${JSON.stringify(credentialCacheKey)}`);

        let collaborationUser = loginInfo.collaborationUser;
        integrationName = loginInfo.integrationName;
        let responseMsg = loginInfo.msg;
        let commandCallback = loginInfo.callback;

        let thisAdapter = req.app.get(prefix + integrationName);

        let username = req.body.username;
        let password = req.body.password;

        let getMessage = loginResponse => {
          if (loginResponse.status_code === STATUS_CODE.SUCCESS) {
            let now = new Date();
            logger.info(`IntegrationName of BasicAuthenticationAdapter: ${integrationName}`);
            let authInfo = new AuthInfo(collaborationUser, username, password, '', '', now.getTime() / 1000);
            let authKey = integrationName + JOIN_CHAR + collaborationUser;

            thisAdapter.deleteLoginCache(req.body.loginId);
            thisAdapter.setCredentialsCache(authKey, authInfo);

            try {
              if (thisAdapter && thisAdapter.authentication && commandCallback && responseMsg) {
                logger.info('Calling for the callback function');
                if (thisAdapter.authentication.indicationCallback && responseMsg.buttonName) {
                  thisAdapter.authentication.indicationCallback(responseMsg, responseMsg.buttonName)
                    .then(resp => {
                      commandCallback(responseMsg, this.robot, authInfo);
                    });
                } else {
                  commandCallback(responseMsg, this.robot, authInfo);
                }
              }
              return MESSAGES.AUTH_SUCCESS;
            } catch (e) {
              logger.error(e);
              return MESSAGES.AUTH_SUCCESS;
            }
          } else {
            return MESSAGES.AUTH_FAILED;
          }
        };

        let message;
        logger.info(`thisAdapter.values.HUBOT_DEFAULT_TOKEN_TTL: ${thisAdapter.values.HUBOT_DEFAULT_TOKEN_TTL}`);
        if (!(thisAdapter && thisAdapter.authentication && thisAdapter.authentication.authMethod)) {
          message = MESSAGES.NO_AUTH_METHOD;
          logger.error(message);
          return res.status(STATUS_CODE.FAILED).end(message);
        }
        if (typeof (thisAdapter.authentication.authMethod) !== 'function') {
          message = MESSAGES.AUTH_METHOD_NOT_FUNCTION;
          logger.error(message);
          return res.status(STATUS_CODE.FAILED).end(message);
        }

        thisAdapter.authentication.authMethod(username, password)
          .then(resp => {
            logger.info(`Function authMethod getting response: ${resp}`);
            message = getMessage(resp);
            logger.info(message);
            logger.info(`The res.finished before calling res.end() is: ${res.finished}`);
            return res.status(resp.status_code).end(message);
          }).catch(err => {
            logger.info(`Function authMethod getting error message: ${err}`);
            return res.status(STATUS_CODE.FAILED).end(MESSAGES.FAILED_TRY_AGAIN);
          });

        let authTimeout = () => {
          message = MESSAGES.AUTH_TIMEOUT;
          logger.info(message);
          logger.info(`The res.finished is: ${res.finished}`);
          return res.status(STATUS_CODE.FAILED).end(message);
        };
        return setTimeout(authTimeout, (thisAdapter.values.HUBOT_AUTH_TTL) * 1000);
      });

      app.set(this.basicAuthPath, true);
    }

    if (!app.get(`${this.basicAuthPath}/${AUTH_PATH.IS_LOGINID_VALID}`)) {
      app.post(`${this.basicAuthPath}/${AUTH_PATH.IS_LOGINID_VALID}`, (req, res) => {
        let message;
        logger.info('Basic authentication request start!');
        logger.info('Login Id: ' + req.body.loginId);
        let loginInfo = this.getLoginInfo(req.body.loginId);
        if (loginInfo) {
          let collaborationUser = loginInfo.collaborationUser;
          integrationName = loginInfo.integrationName;

          let thisAdapter = req.app.get(prefix + integrationName);

          let authKey = integrationName + JOIN_CHAR + collaborationUser;
          thisAdapter.getCredentialsCache(authKey)
            .then(authInfo => {
              if (!authInfo) {
                message = MESSAGES.NO_AUTHORIZED_PERMISSION;
                logger.info(message);
                return res.status(STATUS_CODE.FAILED).end(message);
              } else {
                message = MESSAGES.AUTH_PASS;
                logger.info(message);
                return res.status(STATUS_CODE.SUCCESS).end(message);
              }
            });
        } else {
          message = MESSAGES.AUTH_PASS;
          logger.info(message);
          return res.status(STATUS_CODE.SUCCESS).end(message);
        }
      });

      return app.set(`${this.basicAuthPath}/${AUTH_PATH.IS_LOGINID_VALID}`, true);
    }
  }

  getLoginUrl(integrationName, collaborationUser, msg, cmdCallback) {
    return new Promise((resolve, reject) => {
      let loginId = uuid.v1();
      let loginCache = {
        integrationName: integrationName,
        collaborationUser: collaborationUser,
        msg: msg,
        callback: cmdCallback
      };

      this.setLoginInfoCache(loginId, loginCache);

      let loginUrl = `${this.values.HUBOT_LOGIN_SERVER_ENDPOINT}/chatops/login?loginId=${loginId}&integrationName=${integrationName}&platform=${process.env.CHAT_PLATFORM_OPTION}&botName=${process.env.HUBOT_NAME}`;
      return resolve(loginUrl);
    });
  }

  validateRefreshAuthInfo(authInfo) {
    return new Promise((resolve, reject) => {
      let nowTime = new Date().getTime() / 1000;
      logger.info('BasicAuthenticationAdapter validating and refreshing');
      if ((authInfo != null ? authInfo.last_access_time : undefined) && ((nowTime - authInfo.last_access_time) <= this.values.HUBOT_DEFAULT_TOKEN_TTL)) {
        authInfo.last_access_time = nowTime;
        return resolve(true);
      } else {
        return resolve(false);
      }
    });
  }
}

module.exports = BasicAuthenticationAdapter;
