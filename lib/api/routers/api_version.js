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
    }
  ];
};
