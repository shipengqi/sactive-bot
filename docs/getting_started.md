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