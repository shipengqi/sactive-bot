const logger = require('winston');
require('winston-daily-rotate-file');
const uniqid = require('uniqid');
const {combine, timestamp, label, printf, colorize} = logger.format;

class Logger {
  constructor($$utils) {
    let botName = $$utils.envs('SBOT_NAME');
    let dailyFileName = `${$$utils.envs('SBOT_LOG_DIR')}/sbot-${botName}-%DATE%.log`;
    let dailyRotateFileTransport = new (logger.transports.DailyRotateFile)({
      filename: dailyFileName,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: $$utils.envs('SBOT_LOG_FILE_TIME'),
      level: $$utils.envs('SBOT_LOG_LEVEL')
    });
    let consoleTransport = new (logger.transports.Console)({
      level: $$utils.envs('SBOT_LOG_LEVEL')
    });
    let transports = [
      consoleTransport,
      dailyRotateFileTransport
    ];
    const sbotFormat = printf(info => {
      return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    });
    logger.configure({
      format: combine(
        label({label: `${$$utils.envs('SBOT_LOG_LABEL')}-${uniqid()}`}),
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        colorize(),
        sbotFormat
      ),
      transports,
      exitOnError: false
    });

    return logger;
  }
}

module.exports = Logger;