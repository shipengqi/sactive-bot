module.exports = robot => {
  robot.respond(/.*/, res => {
    res.reply('Just a testing, please ignore ...');
  });

  robot.hear(/.*/, res => {
    res.reply('Just a testing, please ignore ...');
  });
};