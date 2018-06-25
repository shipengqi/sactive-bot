const _ = require('lodash');
const Matcher = require('did-you-mean');
const Commons = require('../commons');
const fs = require('fs');
const {
  ADAPTER_MAPPINGS,
  ENV_FILE_TYPE,
  ORIGINAL_RESPONSE_MSG
} = require('../const');
const logger = require('winston');
const I18nConfigure = require('../i18n/i18n_configure');
const {getIdFromRoom} = require('../utils/functionUtils');

class Help {
  // constructor for help
  //  robot: hubot robot object
  //  helpWords: help key-words array
  constructor(robot, helpWords) {
    this.robot = robot;
    this.commons = new Commons();
    this.helpWords = helpWords;
    this.i18nConfigure = new I18nConfigure(this.robot);
    // @i18nCache: store i18n binding object
    //   i18n: the current channel/user/hubot i18n binding object
    //   _i18n: the product i18n binding object
    this.i18nCache = {i18n: {}, _i18n: {}};
  }

  // give best matched word
  //
  //  words_arr: array of words to match from
  //  word: word to match
  //  threshold: minimal score to show (levenshtein algorythm threshold)
  //
  fuzzyMatch(words_arr, word, threshold) {
    // Create a matcher with a list of values
    if (threshold == null) { threshold = 2; }
    let matcher = new Matcher(words_arr.join(' ')).setThreshold(threshold)
      .ignoreCase();
    // Get the closest match
    if (matcher.get(word)) {
      return matcher.get(word);
    } else {
      return '';
    }
  }

  // process help and show message (accept hubot middleware)
  //  msg: hubot message object (context.response)
  //  registrar: HE registrar object
  processHelp(msg, registrar) {
    // get the i18n api with the msg
    let id = msg.envelope.message.room;
    if (ADAPTER_MAPPINGS.get(this.robot.adapterName) === 'msteams') {
      if (id.startsWith('19:')) {
        let str = id.substr(3).split('@')[0];
        id = getIdFromRoom(str);
      }
    }
    if (!this.i18nConfigure.getChatRoomRegister(id)) {
      this.i18nConfigure.registerI18nForChatRooms(id);
    }
    this.i18nCache.i18n = this.i18nConfigure.getChatRoomRegister(id);
    // build help regex from help workds array
    let help_re = this.robot.respondPattern(new RegExp(`(${this.helpWords.join('|')})` +
      '[ ]?([a-zA-Z\\-]+)?[ ]?([a-zA-Z\\-]+)?', 'i'));
    if (msg.match = msg.message.text.match(help_re)) {
      if (!((msg.match[2] !== undefined) && (msg.match[3] === undefined))) {
        let help = this.showHelp(registrar, msg.match[2], msg.match[3]);
        this.robot.logger.debug(help);
        this.robot.logger.debug(`msg.message.text: ${msg.message.text}`);
        // if found integration: display only HE help
        if (help.found_app === true) {
          this.robot.logger.debug('Help: KILL MESSAGE CHAIN');
          msg.message.finish();
        } else {
          // changing current keyword to help: for hubot-help to work
          msg.message.text = msg.message.text.replace(msg.match[1], 'help');
        }
        this.robot.logger.debug('Showing enterprise help');
        return msg.reply(help.text);
      } else {
        let entity = msg.match[2];
        return msg.reply(this.listCommandsForHelp(registrar, entity).text);
      }
    }
  }

