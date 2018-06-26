const path = require('path');
const CONFIG_PATH_MAP = new Map([
  [1, `${__dirname}/adapters/wechat`],
  [2, `${__dirname}/adapters/qq`],
  [3, `${__dirname}/adapters/dingtalk`],
  [4, `${__dirname}/adapters/slack`],
  [5, `${__dirname}/adapters/msteams`],
  [6, `${__dirname}/adapters/mattermost`]
]);

const DEFAULT_ADAPTER_CONFIG_FILE = 'config.yml';
const ENV_FILE_MAP = new Map([
  [1, 'wechat.env'],
  [2, 'qq.env'],
  [3, 'dingtalk.env'],
  [4, 'slack.env'],
  [5, 'msteams.env'],
  [6, 'mattermost.env']
]);
const DEFAULT_ENV_PATH = path.join(__dirname, '..');
const OPTION_ENV_PATH = path.join(__dirname, '..', 'option.env');

const ADAPTER_MAP = new Map([
  ['wechat', 1],
  ['wexin', 1],
  ['qq', 2],
  ['QQ', 2],
  ['dingtalk', 3],
  ['dingding', 3],
  ['dd', 3],
  ['slack', 4],
  ['s', 4],
  ['msteams', 5],
  ['mst', 5],
  ['mattermost', 6],
  ['mm', 6]
]);

module.exports = {
  DEFAULT_ADAPTER_CONFIG_FILE,
  CONFIG_PATH_MAP,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH,
  ADAPTER_MAP,
  OPTION_ENV_PATH
};