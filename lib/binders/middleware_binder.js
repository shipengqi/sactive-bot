const middlewares = require('../middlewares');

module.exports = injector => {
  injector.bindInstance('middlewares', middlewares);
};