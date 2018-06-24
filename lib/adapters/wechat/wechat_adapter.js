const {Adapter} = require('hubot');
const hubotWechat = require('hubot-wechat2');

class WechatAdapter extends Adapter {
  constructor(robot) {
    super(robot);
    this.sbotAdapter = hubotWechat.use(robot);
    if (this.sbotAdapter) {
      this.sbotAdapter.once('connected', () => {
        this.emit('connected');
      });
    }
  }

  send(envelope, ...messages) {
    this.sbotAdapter.send(envelope, ...messages);
  }

  reply(envelope, ...messages) {
    this.sbotAdapter.reply(envelope, ...messages);
  }

  run() {
    this.sbotAdapter.run();
  }
}

exports.use = function(robot) {
  return new WechatAdapter(robot);
};