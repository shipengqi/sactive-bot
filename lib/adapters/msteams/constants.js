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

const COMMON_TENANT = 'common';
const HOUR_IN_MILLISECONDS = 3600000;
const DAY_IN_MILLISECONDS = HOUR_IN_MILLISECONDS * 24;
const MSTEAMS_ADAPTER_PREFIX = 'sbot-msteams-adapter:';
const GRAPH_DEFAULT_VERSION = 'beta';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/';
const TOKEN_ENDPOINT = '/token';
const LOGIN_ENDPOINT = '/login';
const LOGOUT_ENDPOINT = '/logout';
const ADMIN_CONSENT_ENDPOINT = '/adminconsent';
const ADMIN_TOKEN_ENDPOINT = '/admintoken';
const MESSAGE_ENDPOINT = '/api/messages';
const ADMIN_CONSENT_URI = 'https://login.microsoftonline.com/{tenant}/adminconsent';
const OPEN_ID_CONFIGURATION_URI = 'https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration';

module.exports = {
  BOT_SCOPES,
  COMMON_TENANT,
  HOUR_IN_MILLISECONDS,
  DAY_IN_MILLISECONDS,
  MSTEAMS_ADAPTER_PREFIX,
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
