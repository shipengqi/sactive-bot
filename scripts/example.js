module.exports = robot => {
  robot.$.respond(/.*/, res => {
    res.reply('This is wechat bot testing, please ignore ...');
  });
};