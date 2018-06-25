const RasaNluService = require('./rasa_nlu_service');
const RasaNluProcess = require('./rasa_nlu_process');

let getRasaNluProcessInstance = function(robot) {
  if (!RasaNluProcess.instance) {
    RasaNluProcess.instance = new RasaNluProcess(robot);
  }
  return RasaNluProcess.instance;
};

module.exports = {
  RasaNluService,
  RasaNluProcess,
  getRasaNluProcessInstance
};
