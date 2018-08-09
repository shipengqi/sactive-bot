# sactive-bot
An extensible chat bot framework.

[![NPM](https://nodei.co/npm/sactive-bot.png?downloads=true)](https://nodei.co/npm/sactive-bot/)

## Installation
```bash
npm install sactive-bot
```


## Requirements
- `NodeJs` version `v7.9+`

## Getting started

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

## Framework
### Pipeline
- receive messages
- filter
- misspelling
- help
- nlp (todo)
- visual command
- common conversation
- monitor (todo)

### External Adapter
#### config yml file
Based on [prompt](https://www.npmjs.com/package/prompt).

**Example**
```yml
PLATFORM:
  description: 'Choose your platform：\n1) WeChat \n2) Slack \n3) Microsoft Teams \n4) Mattermost \n5) External'
  pattern: /^[1-7]$/
  message: 'Choose a platform (between 1 and 7).'
```
Here's an overview of the properties:
```javascript
  {
    description: 'Enter your password',     // Prompt displayed to the user. If not supplied name will be used.
    type: 'string',                 // Specify the type of input to expect.
    pattern: /^\w+$/,                  // Regular expression that input must be valid against.
    message: 'Password must be letters', // Warning message to display if validation fails.
    hidden: true,                        // If true, characters entered will either not be output to console or will be outputed using the `replace` string.
    replace: '*',                        // If `hidden` is set it will replace each hidden character with the specified string.
    default: 'lamepassword',             // Default value to use if no value is entered.
    required: true                        // If true, value entered must be non-empty.
  }
```

More details, refer [prompt](https://www.npmjs.com/package/prompt).

## TODO
- command authentication
- api server
  - api authentication
- render card
- crypto all sensitive information
- docker version
- kubernetes yaml file
- scripts hot reload
- gritty
- wechat
  - http://www.blogjava.net/yongboy/archive/2015/11/05/410636.html
  - api
    - https://github.com/Urinx/WeixinBot
  - login
    - http://www.tanhao.me/talk/1466.html/
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