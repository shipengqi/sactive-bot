const AutoInfo = require('../../authentication/authinfo_wrapper');
const {JOIN_CHAR} = require('../../authentication/constants');

module.exports = function() {
  return [
    {
      name: 'login',
      method: 'get',
      path: '/login',
      config: {baseUrl: false},
      template: 'index.html',
      handler: function(ctx, next) {
        return {};
      }
    },
    {
      name: 'auth',
      method: 'post',
      path: '/login',
      config: {baseUrl: false},
      dependencies: ['$$robot'],
      handler: async function(ctx, next) {
        let self = this;
        self.$$robot.logger.info('Authentication start!');
        let loginId = ctx.request.query.loginId;
        let integrationName = ctx.request.query.integrationName;
        let username = ctx.request.body.username;
        let password = ctx.request.body.password;

        let authAdapter = self.$$robot.$.authProxy.getAuthAdapter(integrationName);
        if (!authAdapter) {
          let e = new Error('IntegrationName is invalid');
          e.status = 400;
          throw e;
        }
        let loginInfo = authAdapter.getLoginInfo(loginId);
        if (!loginInfo) {
          let e = new Error('LoginId is invalid');
          e.status = 400;
          throw e;
        }

        let userInfo = loginInfo.userInfo;
        let responseMsg = loginInfo.msg;
        let commandCallback = loginInfo.callback;
        let auth = authAdapter.getAuthentication(integrationName);
        try {
          let resp = await auth.authHandler(username, password, userInfo);
          self.$$robot.logger.info(`IntegrationName: ${integrationName}.authHandler getting response: ${resp}`);
          authAdapter.deleteLoginCache(loginId, integrationName);
          let autoInfo = new AutoInfo(userInfo, username, password, new Date().getTime());
          let authKey = integrationName + JOIN_CHAR + Buffer.from(userInfo.name).toString('base64');
          self.$$robot.logger.info(`Set credentials cache IntegrationName: ${integrationName}, user: ${userInfo.name}.`);
          authAdapter.setCredentialsCache(authKey, autoInfo);
          commandCallback(responseMsg);
          return {};
        } catch (err) {
          self.$$robot.logger.error(`IntegrationName: ${integrationName}.authHandler getting error message: ${err.message}`);
          self.$$robot.logger.debug(err);
          return {};
        }
        // TODO setTimeout for auth
      }
    }
  ];
};
