module.exports = robot => {
  robot.respond(/.*/, res => {
    console.log('group')
    res.reply('Just a testing, please ignore ...');
  });

  robot.hear(/.*/, res => {
    console.log('all')
    res.reply('Just a testing, please ignore ...');
  });
};