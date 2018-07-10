# sactive-bot

## Installation
```bash
npm install sactive-bot
```

## Get started

### create a bot
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

### start up bot
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

## TODO
- wechat
  - api
    - https://github.com/Urinx/WeixinBot
  - QRCode terminal
- mattermost
  - api
    - https://www.npmjs.com/package/hubot-matteruser
    - https://api.mattermost.com/
- slack
  - api
    - https://github.com/slackapi/hubot-slack
- msteams
  - api
    - https://github.com/howdyai/botkit/blob/master/lib/TeamsAPI.js
- conversation
- api
  - command receiver
  - command authentication
  - api authentication
- crypto all sensitive information
- docker version
- kubernetes yaml file
- scripts hot reload
- help
- training page
- gritty

## config yaml
```yml
- BOT_NAME:
    question: ''
- PLATFORM:
    question: ''
    options:
    - slack
    - wechat
```