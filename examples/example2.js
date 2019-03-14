module.exports = robot => {
  robot.$.nativeRespond(/在哪呢/, msg => {
    msg.reply('在我哥家里，怎么了？');
  });
  robot.$.nativeRespond(/干什么去了/, msg => {
    msg.reply('说点事情，你在哪呢，来坐会呗');
  });
  robot.$.nativeRespond(/好呀，位置给我/, msg => {
    msg.reply('位置金地梅陇镇');
  });
  robot.$.nativeRespond(/泡好茶，一会到/, msg => {
    msg.reply('好的');
  });
  robot.$.nativeRespond(/你好/, msg => {
    msg.reply('你好');
  });
  robot.$.nativeRespond(/天气/, msg => {
    msg.reply('今天天气很好');
  });
  robot.$.nativeRespond(/位置/, msg => {
    msg.reply('金地梅陇镇');
  });
};