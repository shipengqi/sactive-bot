const path = require('path');

const CONFIG_PATH_MAP = new Map([
  [1, `${__dirname}/adapters/wechat`],
  [2, `${__dirname}/adapters/slack`],
  [3, `${__dirname}/adapters/msteams`],
  [4, `${__dirname}/adapters/mattermost`]
]);

const ENV_FILE_MAP = new Map([
  [1, 'wechat.env'],
  [2, 'slack.env'],
  [3, 'msteams.env'],
  [4, 'mattermost.env']
]);

const ADAPTER_MAP = new Map([
  ['wechat', 1],
  ['wexin', 1],
  ['slack', 2],
  ['s', 2],
  ['msteams', 3],
  ['mst', 3],
  ['mattermost', 4],
  ['mm', 4]
]);

const ADAPTER_NAME_MAP = new Map([
  [1, 'wechat'],
  [2, 'slack'],
  [3, 'msteams'],
  [4, 'mattermost']
]);

const ADAPTER_PATH_MAP = new Map([
  ['wechat', `${__dirname}/adapters/wechat/wechat_adapter.js`],
  ['slack', `${__dirname}/adapters/slack/slack_adapter.js`],
  ['msteams', `${__dirname}/adapters/msteams/msteams_adapter.js`],
  ['mattermost', `${__dirname}/adapters/mattermost/mm_adapter.js`]
]);

const DEFAULT_ADAPTER_CONFIG_FILE = 'config.yml';
const DEFAULT_ENV_PATH = path.join(__dirname, '..');
const OPTION_ENV_PATH = path.join(__dirname, '..', 'option.env');

const ENVS = {
  PRODUCTION: {
    SBOT_LOG_LEVEL: 'info',
    SBOT_LOG_FILE_TIME: '7d',
    SBOT_LOG_LABEL: 'bot',
    SBOT_LOG_DIR: '/var/opt/sbot/log',
    SBOT_TRAINING_DATA_DIR: '/var/opt/sbot/train',
    SBOT_PACKAGES_DIR: '/etc/sbot/packages',
    SBOT_WECHAT_AUTH_PORT: 8082,
    SBOT_SERVER_BASEURL: '/api',
    SBOT_MINIMUM_SIMILARITY: '0.85',
    REMINDER_COMMAND_LIST_MAXIMUM: 5,
    SBOT_MISSPELLING_ENABLED: true
  },
  DEVELOPMENT: {
    SBOT_LOG_LEVEL: 'debug',
    SBOT_LOG_FILE_TIME: '1d',
    SBOT_LOG_LABEL: 'bot',
    SBOT_LOG_DIR: `${DEFAULT_ENV_PATH}/log`,
    SBOT_TRAINING_DATA_DIR: `${DEFAULT_ENV_PATH}/train`,
    SBOT_PACKAGES_DIR: `${DEFAULT_ENV_PATH}/packages`,
    SBOT_WECHAT_AUTH_PORT: 8082,
    SBOT_SERVER_BASEURL: '/api',
    SBOT_MINIMUM_SIMILARITY: '0.85',
    REMINDER_COMMAND_LIST_MAXIMUM: 5,
    SBOT_MISSPELLING_ENABLED: true
  }
};

const HELP_WORD = 'help';

const CONVERSATION_INSTANCE_NAME = {
  VISUAL_COMMAND: 'VisualCommand',
  CONVERSATION: 'Conversation'
};

module.exports = {
  CONVERSATION_INSTANCE_NAME,
  DEFAULT_ADAPTER_CONFIG_FILE,
  CONFIG_PATH_MAP,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH,
  ADAPTER_MAP,
  OPTION_ENV_PATH,
  ADAPTER_PATH_MAP,
  ADAPTER_NAME_MAP,
  ENVS,
  HELP_WORD
};