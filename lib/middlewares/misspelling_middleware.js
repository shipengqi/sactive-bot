const extend = require('extend');
const {PREFIX} = require('./constants');

function misspellingMiddleware(context, next, done) {
  let msg = context.response;
  let robot = msg.robot;
  robot.logger.info(`${PREFIX.MISSPELLING} Enter: ${msg.message.text}`);
  let result = robot.nlp.misspelling(msg.message.text);
  extend(true, robot.processStatus, result);
  robot.logger.debug(`${PREFIX.MISSPELLING} Pass:`);
  robot.logger.debug(JSON.stringify(robot.processStatus));
  return next();
}

module.exports = misspellingMiddleware;