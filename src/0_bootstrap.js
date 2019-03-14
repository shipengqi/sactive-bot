const _ = require('lodash');
const extend = require('extend');
const {CONVERSATION_INSTANCE_NAME} = require('../lib/constants');
const {createDialog} = require('../lib/conversation');

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
    let subs = robot.$.commands.get(integrationName).subs;
    let subCommand = info.entity ? `${info.verb} ${info.entity}` : info.verb;
    if (subs.has(subCommand.toLowerCase())) { // commands are case-insensitive
      throw new Error(`Command: ${subCommand} already registered!`);
    }
    subs.set(subCommand.toLowerCase(), info.longDesc);
    if (info.regex) {
      regexString = `${regexString}${info.regex}$`;
      robot.logger.debug(`The regexString is = ${regexString}.`);
    }
    return new RegExp(regexString, 'i');
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
    let regex = buildRegex(info, integrationName);
    robot.logger.info(`Sbot registering call:\n\trobot.${info.type} ${regex.toString()}`);
    robot[info.type](regex, msg => callback(msg, robot));
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