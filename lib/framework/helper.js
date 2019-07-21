// const natural = require('natural');
// let tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});
// const {WordTokenizer} = require('../nlp/tokenizer');
// let tokenizer = new WordTokenizer();

class Helper {
  constructor($$sbot) {
    this.commands = $$sbot.$.commands;
  }

  parsing(words) {
    // let words = tokenizer.tokenize(command);
    // first word must be botName or @botName
    // second word must be `help`
    // help for module
    if (words[2] && !words[3]) {
      return this.showHelpForModule(words[2]);
    }
    return this.showHelp(words[0].replace('@', ''));
  }

  showHelp(botName) {
    let helpString = `Help for \`${botName}\`:`;
    if (this.commands.size === 0) {
      helpString += '\n\nThere is no modules.';
      return helpString;
    }
    helpString += '\n\nSupported modules:';
    for (let [key, value] of this.commands.entries()) {
      helpString += `\n\`${key}\`: ${value.desc}`;
    }
    helpString += '\nTo list available commands and respective description:';
    helpString += '\n`help [module_name]`       `e.g: help example`';
    return helpString;
  }

  showHelpForModule(module) {
    let moduleName = module.toLowerCase();
    let helpString = `The following commands are available for the \`${module}\` module:`;
    if (!this.commands.has(moduleName)) {
      helpString = '\n\nThere is no available commands.';
      return helpString;
    }
    let subs = this.commands.get(moduleName).subs;
    if (subs.size === 0) {
      helpString = '\n\nThere is no available commands.';
      return helpString;
    }
    for (let [key, value] of subs.entries()) {
      helpString += `\n\`${key}\`: ${value}`;
    }
    return helpString;
  }
}

module.exports = Helper;