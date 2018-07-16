const {Dialog} = require('sbot-conversation');
let instances = {};
function createDialog(robot, type, name) {
  if (!instances[name]) {
    instances[name] = createInstance(robot, type);
  }
  return instances[name];
}

function createInstance(robot, type) {
  return new Dialog(robot, type);
}

module.exports = {
  createDialog,
  Dialog
};