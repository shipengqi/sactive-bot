module.exports = function() {
  return [
    {
      name: 'command-receiver',
      method: 'post',
      path: '/script/:integrationName/:callbackId',
      dependencies: ['$$robot'],
      handler: function(ctx, next) {
        let self = this;
        let integrationName = ctx.params.integrationName;
        let callbackId = ctx.params.callbackId;
        let callbackKey = `${integrationName}_${callbackId}`;
        let callback = self.$$robot.$.APICallbacks.get(callbackKey);
        if (!callback) {
          let errMsg = `Can not find the function: ${callbackKey}`;
          self.$$robot.logger.error(errMsg);
          return new Error(errMsg);
        }
        let info = {
          body: ctx.body,
          adapter: self.$$robot.adapter
        };
        callback(info)
          .then(result => {
            self.$$robot.logger.debug(result);
            return result;
          }).catch(e => {
            let errMsg = `Error response from product callback: ${callbackId}, reason = ${e.message}`;
            self.$$robot.robot.logger.error(errMsg);
            self.$$robot.robot.logger.debug(e);
            return e;
          });
      }
    }
  ];
};
