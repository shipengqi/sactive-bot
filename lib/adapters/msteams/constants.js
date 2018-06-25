const {
  ROUTER_URIS
} = require('../../const');

// MSTeams auth server
// These are the scopes that we need to request from AAD
// to make MS Graph calls.
const BOT_SCOPES = [
  'Group.ReadWrite.All', // Read/Write MS Teams teams
  'User.Read.All', // Read user profiles
  'offline_access', // Request a refresh_token
  'openid', // Request an id_token
  'profile' // Request additional data in id_token
];

const BASE_URI = process.env.ENV_TYPE === 'kubernetes' ? `${ROUTER_URIS.CHATOPS_CHATBOT}/v1/${process.env.CHAT_PLATFORM_OPTION}/${process.env.HUBOT_NAME}` : '';
const COMMON_TENANT = 'common';
const HOUR_IN_MILLISECONDS = 3600000;
const DAY_IN_MILLISECONDS = HOUR_IN_MILLISECONDS * 24;
const LOG_MSTEAMS_AUTH_PREFIX = 'ms-teams-auth-server:';
const LOG_MSTEAMS_ADAPTER_PREFIX = 'ms-teams-unified-adapter:';
const GRAPH_DEFAULT_VERSION = 'beta';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/';
const TOKEN_ENDPOINT = BASE_URI + '/token';
const LOGIN_ENDPOINT = BASE_URI + '/login';
const LOGOUT_ENDPOINT = BASE_URI + '/logout';
const ADMIN_CONSENT_ENDPOINT = BASE_URI + '/adminconsent';
const ADMIN_TOKEN_ENDPOINT = BASE_URI + '/admintoken';
const MESSAGE_ENDPOINT = BASE_URI + '/api/messages';
const ADMIN_CONSENT_URI = 'https://login.microsoftonline.com/{tenant}/adminconsent';
const OPEN_ID_CONFIGURATION_URI = 'https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration';

module.exports = {
  BOT_SCOPES,
  COMMON_TENANT,
  HOUR_IN_MILLISECONDS,
  DAY_IN_MILLISECONDS,
  LOG_MSTEAMS_AUTH_PREFIX,
  LOG_MSTEAMS_ADAPTER_PREFIX,
  GRAPH_DEFAULT_VERSION,
  GRAPH_BASE_URL,
  TOKEN_ENDPOINT,
  LOGIN_ENDPOINT,
  LOGOUT_ENDPOINT,
  MESSAGE_ENDPOINT,
  ADMIN_CONSENT_ENDPOINT,
  ADMIN_TOKEN_ENDPOINT,
  ADMIN_CONSENT_URI,
  OPEN_ID_CONFIGURATION_URI
};
