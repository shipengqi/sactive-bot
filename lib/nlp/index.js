const natural = require('natural');

class NLP extends natural.BayesClassifier {
  constructor($$utils) {
    super();
    this.utils = $$utils;
  }
}

module.exports = NLP;