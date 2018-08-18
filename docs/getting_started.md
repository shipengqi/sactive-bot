# Getting Started

## create a bot
```bash
sbot create
```
**Options**
```bash
Options:
  --help, -h
    Output usage information

  --start, -s
    start up bot after created
```

## running a bot
```bash
sbot run
#or
sbot start
```
**Options**
```bash
Options:
  --help, -h
    Output usage information

  --platform, -p
    specify the bot platform
```

## Configuration options

All options can be `process.env.HTTP_PROXY_ENDPOINT`

### Common options

| Environment variables        |  Question   |  Description  |
| :--------   | :-----   | :---- |
| `NODE_ENV`        |    Enter the environment mode   |    default `development`   |
| `HTTP_PROXY_ENDPOINT`        |   HTTP proxy endpoint (optional)    |   Should be configured if in a internal network.  |
| `SBOT_SCRIPTS`        |    Enter the script path (optional   |   All script files under the path specified by `SBOT_SCRIPTS` variable will be loaded by bot. |
| `SBOT_NAME`        |   Enter a bot name    |   required    |
| `SBOT_SERVER_PORT`        |    Bot server port   |   Bot http server started with the `Sbot` startup, And listens on the specified port.  |
| `SBOT_ENABLE_TLS`        |  Enable the TLS for bot server    |   default `no`   |
| `SBOT_CERT_FILE_PATH`        |    Enter the cert file path if enable the TLS   |  The cert file is used to create HTTPS server.  |
| `SBOT_KEY_FILE_PATH`        |   Enter the key file path if enable the TLS    |   The key file is used to create HTTPS server.   |

### [WeChat options](wechat_bot.md)
### [Slack options](slack_bot.md)
### [Mattermost options](mattermost_bot.md)
### [Microsoft Teams options](msteams_bot.md)

## More environment variables

The following environment variables can be configured both `development` and `production`:

| Environment variables     |  Description  |
| :--------   | :-----   |
| `SBOT_WECHAT_AUTH_PORT`        |   Specify WeChat auth server port, auth server started with the `Wechat Bot` startup, default `8082`  |
| `SBOT_MISSPELLING_ENABLED`        |    Enable misspelling, based on [natural.JaroWinklerDistance](https://github.com/NaturalNode/natural#string-distance). |
| `SBOT_MINIMUM_SIMILARITY`        |   Minimum similarity for misspelling, default `0.85`. |
| `REMINDER_COMMAND_LIST_MAXIMUM`        |   If misspelling is enabled, bot will return a similar command list when bot receives the error command. |


Just can be configured in `production`:
`bot.logger` based on [winston](https://github.com/winstonjs/winston).
logger default format: `{timestamp} {label} {level}: {message}`, `e.g.  2018-08-17 20:59:25 [bot-dce4c0jkxzv0pe] info: Running hubot version 2.19.0`

| Environment variables     |  Description  |
| :--------   | :-----   |
| `SBOT_LOG_FILE_TIME`        |  Maximum number of logs to keep. default `1d` in `development`,default `7d` in `production`. refer to [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file) |
| `SBOT_LOG_LEVEL`        |  Log level, default `debug` in `development`,default `info` in `production`.  |
| `SBOT_LOG_LABEL`        |  {`SBOT_LOG_LABEL`}-{`uniqueId`}, default `bot`. |
| `SBOT_LOG_DIR`        |  Specify the log file directory, default `{pwd}/log` in `development`, default `/var/opt/sbot/log` in `production`.  |