# sactive-bot
An extensible chat bot framework.

[![Build status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![NPM Download][npm-download]][npm-url]
[![License][license-image]][license-url]

[![NPM](https://nodei.co/npm/sactive-bot.png?downloads=true)](https://nodei.co/npm/sactive-bot/)

## Demo

**Create a Mattermost bot:**

<img src="docs/img/sbot_demo.gif" width="80%" height="">

**Chat with bot:**

<img src="docs/img/chat_bot_demo.gif" width="80%" height="">


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

## Documentations

- Refer to the [Documentation](https://www.shipengqi.top/sactive-bot).

## TODO
- Unit Test
- Command authentication
- Bot server authentication
- Crypto all sensitive information
- Render card
- Docker version, kubernetes yaml file
- Wechat Adapter
  - [WeChat Protocol](http://www.blogjava.net/yongboy/archive/2015/11/05/410636.html)
  - [WeixinBot](https://github.com/Urinx/WeixinBot)
  - [WeChat communication process](http://www.tanhao.me/talk/1466.html/)
  - QRCode terminal
- Mattermost Adapter
  - [hubot-matteruser](https://www.npmjs.com/package/hubot-matteruser)
  - [API doc](https://api.mattermost.com/)
- Slack Adapter
  - [hubot-slack](https://github.com/slackapi/hubot-slack)
- Microsoft teams Adapter
  - [TeamsAPI](https://github.com/howdyai/botkit/blob/master/lib/TeamsAPI.js)