  // return enterprise help as string
  //
  // registrar: HE registrar object
  // verb: verb
  // entity: entity
  //
  showHelp(registrar, verb, entity) {
    // TODO: use Cha to display
    // TODO: refactor based on UI/UX team specs
    let app, item;
    let res = {
      text: '',
      found_app: false
    };

    let obj = this.getModuels(registrar);
    if (entity) {
      if (!obj.moduleMap[entity]) {
        res.text += this.i18nCache.i18n.__('{{noSuchModuleString}}', {module: entity});
        if (this.fuzzyMatch(Object.keys(obj.moduleMap), entity) !== '') {
          let matchEntity = this.fuzzyMatch(Object.keys(obj.moduleMap), entity);
          res.text += this.i18nCache.i18n.__('{{didYouMeanString}}', {name: matchEntity}) + '\n' + this.showHelp(registrar, verb, matchEntity).text;
        } else {
          res.text += this.showHelp(registrar).text;
        }
      } else {
        let i, result;
        let product = obj.moduleMap[entity].integrationName;
        let verbs = [];
        for (let k in obj.apps[product].modules[entity]) {
          let v = obj.apps[product].modules[entity][k];
          verbs.push(v.verb);
        }
        if (verbs.indexOf(verb) === - 1) {
          for (app in obj.apps) {
            item = obj.apps[app];
            if (app === product) {
              continue;
            }
            if (item.modules[entity]) {
              item.modules[entity].forEach(v => {
                if (v.verb === verb) {
                  res.text += this.i18nCache.i18n.__('{{listParameterString}}', {product: app, verb, entity}) + '\n';
                  if (!(v.parameter && (v.parameter.length > 0))) {
                    res.text += '\t- ';
                    return res.text += this.i18nCache.i18n.__('{{noParameterString}}') + '\n';
                  } else {
                    return (() => {
                      result = [];
                      for (i = 0; i < v.parameter.length; i ++) {
                        item = v.parameter[i];
                        res.text += '\t- ';
                        result.push(res.text += (item.name ? item.name : '') + ': ' + (item.desc ? item.desc : '') +
                          (item.example ? ` (e.g: ${item.example})` : '') + '\n');
                      }
                      return result;
                    })();
                  }
                }
              });
            }
          }
          if (res.text === '') {
            res.text += this.i18nCache.i18n.__('{{noSuchCommandString}}', {verb, entity}) + this.listCommandsForHelp(registrar, entity).text;
          }
        } else {
          res.text += this.i18nCache.i18n.__('{{listParameterString}}', {product, verb, entity}) + '\n';
          obj.apps[product].modules[entity].forEach(v => {
            if (v.verb === verb) {
              if (!(v.parameter && (v.parameter.length > 0))) {
                res.text += '\t- ';
                return res.text += this.i18nCache.i18n.__('{{noParameterString}}') + '\n';
              } else {
                return (() => {
                  result = [];
                  for (i = 0; i < v.parameter.length; i ++) {
                    item = v.parameter[i];
                    res.text += '\t- ';
                    result.push(res.text += (item.name ? item.name : '') + ': ' + (item.desc ? item.desc : '') +
                      (item.example ? ` (e.g: ${item.example})` : '') + '\n');
                  }
                  return result;
                })();
              }
            }
          });
        }
      }
    } else {
      let help = this.getModuels(registrar);
      let sample = [];
      for (app in help.apps) {
        item = help.apps[app];
        if (app === 'admin') {
          continue;
        }
        this.i18nCache._i18n = this.i18nConfigure.getProductRegisterObjFromChatMsg(app, this.i18nCache.i18n);
        res.text += `\n\n ${this.i18nCache.i18n.__('{{helpBotOptionsMsg}}', {botName: app})}:\n\n`;
        this.robot.logger.debug(`Help for ${app} bot:`);
        res.text += this.i18nCache.i18n.__('{{supportedModuleMsg}}') + '\n';
        for (let entityName in item.modules) {
          let entityList = item.modules[entityName];
          sample.push(entityName);
          res.text += `*\`${entityName}\`* : ` + this.i18nCache._i18n.__(entityList[0].entityDesc) + '\n';
        }
      }

      res.text += `\n\n\n\n${this.i18nCache.i18n.__('{{listCommandsForModuleMsg}}')}:\n`;
      res.text += `*\`help [module_name]\`*         *\`e.g: help ${sample[0]}\`*\n`;
    }
    return res;
  }

