const natural = require('natural');

class NLP extends natural.BayesClassifier {
  constructor($$constants, $$utils) {
    super();
    this._constants = $$constants;
    this.utils = $$utils;
  }
}

module.exports = NLP;