const natural = require('natural');
let tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});

class NLP {
  constructor($$sbot, $$utils, $$constants) {
    this.utils = $$utils;
    this.robot = $$sbot;
    this._constants = $$constants;
    this.MINIMUM_SIMILARITY = $$utils.envs('SBOT_MINIMUM_SIMILARITY');
  }

  misspelling(command) {
    let result = {
      str: command,
      targetStr: command,
      isHelp: false,
      isCommand: false,
      similarity: 0,
      similarList: []
    };
    let integrations = [];
    let commands = this.robot.$.commands;
    let words = tokenizer.tokenize(command);
    // first word must be bot name or @bot name
    let botName = words[0];
    // To determine whether the second word is `help`
    let helpSimilarity = natural.JaroWinklerDistance(words[1], this._constants.HELP_WORD);
    if (helpSimilarity > this.MINIMUM_SIMILARITY) {
      result.isHelp = true;
      result.isCommand = true;
      result.similarity = helpSimilarity;
      return result;
    }
    // The second word is not `help`
    // To determine whether the second word is integration name, push into integrations
    for (let integrationName of commands.keys()) {
      let integrationSimilarity = natural.JaroWinklerDistance(words[1], integrationName);
      if (integrationSimilarity > this.MINIMUM_SIMILARITY) {
        integrations.push({
          name: integrationName,
          similarity: integrationSimilarity
        });
      }
    }
    // The second word is integration name
    // Then To determine whether the third word and fourth word are verb and entity
    if (integrations > 0) {
      for (let value of integrations) {
        let commandInfos = commands.get(value.name).subs;
        for (let command of commandInfos.keys()) {
          let verbAndEntitySim = natural.JaroWinklerDistance(`${words[2]} ${words[3]}`, command);
          if (verbAndEntitySim > this.MINIMUM_SIMILARITY) {
            result.similarList.push({
              similarity: verbAndEntitySim,
              command: command
            });
          }
        }
      }
      return result;
    }
  }
}

module.exports = NLP;