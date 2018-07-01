const _ = require('lodash');
const {
  JaroWinklerDistance
} = require('./distance');
const {
  WordTokenizer
} = require('./tokenizer');
const {
  DEFAULT_MINIMUM_SIMILARITY
} = require('./constants');
const {
  HELP_WORDS
} = require('../const');
class NaturalLanguageProcess {
  constructor(robot, options = {}) {
    this.robot = robot;
    // todo enhance minimum similarity
    this.minimumSimilarity = options.minimumSimilarity || DEFAULT_MINIMUM_SIMILARITY;
  }

  misspellingProcess(command) {
    this.robot.logger.info('Start misspelling process: ', command);
    let commands = this.robot.commands;
    let registrar = this.robot.e.registrar;
    let wordTokenizer = new WordTokenizer({discardEmptyStr: true});
    let tokenizedWords = wordTokenizer.tokenize(command);
    let originalString = tokenizedWords.join(' ');
    // remove bot name
    let botName = tokenizedWords.shift();
    let oldStringWithoutBot = tokenizedWords.join(' ');
    let stingWithoutBot = tokenizedWords.join(' ');
    let similarStrings = [];
    let similarHelpStrings = [];
    let parameterArr = stingWithoutBot.split(' ');
    let parameterString;
    let withIntegration = true;
    let resultObj = {
      status: {},
      list: []
    };

    /*
    _.each(tokenizedWords, (value, key) => {
      if (key > 2) {
        return false;
      }
      results.push(this._analyzeString(value));
    });
    */
    if (!tokenizedWords[0]) {
      resultObj.status = {
        str: oldStringWithoutBot,
        targetStr: stingWithoutBot,
        actualStr: `${botName} ${stingWithoutBot}`,
        similarity: 0,
        isHelp: false,
        isCommand: false
      };
      return resultObj;
    }

    _.each(HELP_WORDS, helpword => {
      let helpSim = this._getSimilarity(tokenizedWords[0], helpword);
      if (helpSim.similarity > this.minimumSimilarity) {
        similarHelpStrings.push(helpSim);
      }
    });
    if (similarHelpStrings.length > 0) {
      similarHelpStrings.sort((x, y) => { return y.similarity - x.similarity; });
      tokenizedWords[0] = similarHelpStrings[0].targetStr;
      stingWithoutBot = tokenizedWords.join(' ');
    }

    if (HELP_WORDS.includes(tokenizedWords[0])) {
      resultObj.status = {
        str: oldStringWithoutBot,
        targetStr: stingWithoutBot,
        actualStr: `${botName} ${stingWithoutBot}`,
        similarity: similarHelpStrings[0].similarity,
        isHelp: true,
        isCommand: true
      };
      return resultObj;
    }

    let integrations = this._map(registrar.apps, tokenizedWords[0]);
    let oriString = '';

    if (integrations.length < 1) {
      this.robot.logger.info('Cannot find any integrations.');
      withIntegration = false;
      oriString = tokenizedWords[0];
      parameterArr.shift();
      if (tokenizedWords[1]) {
        oriString += ` ${tokenizedWords[1]}`;
        parameterArr.shift();
      }
    } else {
      integrations.sort((x, y) => { return y.similarity - x.similarity; });
      oriString = integrations[0].targetStr;
      parameterArr.shift();
      if (tokenizedWords[1]) {
        parameterArr.shift();
        oriString += ` ${tokenizedWords[1]}`;
      }
      if (tokenizedWords[2]) {
        parameterArr.shift();
        oriString += ` ${tokenizedWords[2]}`;
      }
    }

    _.each(commands, item => {
      let tempWords = wordTokenizer.tokenize(item);
      let targetString = `${tempWords[0]} ${tempWords[1]}`;
      if (tempWords[2]) {
        targetString += ` ${tempWords[2]}`;
      }
      if (!withIntegration) {
        targetString = `${tempWords[1]}`;
        if (tempWords[2]) {
          targetString += ` ${tempWords[2]}`;
        }
      }
      let verbAndEntitySim = this._getSimilarity(oriString, targetString);
      if (verbAndEntitySim.similarity > this.minimumSimilarity) {
        verbAndEntitySim.targetStr = item;
        similarStrings.push(verbAndEntitySim);
      }
    });
    if (similarStrings.length < 1) {
      resultObj.status = {
        str: oldStringWithoutBot,
        targetStr: stingWithoutBot,
        actualStr: originalString,
        similarity: 1,
        isHelp: false,
        isCommand: false
      };
      return resultObj;
    }
    similarStrings.sort((x, y) => { return y.similarity - x.similarity; });
    let tempArr = _.cloneDeep(similarStrings);
    let list = _.map(tempArr, item => {
      if (parameterArr.length > 0) {
        let tempParameterString = parameterArr.join(' ');
        item.str = oldStringWithoutBot;
        item.targetStr = item.targetStr + ` ${tempParameterString}`;
      }
      item.actualStr = `${botName} ${item.targetStr}`;
      return item;
    });

    let final = similarStrings[0];
    if (parameterArr.length > 0) {
      parameterString = parameterArr.join(' ');
      final.str = oldStringWithoutBot;
      final.targetStr = final.targetStr + ` ${parameterString}`;
    }
    final.actualStr = `${botName} ${final.targetStr}`;
    if (!withIntegration) {
      let tempWords = wordTokenizer.tokenize(final.targetStr);
      tempWords.shift();
      final.targetStr = tempWords.join(' ');
    }
    final.isHelp = false;
    final.isCommand = true;
    resultObj.status = final;
    resultObj.list = list;
    return resultObj;
  }

  _analyzeString(str) {
    let integrations = [];
    let verbs = [];
    let entities = [];
    let registrar = this.robot.e.registrar;
    integrations = this._map(registrar.apps, str);
    _.each(registrar.apps, (app, appKey) => {
      let newVerbs = this._map(app.verbs, str);
      if (newVerbs.length > 0) {
        verbs.push({
          integration: appKey,
          verbs: newVerbs
        });
      }
      _.each(app.verbs, (entity, verbKey) => {
        let newEntities = this._map(entity.entities, str);
        if (newEntities.length > 0) {
          entities.push({
            integration: appKey,
            verb: verbKey,
            entities: newEntities
          });
        }
      });
    });

    return {
      integrations,
      verbs,
      entities
    };
  }

  _map(obj, str) {
    return _.chain(obj)
      .map((value, key) => {
        return this._getSimilarity(str, key);
      })
      .filter(value => {
        return value.similarity >= this.minimumSimilarity;
      })
      .value();
  }

  _getSimilarity(str, targetStr) {
    let analyzeResult = {};
    analyzeResult.similarity = JaroWinklerDistance(str, targetStr);
    analyzeResult.str = str;
    analyzeResult.targetStr = targetStr;
    return analyzeResult;
  }
}

module.exports = NaturalLanguageProcess;
