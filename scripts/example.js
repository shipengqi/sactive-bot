module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: 'Test module for sbot',
    name: 'test'
  });

  robot.$.respond({
    verb: 'get',
    entity: 'sbot',
    integrationName: 'test'
  }, msg => {
    msg.reply('Testing, please ignore this message ...');
  });
};