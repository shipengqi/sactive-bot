const _ = require('lodash');
const {commandReceiver} = require('../lib/command_receiver/command_receiver');
const {createDialog} = require('../lib/conversation/index');
const {ADAPTER_MAPPINGS, HELP_WORDS, ORIGINAL_RESPONSE_MSG, HUBOT_I18N_REGISTER_NAME} = require('../lib/const');
const logger = require('winston');
const {getIdFromRoom} = require('../lib/utils/functionUtils');
const {loadRoutes} = require('../lib/command_receiver/routes/index');

// contatination of help
const reservedApps = HELP_WORDS.concat([HUBOT_I18N_REGISTER_NAME]);

const {
  loadRequiredReceiveMiddlewares
} = require('../lib/middleware');
module.exports = function(robot) {
  let registrar = {apps: {}, mapping: {}};

  // create e (enterprise object on robot)
  robot.e = {};
  robot.e.integrationCommandReceiverCallbacks = {};
  robot.e.registrar = registrar;
  robot.e.authProxy = authProxy;

  loadRoutes(robot);
  commandReceiver(robot);
  robot.logger = require('winston');

  // build extra part of the regex
  //
  // info: info object from buildEnterpriseRegex
  //  regexSuffix: extra element
  //    optional: true/false- should it be optional
  //    re: string that representing the regex (optional)
  let buildExtraRegex = function(info) {
    // default values set for backward compatibility
    if ((typeof info.extra === 'string') && !info.regexSuffix) {
      info.regexSuffix = {re: info.extra, optional: false};
    }
    // init extra if its not there
    info.regexSuffix = info.regexSuffix || {optional: true, re: undefined};
    let extra = info.regexSuffix;
    if (typeof extra !== 'object') {
      throw new Error('info.regexSuffix MUST be an object');
    }
    // check that re is string or undefined
    if (!_.includes(['undefined', 'string'], (typeof extra.re))) {
      throw new Error('Cannot register a listener, info.regexSuffix.re must ' +
        'be a string or undefined');
    }
    // check that optional is boolean or undefined
    if (!_.includes(['undefined', 'boolean'], (typeof extra.optional))) {
      throw new Error('Cannot register a listener, ' +
        'info.regexSuffix.optional ' +
        'must be a boolean or undefined');
    }
    // TODO: prevent calls similarity as much as possible
    // TODO: only one verb+entity may have optional: true
    // TODO: forbid {optional: true} with {re: null, optional: false}
    // TODO: try to check that 2 regexps are not equal (at least no the same)
    if (extra.re) {
      // if extra.re passed and its optional
      if (extra.optional) {
        return `(?: ${extra.re})?`;
        // if it's not optional
      } else {
        return ` ${extra.re}`;
      }
      // if no extra.re and optional
    } else if (extra.optional) {
      return '[ ]?(.*)?';
      // if no extra.re and not optional
    } else {
      return '';
    }
  };

  let findAliasByName = integrationName => {
    return _.findKey(registrar.mapping, o => o === integrationName);
  };

  let registrarAddCall = function(info, integrationName) {
    let mappingName = findAliasByName(integrationName);
    let verbs = registrar.apps[integrationName].verbs;
    if (!verbs[info.verb]) {
      for (let k in verbs) {
        if (info.verb.toLowerCase() === k.toLowerCase()) {
          throw new Error(`Cannot register listener for ${integrationName} with the verb ${info.verb}, ` +
            `similar verb ${k} already registred`);
        }
      }
    }
    // init verb if not exists
    verbs[info.verb] = verbs[info.verb] || {flat: {}, entities: {}};
    let verb = registrar.apps[integrationName].verbs[info.verb];
    // for calls with entity
    if (info.entity) {
      if (!verb.entities[info.entity]) {
        for (let k in verb.entities) {
          if (info.entity.toLowerCase() === k.toLowerCase()) {
            throw new Error(`Cannot register listener for ${integrationName} with the entity ${info.entity}, ` +
              `similar entity ${k} already registred`);
          }
        }
      }
      // init entity if not exists
      verb.entities[info.entity] = verb.entities[info.entity] || {};
      // basic check for duplicates
      if (verb.entities[info.entity][info.regex]) {
        throw new Error(`Cannot register listener for ${mappingName}, ` +
          'one similar command already registered, Info: ' + JSON.stringify(info));
      }
      return verb.entities[info.entity][info.regex] = info;
    } else {
      // register calls without entity
      // basic check for duplicates
      if (verb.flat[info.regex]) {
        throw new Error(`Cannot register listener for ${mappingName}, ` +
          'similar one already registred, Info: ' + JSON.stringify(info));
      }
      verb.flat[info.regex] = info;
    }
  };

  // build regex for enterprise calls and register to HE help module
  // info: list of the function info:
  //  verb: verb to prerform
  //  entity: entity for verb to operate (optional)
  //  extra: extra regex (after the first 2), default: "[ ]?(.*)?"
  //  type: hear/respond
  //  help: help message for call
  //  example: parameters usage example to be showed in help
  //
  // returns regex:
  //  /#{info.product} #{info.verb} #{info.entity} #{info.extra}/i
  let buildEnterpriseRegex = function(info, integrationName) {
    // backward compatibility for old version (verb vas called action)
    if (info.action) {
      info.verb = info.action;
      delete info.action;
    }
    info.product = findAliasByName(integrationName);
    // do not accept unregistered integrations
    if (!registrar.apps[integrationName]) {
      throw new Error(`cannot register listener for ${integrationName}, ` +
        `integration ${integrationName} not registered, please use ` +
        'robot.e.registerIntegration');
    }
    if (!info.verb) {
      throw new Error(`Cannot register listener for ${info.product}, ` +
        'no verb passed');
    }
    if (info.verb.includes(' ') || (info.entity && info.entity.includes(' '))) {
      throw new Error(`Cannot register listener for ${info.product}, ` +
        'verb/entity must be a single word');
    }
    info.regex = buildExtraRegex(info);
    if (!info.type || (info.type !== 'hear')) {
      info.type = 'respond';
    }
    let reString = `${info.product} ${info.verb}`;
    if (info.entity) {
      reString += ` ${info.entity}`;
    }
    if (info.regex) {
      reString = `${reString}${info.regex}$`;
      robot.logger.debug(`The reString is = ${reString}`);
    }
    registrarAddCall(info, integrationName);
    return new RegExp(reString, 'i');
  };

  // register integration
  //
  // metadata:
  //  name: (optional) Integration alias (how the chat USER will call it)
  //  shortDesc: short description of the integration
  //  longDesc: (optional) long description of the integration
  // authentication:
  //  adapter: the name of authentication adapter, e.g: 'basic_authentication_adapter'
  //  authMethod: (optional) the function defined by IntegrationScript for 'basic_authentication_adapter'
  robot.e.registerIntegration = function(metadata, authentication) {
    let integrationName = metadata.name;
    if (_.includes(reservedApps, integrationName)) {
      throw new Error('integration name cannot have reserved name ' +
        integrationName);
    }
    if (registrar.apps[integrationName]) {
      throw new Error(`Integration ${integrationName} already registred!`);
    }
    if (typeof metadata.name === 'string') {
      if (metadata.name.includes(' ')) {
        throw new Error('Cannot register integration for ' +
          `${integrationName}, ` +
          'name alias must be a single word');
      } else if (_.includes(reservedApps, metadata.name)) {
        throw new Error('integration metadata.name cannot have reserved name ' +
          metadata.name);
      } else {
        registrar.mapping[metadata.name] = integrationName;
      }
    } else if (_.includes(Object.keys(metadata), 'name')) {
      throw new Error(`Cannot register integration for ${integrationName}, ` +
        'name alias must be a string');
    } else {
      registrar.mapping[integrationName] = integrationName;
    }
    // check input
    if (!metadata.shortDesc) {
      throw new Error('at least medatada.shortDesc must be specified');
    }
    metadata.longDesc = metadata.longDesc || metadata.shortDesc;

    // Check that auth existing and correct.
    if (authentication) {
      if (!authentication.adapter) {
        throw new Error('There is no authentication adapter');
      }

      if (authentication.authMethod && (typeof (authentication.authMethod) !== 'function')) {
        throw new Error('The authMethod should be a function in authentication');
      }

      authProxy.initAdapterForIntegration(integrationName, authentication);
      robot.logger.info(`Adapter ${authentication.adapter} ` +
        `was enabled for integration ${integrationName}`
      );
    } else {
      robot.logger.info('No authentication specified for ' +
        `${integrationName} in registration`
      );
    }

    robot.logger.debug(`Successfully registerd ${integrationName} with:`);
    robot.logger.debug(`Meta = ${JSON.stringify(metadata)}`);

    return registrar.apps[integrationName] = {
      metadata,
      auth: authentication || null,
      verbs: {}
    };
  };

  /**
   * Register the callback function for restAPI
   * @param {string} integrationName - The name of the integration / product script
   * @param {string} callbackId - A unique identifier of the added callback.
   * @param {func} callback - The callback function that will executed when a
   *  REST API call is received from product-to-bot
   * @returns {undefined}
   * Upon resolve it will return a success Response object.
   */
  robot.e.registerProductToBotCallback = function(integrationName, callbackId, callback) {
    let handlerType = typeof callback;
    if (handlerType !== 'function') {
      throw new Error(`callback is not a function but a ${handlerType}`);
    }
    let callbackKey = integrationName + '_' + callbackId;

    robot.logger.info(`Successfully registerd function ${callbackKey} `);

    return robot.e.integrationCommandReceiverCallbacks[callbackKey] = callback;
  };

  // register a listener function with hubot-enterprise
  //
  // info: list of the function info:
  //  product: product name- OPTIONAL (lib will determin product by itself)
  //  verb: verb to prerform
  //  entity: entity for verb to operate (optional)
  //  type: hear/respond
  //  regexSuffix: (optional) extra element
  //    optional: (optional) true/false- should it be optional
  //    re: (optional) string that representing the regex (optional)
  //  help: help string
  //  example: parameters usage example to be showed in help
  // callback: function to run
  //
  // will register function with the following regex:
  // robot[info.type]
  //  /#{info.product} #{info.verb} #{info.entity} #{info.extra}/i
  let registerListener = function(info, callback) {
    let handlerType = typeof callback;
    if (handlerType !== 'function') {
      throw new Error(`callback is not a function but a ${handlerType}`);
    }
    info.cb = callback;
    let integrationName = info.integrationName;
    let re = buildEnterpriseRegex(info, integrationName);
    let cmd = findAliasByName(integrationName);
    if (info.verb) {
      cmd += ` ${info.verb}`;
    }
    if (info.entity) {
      cmd += ` ${info.entity}`;
    }
    robot.commands.push(cmd);
    robot.logger.info('Sbot registering call:\n' +
      `\trobot.${info.type} ${re.toString()}`);

    // TODO: refactor this into its own function
    let authenticatedHandler = msg => {
      robot.logger.debug('Adding authentication to robot. ' +
        `${info.type} ${re.toString()}`
      );
      let id = msg.envelope.message.room;
      if (ADAPTER_MAPPINGS.get(robot.adapterName) === 'msteams') {
        if (id.startsWith('19:')) {
          id = getIdFromRoom(id.substr(3).split('@')[0]);
        }
      }
      if (!i18nConfigure.getChatRoomRegister(id)) {
        i18nConfigure.registerI18nForChatRooms(id);
      }
      let msgI18n = i18nConfigure.getChatRoomRegister(id);
      let result = '';
      let cLocale = msgI18n.getLocale();
      let str1 = i18nConfigure.getTranslateResultForChatRoom(id, 'loginAuthenticationPermissionMsg', {command: cmd});
      let str2 = i18nConfigure.getTranslateResultForChatRoom(id, '{{loginAuthenticationLinkMsg}}');
      let str3 = i18nConfigure.getTranslateResultForChatRoom(id, '{{loginAuthenticationEnterMsg}}');
      let collaborationUser = (new Buffer(msg.message.user.name)).toString('base64');

      authProxy.getCachedCredentials(integrationName, collaborationUser)
        .then(authInfo => {
          if (!authInfo) {
            registrar.apps[integrationName].auth.msg = msg;
            registrar.apps[integrationName].auth.callback = callback;
            authProxy.refreshAdapterAuthentication(integrationName, registrar.apps[integrationName].auth);
            // Send token_url to users
            authProxy.getLoginUrl(integrationName, collaborationUser, msg, callback)
              .then(loginUrl => {
                let url = loginUrl + `&locale=${cLocale}`;
                let userId = msg.envelope.user.id;
                robot.logger.info(`UserId: ${userId}`);
                if (ADAPTER_MAPPINGS.get(robot.adapterName) === 'slack') {
                  result = str1 + ' \n ' + str2 + ` <${url}|ChatBot Login Page> ` + str3;
                  robot.adapter.createInstantMessageChannel(userId)
                    .then(resp => {
                      if (resp) {
                        let instantMessageChannel = JSON.parse((resp.body.message).replace(ORIGINAL_RESPONSE_MSG, ''));
                        let channelId = instantMessageChannel.channel.id;
                        robot.adapter.postMessage(channelId, result)
                          .then(res =>
                            robot.logger.info(`Successfully post message to ${channelId}`)
                          ).catch(e =>
                            msg.reply(result)
                          );
                      } else {
                        msg.reply(result);
                      }
                    }).catch(e => msg.reply(result));
                } else if (ADAPTER_MAPPINGS.get(robot.adapterName) === 'mattermost') {
                  result = str1 + ' \n ' + str2 + ` [ChatBot Login Page](${url}) ` + str3;
                  robot.adapter.createInstantMessageChannel(userId)
                    .then(resp => {
                      if (resp) {
                        let instantMessageChannel = JSON.parse((resp.body.message).replace(ORIGINAL_RESPONSE_MSG, ''));
                        robot.adapter.postMessage(instantMessageChannel.id, result)
                          .catch(e => msg.reply(result));
                      } else {
                        msg.reply(result);
                      }
                    }).catch(e => msg.reply(result));
                } else {
                  result = str1 + ' \n ' + str2 + ` [ChatBot Login Page](${url}) ` + str3;
                  msg.reply(result);
                }
              }).catch(e => {
                msg.reply(e);
              });
          } else {
            robot.logger.info(`Authentication successful for robot.${info.type}` +
            `${re.toString()}`
            );
            callback(msg, robot, authInfo);
          }
        });
    };

    // Authentication is disabled by explicitly specifying auth: false in the
    // robot.e.create() params.
    if (registrar.apps[integrationName].auth) {
      // If authentication is enabled and integration has registered it
      robot[info.type](re, authenticatedHandler);
    } else {
      // If no authentication needed, use this handler instead
      robot.logger.info(`No authentication for robot.${info.type}` +
        `${re.toString()}`
      );
      robot[info.type](re, msg => callback(msg, robot));
    }
  };

  robot.e.respond = function(info, callback) {
    info.type = 'respond';
    registerListener(info, callback);
  };

  robot.e.hear = function(info, callback) {
    info.type = 'respond';
    registerListener(info, callback);
  };

  robot.e.create = function(info, callback) {
    robot.logger.warning('robot.e.create() is deprecated, use robot.e.respond() or robot.e.hear() instead');
    info.type = 'respond';
    registerListener(info, callback);
  };

  robot.e.createDialog = createDialog;
  // load all required receive middleware
  loadRequiredReceiveMiddlewares(robot);

  return robot.enterprise = robot.e;
};
