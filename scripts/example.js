module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: 'Test module for sbot',
    name: 'test'
  });

  robot.$.respond({
    verb: 'say',
    entity: 'hello',
    shortDesc: 'Test say hello',
    integrationName: 'test'
  }, msg => {
    msg.reply('Testing, please ignore this message ...');
  });

  robot.$.respond({
    verb: 'hi',
    shortDesc: 'Test say Hi',
    integrationName: 'test'
  }, msg => {
    msg.reply(`Hello, this is ${robot.name}`);
  });
};