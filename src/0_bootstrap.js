const _ = require('lodash');
const extend = require('extend');
const {CONVERSATION_INSTANCE_NAME} = require('../lib/constants');
const {createDialog} = require('../lib/conversation');
const AuthenticationProxy = require('../lib/authentication/authentication_proxy');

module.exports = robot => {
  robot.$ = {};
  robot.$.APICallbacks = new Map();
  robot.$.reservedWords = new Map([
    ['help', 1],
    ['sbot', 1],
    ['skip', 1]
  ]);
  robot.$.registrar = {apps: new Map()};
  robot.$.commands = new Map();
  robot.$.conversation = createDialog(robot, 'user', CONVERSATION_INSTANCE_NAME.CONVERSATION);
  robot.$.authProxy = new AuthenticationProxy(robot);

  let buildExtraRegex = function(info, integrationName) {
    // default values set for backward compatibility
    let defaultSuffix = {re: null, optional: true};
    if (!info.regexSuffix) {
      info.regexSuffix = {};
    }
    if (!_.isObject(info.regexSuffix)) {
      throw new Error('info.regexSuffix MUST be an object.');
    }
    let extra = extend(true, {}, defaultSuffix, info.regexSuffix);

    // check that re is string or undefined
    if (extra.re && !_.isString(extra.re)) {
      throw new Error('Cannot register a listener, info.regexSuffix.re must be a string.');
    }

    // check that optional is boolean
    if (!_.isBoolean(extra.optional)) {
      throw new Error('Cannot register a listener, info.regexSuffix.optional must be a boolean.');
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

  let buildRegex = function(info, integrationName) {
    if (!info.verb) {
      throw new Error(`Cannot register listener for ${info.product}, no verb passed.`);
    }
    if (info.verb.includes(' ') || (info.entity && info.entity.includes(' '))) {
      throw new Error(`Cannot register listener for ${info.product}, verb/entity must be a single word.`);
    }
    if (robot.$.reservedWords.has(info.verb) || (info.entity && robot.$.reservedWords.has(info.entity))) {
      let errMsg = `verb or entity cannot have reserved word.\nReserved words:`;
      for (let reservedWord of robot.$.reservedWords.keys()) {
        errMsg += `  "${reservedWord}"`;
      }
      throw new Error(errMsg);
    }
    info.product = integrationName;
    info.regex = buildExtraRegex(info, integrationName);
    let regexString = `${info.product} ${info.verb}`;
    if (info.entity) {
      regexString += ` ${info.entity}`;
    }
    let command = regexString;
    let subs = robot.$.commands.get(integrationName).subs;
    let subCommand = info.entity ? `${info.verb} ${info.entity}` : info.verb;
    if (subs.has(subCommand.toLowerCase())) { // commands are case-insensitive
      throw new Error(`Command: ${subCommand} already registered!`);
    }
    subs.set(subCommand.toLowerCase(), info.longDesc);
    if (info.regex) {
      regexString = `${regexString}${info.regex}$`;
      robot.logger.debug(`The regexString is: ${regexString}.`);
    }
    return {regex: new RegExp(regexString, 'i'), command: command};
  };

  let registerListener = function(info, callback) {
    let handlerType = typeof callback;
    if (_.isFunction(handlerType)) {
      throw new Error(`callback is not a function but a ${handlerType}.`);
    }
    info.cb = callback;
    if (!info.integrationName) {
      throw new Error(`integrationName is required.`);
    }
    // check input
    if (!info.shortDesc) {
      throw new Error('At least info.shortDesc must be specified.');
    }
    info.longDesc = info.longDesc || info.shortDesc;
    let integrationName = info.integrationName.toLowerCase();
    if (!robot.$.registrar.apps.has(integrationName)) {
      throw new Error(`Cannot register listener for ${integrationName}, integration ${integrationName} not registered, please use robot.e.registerIntegration.`);
    }
    let {regex, command} = buildRegex(info, integrationName);

    let authenticatedHandler = async function(msg) {
      robot.logger.debug(`Adding authentication to robot. ${info.type} ${command}`);

      // let roomId = msg.envelope.message.room;
      // if (robot.adapterName === 'msteams') {
      //   if (roomId.startsWith('19:')) {
      //     roomId = roomId.split('@')[0] + '@thread.skype';
      //   }
      // }

      let str1 = `To issue ${command} need permission to access your integration.`;
      let str2 = 'Please press the following link to the';
      let str3 = 'and enter your credentials.';
      let userInfo = {
        name: msg.envelope.user.name || msg.message.user.name,
        userId: msg.envelope.user.id || msg.message.user.id,
        roomId: msg.envelope.room || msg.envelope.message.room || msg.message.room
      };

      let authInfo = await robot.$.authProxy.getCredentialsCache(integrationName, userInfo);
      if (!authInfo) {
        // TODO refreshAdapterAuthentication
        // robot.$.registrar.apps.get(integrationName).auth.msg = msg;
        // robot.$.authProxy.refreshAdapterAuthentication(integrationName, robot.$.registrar.apps.get(integrationName).auth);

        // Send token_url to users
        let url = await robot.$.authProxy.getLoginUrl(integrationName, userInfo, msg, callback);
        let userId = msg.envelope.user.id;
        let result = str1 + ' \n ' + str2 + ` [Bot Login Page](${url}) ` + str3;
        robot.logger.info(`Authenticate for userId: ${userId}.`);

        if (robot.adapterName === 'slack') {
          result = str1 + ' \n ' + str2 + ` <${url}|Bot Login Page> ` + str3;
        }
        msg.reply(result);
      } else {
        robot.logger.info(`Authentication successful for robot.${info.type} ${regex.toString()}`);
        callback(msg, robot, authInfo);
      }
    };

    // Authentication is disabled by explicitly specifying info.auth: false in the
    // robot.$.respond or robot.$.hear params.
    if (robot.$.registrar.apps.get(integrationName).auth && info.auth !== false) {
      // If authentication is enabled and integration has registered it, and auth = false
      robot[info.type](regex, authenticatedHandler);
    } else {
      // If no authentication needed, use this handler instead
      robot.logger.info(`Sbot registering call:\n\trobot.${info.type} ${regex.toString()}`);
      robot[info.type](regex, msg => callback(msg, robot));
    }
  };

  robot.$.registerIntegration = function(metadata, authentication) {
    let integrationName = metadata.name.toLowerCase(); // integrationName is case-insensitive
    if (robot.$.reservedWords.has(integrationName)) {
      let errMsg = `Integration name cannot have reserved words.\nReserved words:`;
      for (let reservedWord of robot.$.reservedWords.keys()) {
        errMsg += `  "${reservedWord}"`;
      }
      throw new Error(errMsg);
    }
    if (robot.$.registrar.apps.has(integrationName)) {
      throw new Error(`Integration: ${integrationName} already registered!`);
    }
    if (!_.isString(integrationName)) {
      throw new Error(`Cannot register integration for ${integrationName}, name must be a string.`);
    }

    if (integrationName.includes(' ')) {
      throw new Error(`Cannot register integration for ${integrationName}, name must be a single word.`);
    }
    // check input
    if (!metadata.shortDesc) {
      throw new Error('At least medatada.shortDesc must be specified.');
    }
    metadata.longDesc = metadata.longDesc || metadata.shortDesc;

    robot.logger.debug(`Successfully registered ${integrationName} with:`);
    robot.logger.debug(`Meta = ${JSON.stringify(metadata)}`);
    robot.$.commands.set(integrationName, {
      desc: metadata.longDesc,
      subs: new Map()
    });

    // Check that authentication existing and correct.
    if (authentication) {
      if (!authentication.adapter) {
        robot.logger.warn('There is no authentication adapter, use default basic authentication adapter');
      }

      if (authentication.authHandler && !_.isFunction(authentication.authHandler)) {
        throw new Error('The authHandler should be a function in authentication');
      }

      robot.$.authProxy.initAdapterForIntegration(integrationName, authentication);
      robot.logger.info(`Adapter ${authentication.adapter} was enabled for integration ${integrationName}.`);
    } else {
      robot.logger.warn(`No authentication specified for registration: ${integrationName}.`);
    }
    // TODO add register authentication for command
    return robot.$.registrar.apps.set(integrationName, {
      metadata,
      auth: authentication || null
    });
  };

  robot.$.respond = function(info, callback) {
    info.type = 'respond';
    registerListener(info, callback);
  };

  robot.$.hear = function(info, callback) {
    info.type = 'respond';
    registerListener(info, callback);
  };

  robot.$.nativeRespond = function(regex, callback) {
    robot.respond(regex, msg => callback(msg, robot));
  };

  robot.$.registerAPICallback = function(integrationName, callbackId, callback) {
    let handlerType = typeof callback;
    if (_.isFunction(handlerType)) {
      throw new Error(`callback is not a function but a ${handlerType}.`);
    }
    let callbackKey = `${integrationName}_${callbackId}`;

    robot.logger.info(`Successfully registered function ${callbackKey}.`);

    return robot.$.APICallbacks.set(callbackKey, callback);
  };
};