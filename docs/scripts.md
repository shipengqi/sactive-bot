# Writing your first script

- You need to use the following languages / technologies:
  - `coffeescript` or `es6`

## Script Example
[example.js](https://github.com/shipengqi/sactive-bot/blob/master/scripts/example.js)
All script files under `/sactive-bot/scripts/` and `/sactive-bot/src/` will load automatically by bot.

## API

### `robot.$.registerIntegration(config)`
Configure and register the current product script with `Sbot`.

**Parameters:**
- config, `Object` Specifies the configuration for the product script.
  - name, `String` **required** The name of the product script. This must be unique in the case of loading multiple product scripts in one bot.
  - shortDesc, `String` **required** A brief description of the product script.

**Example:**
```javascript
const integrationConfig = {
  name: 'example',
  shortDesc: 'example for registering an integration',
};


robot.$.registerIntegration(integrationConfig);
```

### `robot.$.respond(info, callback)`
Configure and register the a listener in the `Sbot` which will execute a callback defined by your product script.

**Parameters:**
- info, `Object` Specifies the configuration for the listener.
  - integrationName, `String` **required** The name of the integration. It should match the name used in the registration process.
  - verb, `String` **required** The action.
  - entity, `String` The target entity that will receive the action.
  - shortDesc, `String` **required** A description of how to use this operation from the chat platform.
- callback(response, robot), `Function` Specifies the callback function that will be executed when an incoming message from the chat platform matches this listener.
  - response, `Hubot.Response`
  - robot, `Sbot`

**Example:**
```javascript
robot.$.respond({
  verb: 'say',
  entity: 'hello',
  shortDesc: 'example for say hello',
  integrationName: 'example'
}, msg => {
  msg.reply(`Hello, this is \`${robot.name}\`. To see a list of supported commands type: \`${robot.name} help\`.`);
});
```