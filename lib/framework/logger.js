const logger = require('winston');
require('winston-daily-rotate-file');
const uniqid = require('uniqid');
const {combine, timestamp, label, printf} = logger.format;

class Logger {
  constructor($$utils) {
    let botName = $$utils.envs('SBOT_NAME');
    let dailyRotateFileTransport = new (logger.transports.DailyRotateFile)({
      filename: `sbot-${botName}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD-HH',
      maxSize: '20m',
      maxFiles: $$utils.envs('SBOT_LOG_FILE_TIME'),
      level: $$utils.envs('SBOT_LOG_LEVEL')
    });
    let consoleTransport = new (logger.transports.Console)();
    let transports = [
      consoleTransport,
      dailyRotateFileTransport
    ];
    const sbotFormat = printf(info => {
      return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    });
    console.log('--------------dddd------label', $$utils.envs('SBOT_LOG_LABEL'));
    logger.configure({
      format: combine(
        label({label: `${$$utils.envs('SBOT_LOG_LABEL')}-${uniqid()}`}),
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        sbotFormat
      ),
      transports,
      exitOnError: false
    });

    return logger;
  }
}

module.exports = Logger;