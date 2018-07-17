module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: `Example module for \`${robot.name}\``,
    name: 'example'
  });

  robot.$.respond({
    verb: 'say',
    entity: 'hello',
    shortDesc: 'example for say hello',
    integrationName: 'example'
  }, msg => {
    msg.reply(`Hello, this is \`${robot.name}\`. To see a list of supported commands type: \`${robot.name} help\`.`);
  });

  robot.$.respond({
    verb: 'create',
    entity: 'user',
    shortDesc: 'example for start a conversation',
    integrationName: 'example'
  }, msg => {
    let conversation = robot.$.conversation.start(msg, 'create user');

    const function1 = message => {
      conversation.updateAnswers('yes');
      message.reply('Please enter your user name.');
      conversation.updateQuestion('Please enter your user name.');
      conversation.addChoice(/.*/i, function2);
    };

    const function2 = message => {
      conversation.updateAnswers(message.message.text);
      message.reply('Please enter your user email.');
      conversation.updateQuestion('Please enter your user email.');
      conversation.addChoice(/.*/i, function3);
    };

    const function3 = message => {
      conversation.updateAnswers(message.message.text);
      message.reply('Please enter employee Num.');
      conversation.updateQuestion('Please enter employee Num.');
      conversation.addChoice(/.*/i, function4);
    };

    const function4 = message => {
      conversation.updateAnswers(message.message.text);
      message.reply('Create user successfully!! Thanks for reporting this.');
      conversation.emit('end');
    };

    const function5 = message => {
      conversation.emit('end');
      message.reply('Bye bye!');
    };

    msg.reply('Do you want ro create a user \n [yes]or [no]?');
    conversation.updateQuestion('Do you want ro create a user \n [yes]or [no]?');
    conversation.addChoice(/yes/i, function1);
    conversation.addChoice(/no/i, function5);
  });
};