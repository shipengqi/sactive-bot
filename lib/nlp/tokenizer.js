const _ = require('lodash');

class Tokenizer {
  trim(array) {
    while (array[array.length - 1] === '') {
      array.pop();
    }

    while (array[0] === '') {
      array.shift();
    }

    return array;
  }
}

class RegexpTokenizer extends Tokenizer {
  constructor(options = {}) {
    super();
    this._pattern = options.pattern || this._pattern;
    this.discardEmptyStr = options.discardEmptyStr || true;

    // Match and split on GAPS not the actual WORDS
    this._gaps = options.gaps || true;
  }

  tokenize(string) {
    let results;

    if (this._gaps) {
      results = string.split(this._pattern);
      if (this.discardEmptyStr) {
        results = _.without(results, '', ' ');
      }
      results = _.map(results, item => {
        return item.trim();
      });
      return results;
    } else {
      return string.match(this._pattern);
    }
  }
}

class WordTokenizer extends RegexpTokenizer {
  constructor(options) {
    super(options);
    this._pattern = /[^A-Za-zАа-я-Я0-9_`~!@#%&="',;/:<>$()*\-+.[\]?\\^{}|]+/;
  }
}

module.exports = {
  WordTokenizer,
  RegexpTokenizer,
  Tokenizer
};
