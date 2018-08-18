# sactive-bot
An extensible chat bot framework.

[![Build status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]

[npm-image]: https://img.shields.io/npm/v/sactive-bot.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/sactive-bot
[travis-image]: https://img.shields.io/travis/shipengqi/sactive-bot/master.svg&style=flat-square
[travis-url]: https://www.travis-ci.org/shipengqi/sactive-bot
[license-image]: http://img.shields.io/npm/l/sactive-bot.svg?style=flat-square
[license-url]: ./LICENSE

[![NPM](https://nodei.co/npm/sactive-bot.png?downloads=true)](https://nodei.co/npm/sactive-bot/)

## Requirements
- `NodeJs` version `v7.9+`

## Installation
### Clone source code form GitHub
```bash
# clone
git clone git@github.com:shipengqi/sactive-bot.git

# install dependencies
cd sactive-bot
yarn install

# link
npm link
```

### NPM ot Yarn
```bash
npm install sactive-bot -g

# or
yarn global add sactive-bot
```

## Features
- WeChat Bot
- Slack Bot
- Mattermost Bot
- Microsoft Teams Bot
- Support create conversation for bot
- Misspelling
- Help for bot
- Conversation Manager
- Command API call
- Support integrate your own adatper

## Demo
**Create a Mattermost bot:**

<img src="docs/img/sbot_demo.gif" width="80%" height="">

**Chat with bot:**

<img src="docs/img/chat_bot_demo.gif" width="80%" height="">

## Documentations
- [Getting Started](docs/getting_started.md)
- [Create a WeChat Bot](docs/wechat_bot.md)
- [Create a Slack Bot](docs/slack_bot.md)
- [Create a Mattermost Bot](docs/mattermost_bot.md)
- [Create a Microsoft Teams bot Bot](docs/msteams_bot.md)
- [Writing your scripts](docs/scripts.md)
- [Command receiver](docs/command_receiver.md)
- [Conversation Guide](docs/conversation_guide.md)
- [External Adatper](docs/external_adapter.md)

## TODO
- unit test
- command authentication
- bot server authentication
- crypto all sensitive information
- render card
- docker version, kubernetes yaml file
- wechat
  - http://www.blogjava.net/yongboy/archive/2015/11/05/410636.html
  - https://github.com/Urinx/WeixinBot
  - http://www.tanhao.me/talk/1466.html/
  - QRCode terminal
- mattermost
  - https://www.npmjs.com/package/hubot-matteruser
  - https://api.mattermost.com/
- slack
  - https://github.com/slackapi/hubot-slack
- msteams
  - https://github.com/howdyai/botkit/blob/master/lib/TeamsAPI.js