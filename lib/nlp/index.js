const natural = require('natural');

class NLP extends natural.BayesClassifier {
  constructor($$constants, $$utils) {
    super();
    this._constants = $$constants;
    this.utils = $$utils;
  }
  storeTrainingData(file) {
    this.save(file, (err, classifier) => {
      // the classifier is saved to the classifier.json file!
    });
  }

  training() {

  }
}

module.exports = NLP;