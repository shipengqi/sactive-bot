module.exports = function() {
  return [
    {
      name: 'command-receiver',
      method: 'post',
      path: '/script/:integrationName/:callbackId',
      dependencies: ['$$robot'],
      handler: async function(ctx, next) {
        let self = this;
        let integrationName = ctx.params.integrationName;
        let callbackId = ctx.params.callbackId;
        let callbackKey = `${integrationName}_${callbackId}`;
        let callback = self.$$robot.$.APICallbacks.get(callbackKey);
        if (!callback) {
          let errMsg = `Can not find the function: ${callbackKey}`;
          self.$$robot.logger.error(errMsg);
          let e = new Error(errMsg);
          e.status = 404;
          throw e;
        }
        let info = {
          body: ctx.request.body,
          adapter: self.$$robot.adapter
        };
        return callback(info)
          .then(result => {
            return Promise.resolve(result);
          }).catch(e => {
            let errMsg = `Error response from product callback: ${callbackId}, reason = ${e.message}`;
            self.$$robot.logger.error(errMsg);
            self.$$robot.logger.debug(e);
            return Promise.reject(new Error(errMsg));
          });
      }
    }
  ];
};
