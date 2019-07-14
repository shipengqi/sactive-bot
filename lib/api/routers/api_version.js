const {version} = require('../../../package');

module.exports = function() {
  return [
    {
      name: 'api-version',
      method: 'get',
      path: '/version',
      handler: function(ctx, next) {
        return {version: version};
      }
    },
    {
      name: 'healthz',
      method: 'get',
      path: '/healthz',
      handler: function(ctx, next) {
        return {version: version};
      }
    }
  ];
};
