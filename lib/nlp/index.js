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
    // the second word is empty
    if (!words[1]) {
      return result;
    }
    // To determine whether the second word is `help`
    let helpSimilarity = natural.JaroWinklerDistance(words[1], this._constants.HELP_WORD);
    if (helpSimilarity > this.MINIMUM_SIMILARITY) {
      result.isHelp = true;
      result.isCommand = true;
      result.similarity = helpSimilarity;
      // The second word is `help`
    }
    // The second word is not `help`
    // To determine whether the second word is integration name, push into integrations
    integrations = this._getSimilarStrings(words[1], commands.keys());

    // The second word is integration name
    // Then To determine whether the third word and fourth word are verb and entity
    if (integrations > 0) {
      for (let value of integrations) {
        let subCommands = commands.get(value.name).subs;
        this._getSimilarStrings(`${words[2]} ${words[3]}`, subCommands.key());
      }
      return result;
    }
  }

  _getSimilarStrings(string, subCommands) {
    let similarCommands = [];
    for (let command of subCommands) {
      let similarity = natural.JaroWinklerDistance(string, command);
      if (similarity > this.MINIMUM_SIMILARITY) {
        similarCommands.push({
          similarity: similarity,
          command: command
        });
        if (similarity === 1) {
          similarCommands = [{
            similarity: similarity,
            command: command
          }];
          break;
        }
      }
    }
    return similarCommands;
  }

  _getSimilarity(str, targetStr) {
    let result = {};
    result.similarity = natural.JaroWinklerDistance(str, targetStr);
    result.str = str;
    result.targetStr = targetStr;
    return result;
  }
}

// flow
// 先比较是否是help，help 另做处理
// 如果不是help 比较第一个单词是否是integration
// 如果是integration，相似度为1，直接查找该integration下的命令，否则比较所有相似的integration下的命令
// 如果不是integration，查找所有子命令，相似度为1，直接返回，小于1，返回相似的命令
module.exports = NLP;