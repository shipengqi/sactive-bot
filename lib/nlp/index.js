const _ = require('lodash');
const natural = require('natural');
let tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});
const logPrefix = '[Misspelling]';

class NLP {
  constructor($$sbot, $$utils, $$constants) {
    this.utils = $$utils;
    this.logger = $$sbot.logger;
    this.$ = $$sbot.$;
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
    let parameters = null;
    let fakeCommand = '';
    let commands = this.$.commands;
    let words = tokenizer.tokenize(command);
    parameters = _.clone(words);
    // first word must be botName or @botName
    let botName = words[0].replace('@', '');
    // shift the botName of parameters
    parameters.shift();
    // the second word is empty
    if (!words[1]) {
      return result;
    }
    // shift the integrationName or `help` of parameters
    parameters.shift();
    // To determine whether the second word is `help`
    let helpSimilarity = natural.JaroWinklerDistance(words[1], this._constants.HELP_WORD);
    // The second word is `help`
    this.logger.debug(`${logPrefix} '${command}' help similarity: ${helpSimilarity}`);
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
        // shift the verb of parameters
        parameters.shift();
      } else {
        // shift the verb and entity of parameters
        parameters.shift();
        parameters.shift();
      }
      for (let integration of integrations) {
        let subCommands = commands.get(integration.command).subs;
        fullCommands = fullCommands.concat(this._getSimilarStrings(fakeCommand, subCommands.keys(), {
          integrationName: integration.command,
          botName: botName,
          parameters: parameters
        }));
      }

      result.similarList = fullCommands;
      if (fullCommands.length > 0) {
        result.isCommand = true;
      }
      return result;
    }

    // Cannot find any integrations, try to find all similar sub commands
    this.logger.debug(`${logPrefix} '${command}' cannot match any integrations.`);
    // If cannot find integration, then suppose the second word is verb
    fakeCommand = `${words[1]} ${words[2]}`;
    // The third word is empty
    if (!words[2]) {
      fakeCommand = words[1];
      // shift the verb of parameters
      parameters.shift();
    } else {
      // just shift the verb of parameters, cause the command may not contain entity
      parameters.shift();
      // parameters.shift();
    }
    for (let [integration, commandInfo] of commands.entries()) {
      fullCommands = fullCommands.concat(this._getSimilarStrings(fakeCommand, commandInfo.subs.keys(), {
        integrationName: integration,
        botName: botName,
        parameters: parameters
      }));
    }

    result.similarList = fullCommands;
    if (fullCommands.length > 0) {
      result.isCommand = true;
    }
    return result;
  }
  // if prefix is not empty, then splices info(botName, integrationName, parameters) and command, parameters together, try to get the full commands
  _getSimilarStrings(string, subCommands, info = {}) {
    let similarCommands = [];
    for (let command of subCommands) {
      let supposedCommand = info.integrationName ? `${info.integrationName} ${command}` : command;
      // let originString = info.integrationName ? `${info.integrationName} ${string}` : string;
      let supposedFullCommand = info.botName ? `${info.botName} ${info.integrationName} ${command}` : command;
      if (info.parameters && info.parameters.length > 0) {
        let paramsString = info.parameters.join(' ');
        supposedCommand += ` ${paramsString}`;
        supposedFullCommand += ` ${paramsString}`;
      }
      let similarity = natural.JaroWinklerDistance(string, command);
      if (similarity === 1) {
        similarCommands = [{
          similarity: similarity,
          command: supposedCommand,
          fullCommand: supposedFullCommand
        }];
        break;
      }
      if (similarity > this.MINIMUM_SIMILARITY) {
        similarCommands.push({
          similarity: similarity,
          command: supposedCommand,
          fullCommand: supposedFullCommand
        });
      }
    }
    return similarCommands;
  }
}

module.exports = NLP;