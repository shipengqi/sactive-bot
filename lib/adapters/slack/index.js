const Auth = require('./slack_oauth_flow');
const utils = require('./slack_utils');

module.exports = {
  Auth: {
    WebServer: Auth.SlackAppWebServer,
    TokenCache: Auth.SlackTokensCache,
    _private: {
      Scraper: Auth._private.SlackWebScraper,
      constants: Auth._private.constants,
      utils
    }
  }
};
