const logger = require('winston');
require('winston-daily-rotate-file');
const uniqid = require('uniqid');
const {combine, timestamp, label, printf, colorize} = logger.format;

class Logger {
  constructor($$utils) {
    let botName = $$utils.envs('SBOT_NAME');
    let dailyFileName = `${$$utils.envs('SBOT_LOG_DIR')}/sbot-${botName}-%DATE%.log`;
    let sbotFormat = printf(info => {
      info.stack = info.stack ? '\n' + info.stack : '';
      return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}${info.stack}`;
    });
    let sbotFormatLabel = {label: `${$$utils.envs('SBOT_LOG_LABEL')}-${uniqid()}`};
    let sbotFormatTimestamp = {format: 'YYYY-MM-DD HH:mm:ss'};
    let enumerateErrorFormat = logger.format(info => {
      if (info.message instanceof Error) {
        info.message = Object.assign({
          message: info.message.message,
          stack: info.message.stack
        }, info.message);
      }

      if (info instanceof Error) {
        return Object.assign({
          message: info.message,
          stack: info.stack
        }, info);
      }

      return info;
    });
    let dailyRotateFileTransport = new (logger.transports.DailyRotateFile)({
      filename: dailyFileName,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: $$utils.envs('SBOT_LOG_FILE_TIME'),
      level: $$utils.envs('SBOT_LOG_LEVEL')
    });
    let consoleTransport = new (logger.transports.Console)({
      format: combine(
        label(sbotFormatLabel),
        timestamp(sbotFormatTimestamp),
        colorize(),
        sbotFormat
      ),
      level: $$utils.envs('SBOT_LOG_LEVEL')
    });
    let transports = [
      consoleTransport,
      dailyRotateFileTransport
    ];

    logger.configure({
      format: combine(
        enumerateErrorFormat(),
        label(sbotFormatLabel),
        timestamp(sbotFormatTimestamp),
        sbotFormat
      ),
      transports,
      exitOnError: false
    });
    logger.warning = logger.warn;
    return logger;
  }
}

module.exports = Logger;