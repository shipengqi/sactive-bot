const {Dialog} = require('sbot-conversation');

function createDialog(robot, type, name) {
  let instances = {};
  return (function() {
    if (!instances[name]) {
      instances[name] = createInstance(robot, type);
    }
    return instances[name];
  })();
}

function createInstance(robot, type) {
  return new Dialog(robot, type);
}

module.exports = {
  createDialog,
  Dialog
};