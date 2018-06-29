const {Sbot} = require('../sbot');

module.exports = injector => {
  injector.bindClass('sbot', Sbot);
};