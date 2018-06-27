const Log = require('log');

class Logger extends Log {
  constructor($$config) {
    super($$config.logLevel);
  }
}

module.exports = Logger;