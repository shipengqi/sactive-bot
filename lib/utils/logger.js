const logger = require('winston');
const {
  DEFAULT_LOG_CONFIG
} = require('../../constants/constants');
const {
  checkPathAndCreate
} = require('../../utils/functionUtils');

const logsDir = process.env.HUBOT_ENTERPRISE_LOG_DIR || DEFAULT_LOG_CONFIG.PATH;
checkPathAndCreate(logsDir);

// set logging options
let consoleOpts = {
  colorize: true,
  timestamp: true,
  level: process.env.HUBOT_LOG_LEVEL || process.env.LOG_LEVEL || DEFAULT_LOG_CONFIG.LEVEL
};

let fileOpts = {
  colorize: true,
  timestamp: true,
  filename: logsDir + '/chatops-config',
  datePattern: '-yyyy-MM-dd.log',
  level: process.env.HUBOT_LOG_LEVEL || process.env.LOG_LEVEL || DEFAULT_LOG_CONFIG.LEVEL
};

logger.transports.DailyRotateFile = require('winston-daily-rotate-file');
logger['emergency'] = logger.error;

// Setup logging
let transports = [
  new (logger.transports.Console)(consoleOpts),
  new (logger.transports.DailyRotateFile)(fileOpts)
];

logger.configure({
  transports,
  exitOnError: false
});

logger.setLevels(logger.config.syslog.levels);

module.exports = logger;