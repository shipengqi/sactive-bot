const CONFIG_MAP = new Map([
  [1, `${__dirname}/adapters/wechat/config.yml`],
  [2, `${__dirname}/adapters/qq/config.yml`],
  [3, `${__dirname}/adapters/dingtalk/config.yml`],
  [4, `${__dirname}/adapters/slack/config.yml`],
  [5, `${__dirname}/adapters/msteams/config.yml`],
  [6, `${__dirname}/adapters/mattermost/config.yml`]
]);

module.exports = {
  CONFIG_MAP
};