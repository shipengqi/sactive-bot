const natural = require('natural');
let tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});
const logPrefix = '[Misspelling]';

class NLP {
  constructor($$sbot, $$utils, $$constants) {
    this.utils = $$utils;
    this.robot = $$sbot;
    this._constants = $$constants;
    this.MINIMUM_SIMILARITY = Number($$utils.envs('SBOT_MINIMUM_SIMILARITY'));
  }

  misspelling(command) {
    let result = {
      isHelp: false,
      isCommand: false,
      similarList: []
    };
    let integrations = [];
    let fullCommands = [];
    let fakeCommand = '';
    let commands = this.robot.$.commands;
    let words = tokenizer.tokenize(command);
    // first word must be botName or @botName
    // the second word is empty
    if (!words[1]) {
      return result;
    }
    // To determine whether the second word is `help`
    let helpSimilarity = natural.JaroWinklerDistance(words[1], this._constants.HELP_WORD);
    // The second word is `help`
    this.robot.logger.debug(`${logPrefix} ${command} is help, similarity: ${helpSimilarity}`);
    if (helpSimilarity > this.MINIMUM_SIMILARITY) {
      result.isHelp = true;
      result.isCommand = true;
      return result;
    }
    // The second word is not `help`
    // To determine whether the second word is integration name, push into integrations
    integrations = integrations.concat(this._getSimilarStrings(words[1], commands.keys()));

    // The second word is integration name
    // Then To determine whether the third word and fourth word are verb and entity
    if (integrations.length > 0) {
      // The third word is empty
      if (!words[2]) {
        return result;
      }
      fakeCommand = `${words[2]} ${words[3]}`;
      // The fourth word is empty
      if (!words[3]) {
        fakeCommand = words[2];
      }
      for (let integration of integrations) {
        let subCommands = commands.get(integration.command).subs;
        fullCommands = fullCommands.concat(this._getSimilarStrings(fakeCommand, subCommands.keys(), integration.command));
      }
      result.isCommand = true;
      result.similarList = fullCommands;
      return result;
    }
    // Cannot find any integrations, try to find all similar sub commands
    this.robot.logger.debug(`${logPrefix} ${command} cannot match any integrations.`);
    // If cannot find integration, then suppose the second word is verb
    fakeCommand = `${words[1]} ${words[2]}`;
    // The third word is empty
    if (!words[2]) {
      fakeCommand = words[1];
    }
    for (let [integration, commandInfo] of commands.entries()) {
      fullCommands = fullCommands.concat(this._getSimilarStrings(fakeCommand, commandInfo.subs.keys(), integration));
    }
    result.isCommand = true;
    result.similarList = fullCommands;
    return result;
  }
  // if integration is not empty, then splices integration and command together, try to get the full commands
  _getSimilarStrings(string, subCommands, integration) {
    let similarCommands = [];
    for (let command of subCommands) {
      let supposedFullCommand = integration ? `${integration} ${command}` : command;
      let originString = integration ? `${integration} ${string}` : string;
      let similarity = natural.JaroWinklerDistance(originString, supposedFullCommand);
      if (similarity === 1) {
        similarCommands = [{
          similarity: similarity,
          command: supposedFullCommand
        }];
        break;
      }
      if (similarity > this.MINIMUM_SIMILARITY) {
        similarCommands.push({
          similarity: similarity,
          command: supposedFullCommand
        });
      }
    }
    return similarCommands;
  }
}

module.exports = NLP;