  listCommandsForHelp(registrar, entity) {
    let res = {
      text: '',
      found_app: false
    };

    let sampleArr = [];
    let obj = this.getModuels(registrar);
    if (!obj.moduleMap[entity]) {
      res.text = this.i18nCache.i18n.__('{{noSuchModuleString}}', {module: entity});
      if (this.fuzzyMatch(Object.keys(obj.moduleMap), entity) !== '') {
        let matchEntity = this.fuzzyMatch(Object.keys(obj.moduleMap), entity);
        res.text += this.i18nCache.i18n.__('{{didYouMeanString}}', {name: matchEntity}) + '\n' + this.listCommandsForHelp(registrar, matchEntity).text;
      } else {
        res.text += this.showHelp(registrar).text;
      }
    } else {
      res.text += `\n ${this.i18nCache.i18n.__('{{listCommandsMsgForHelp}}', {moduleName: entity})}\n\n`;
      for (let k in obj.apps[obj.moduleMap[entity].integrationName].modules[entity]) {
        let v = obj.apps[obj.moduleMap[entity].integrationName].modules[entity][k];
        sampleArr.push(`${v.verb} ${entity}`);
      }
      for (let app in obj.apps) {
        let item = obj.apps[app];
        for (let i in item.modules[entity]) {
          let module = item.modules[entity][i];
          if ((sampleArr.indexOf(`${module.verb} ${entity}`) === - 1) || (app === obj.moduleMap[entity].integrationName)) {
            sampleArr.push(`${module.verb} ${entity}`);
            res.text += `*\`${module.verb} ${entity}`;
            if (module.parameter && (module.parameter.length > 0)) {
              for (i = 0; i < module.parameter.length; i ++) {
                let p = module.parameter[i];
                if (i === (module.parameter.length - 1)) {
                  res.text += (p.name ? ` [${p.name}]\`*` : '`*');
                } else {
                  res.text += (p.name ? ` [${p.name}]` : '');
                }
              }
            } else {
              res.text += '`*';
            }
            res.text += (module.help ? `: ${module.help}` : '') + '\n';
          } else {
            logger.error(`The command ${app} ${module.verb} ${entity} will not show in the help system, reason = already exists`);
          }
        }
      }
      res.text += `\n\n${this.i18nCache.i18n.__('{{toGetMoreCommandDescMsg}}')}:\n`;
      res.text += `help [command]               e.g. help ${sampleArr[0]}`;
    }
    return res;
  }

  greetUser(registrar) {
    let arr = [];
    for (let k in registrar.mapping) {
      let v = registrar.mapping[k];
      if (v !== 'admin') {
        arr.push(v);
      }
    }

    let integrationName = arr.toString();
    let initFlag = process.env.HUBOT_INIT_FLAG;
    let { robot } = this;
    let { commons } = this;
    if (!initFlag) {
      initFlag = true;
      let { adapterName } = this.robot;
      let type = ADAPTER_MAPPINGS.get(adapterName).toUpperCase();
      let envFile = ENV_FILE_TYPE[type];
      let buffer1 = fs.readFileSync(envFile);
      let buffer = `${buffer1}HUBOT_INIT_FLAG=${initFlag}\n`;
      fs.writeFileSync(envFile, buffer);

      return robot.adapter.getUsers()
        .then(res => {
          return res.forEach(user => {
            let instantMessageChannel, msg;
            switch (ADAPTER_MAPPINGS.get(robot.adapterName)) {
              case 'slack':
                if ((user.name !== robot.name) && (user.isBot === false) && (user.name !== 'slackbot')) {
                  msg = commons.greetUserString(user.name, robot.name, integrationName);
                  return robot.adapter.createInstantMessageChannel(user.id)
                    .then(resp => {
                      if (resp) {
                        robot.logger.debug(`Bot ready to greet to the user ${user.name}`);
                        instantMessageChannel = JSON.parse((resp.body.message).replace(ORIGINAL_RESPONSE_MSG, ''));
                        return robot.adapter.postMessage(instantMessageChannel.channel.id, msg);
                      }
                    });
                }
                break;
            }
          });
        }).catch(e => robot.logger.debug(e));
    }
  }

  getModuels(registrar) {
    let module = {apps: {}, moduleMap: {}};
    for (let alias in registrar.mapping) {
      let app = registrar.mapping[alias];
      module.apps[app] = {modules: {}};
      for (let verb in registrar.apps[app]['verbs']) {
        let item = registrar.apps[app]['verbs'][verb];
        for (let entityName in item['entities']) {
          let obj = item['entities'][entityName];
          for (let k in obj) {
            let v = obj[k];
            if (module.apps[app].modules[entityName]) {
              module.apps[app].modules[entityName].push({verb: v.verb, help: v.help, entityDesc: v.entityDesc, integrationName: v.integrationName, example: v.example, parameter: v.parameter});
            } else {
              module.apps[app].modules[entityName] = [{verb: v.verb, help: v.help, entityDesc: v.entityDesc, integrationName: v.integrationName, example: v.example, parameter: v.parameter}];
              module.moduleMap[entityName] = {
                moduleName: v.entity,
                integrationName: v.integrationName
              };
            }
          }
        }
      }
    }
    return module;
  };
}

module.exports = Help;
