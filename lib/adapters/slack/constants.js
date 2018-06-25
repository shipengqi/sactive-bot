const BOT_SCOPES = [
  'admin',
  'bot',
  'channels:history',
  'channels:read',
  'channels:write',
  'chat:write:bot',
  'chat:write:user',
  'dnd:read',
  'dnd:write',
  'emoji:read',
  'files:read',
  'files:write:user',
  'groups:history',
  'groups:read',
  'groups:write',
  'im:history',
  'im:read',
  'im:write',
  'mpim:history',
  'mpim:read',
  'mpim:write',
  'pins:read',
  'pins:write',
  'reactions:read',
  'reactions:write',
  'reminders:read',
  'reminders:write',
  'search:read',
  'stars:read',
  'stars:write',
  'team:read',
  'usergroups:read',
  'usergroups:write',
  'users.profile:read',
  'users.profile:write',
  'users:read',
  'users:read.email',
  'users:write',
  'identify'
];

const DEFAULT_BROWSER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) ' +
  'AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20';
const DEFAULT_DEBUG_FLAG = false;
const DEFAULT_RUN_SCRIPTS_FLAG = false;
const DEFAULT_USE_STRICT_SSL_FLAG = false;
const DEFAULT_OAUTH2_DELAY = 1000;
const DEFAULT_OAUTH2_AUTOMATION_TIMEOUT = 300000;

module.exports = {
  BOT_SCOPES,
  DEFAULT_BROWSER_AGENT,
  DEFAULT_DEBUG_FLAG,
  DEFAULT_RUN_SCRIPTS_FLAG,
  DEFAULT_USE_STRICT_SSL_FLAG,
  DEFAULT_OAUTH2_DELAY,
  DEFAULT_OAUTH2_AUTOMATION_TIMEOUT
};
