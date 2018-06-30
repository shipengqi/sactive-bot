const _ = require('lodash');
const extend = require('extend');

module.exports = robot => {
  robot.$ = {};
  robot.$.APICallbacks = new Map();
  robot.$.reservedApps = new Map([
    ['help', 1],
    ['admin', 1],
    ['sbot', 1]
  ]);
  robot.$.registrar = {apps: new Map()};

  let buildExtraRegex = function(info, integrationName) {
    // default values set for backward compatibility
    let defaultSuffix = {re: null, optional: true};
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
    info.product = integrationName;
    info.regex = buildExtraRegex(info, integrationName);
    let regexString = `${info.product} ${info.verb}`;
    if (info.entity) {
      regexString += ` ${info.entity}`;
    }
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
    let integrationName = info.integrationName.toLowerCase();
    if (!robot.$.registrar.apps.has(integrationName)) {
      throw new Error(`cannot register listener for ${integrationName}, integration ${integrationName} not registered, please use robot.e.registerIntegration.`);
    }
    let regex = buildRegex(info, integrationName);
    robot.$.logger.info(`Sbot registering call:\n\trobot.${info.type} ${regex.toString()}`);
    robot[info.type](regex, msg => callback(msg, robot));
  };

  robot.$.registerIntegration = function(metadata, authentication) {
    let integrationName = metadata.name.toLowerCase();
    if (robot.$.reservedApps.has(integrationName)) {
      throw new Error(`Integration name cannot have reserved name: ${integrationName}.`);
    }
    if (robot.$.registrar.apps.has(integrationName)) {
      throw new Error(`Integration ${integrationName} already registred!`);
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

    robot.logger.debug(`Successfully registerd ${integrationName} with:`);
    robot.logger.debug(`Meta = ${JSON.stringify(metadata)}`);
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

  robot.$.registerAPICallback = function(integrationName, callbackId, callback) {
    let handlerType = typeof callback;
    if (_.isFunction(handlerType)) {
      throw new Error(`callback is not a function but a ${handlerType}.`);
    }
    let callbackKey = `${integrationName}_${callbackId}`;

    robot.logger.info(`Successfully registerd function ${callbackKey}.`);

    return robot.$.APICallbacks.set(callbackKey, callback);
  };
};