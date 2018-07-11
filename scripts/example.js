module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: 'Test module for sbot',
    name: 'test'
  });

  robot.$.respond({
    verb: 'say',
    entity: 'hello',
    integrationName: 'test'
  }, msg => {
    msg.reply('Testing, please ignore this message ...');
  });
};