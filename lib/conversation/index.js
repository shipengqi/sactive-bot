let Dialog = require('./dialog');
let createDialog = function(robot, type) {
  if (!Dialog.instance) {
    Dialog.instance = new Dialog(robot, type);
  }
  return Dialog.instance;
};

let createVCDialog = function(robot, type) {
  if (!Dialog.vcInstance) {
    Dialog.vcInstance = new Dialog(robot, type);
  }
  return Dialog.vcInstance;
};

module.exports = {
  Dialog,
  createDialog,
  createVCDialog
};
