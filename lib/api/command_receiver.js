const logger = require('winston');
const multer = require('multer');
const Path = require('path');
const moment = require('moment');
const uuid = require('uuid');
const _ = require('lodash');
const mime = require('mime');
const {SUPPORTED_UPLOAD_FILE_TYPE, ORIGINAL_RESPONSE_MSG, ROUTER_URIS} = require('../const');
const CommandReceiverResponse = require('./command_receiver_response');
const {checkPathAndCreate, removeFile} = require('../utils/functionUtils');
const logPath = process.env.HUBOT_ENTERPRISE_LOG_DIR;
const filePath = `${logPath}/files/${moment().format('YYYY_MM_DD')}`;
checkPathAndCreate(filePath);


const commandReceiver = (robot) => {
  if (robot && robot.unifiedApp) {
    let app = robot.unifiedApp;
    let commandReceiverResponse = new CommandReceiverResponse();

    app.post(getRouterPath('/urest/v1') + '/script/:integrationName/:scriptName', (req, res) => {
      let integrationName = req.params.integrationName;
      let scriptName = req.params.scriptName;
      let callback_key = integrationName + '_'+ scriptName;

      let info = (req.body.payload != null) ? JSON.parse(req.body.payload) : req.body;
      info.adapter = robot.adapter;

      let callback = robot.e.integrationCommandReceiverCallbacks[callback_key];

      if (!callback) {
        logger.error(`Can not find the function: ${callback_key}`);
        let result_info = {message: `Can not find the function: ${callback_key}`};
        commandReceiverResponse.responseFailed(404, result_info, res);
        return;
      }

      logger.info(`Successfully get the function: ${callback}`);

      return callback(info)
        .then((result_info) => {
          logger.debug(`Success response from product callback function${callback}`);
          robot.logger.debug(result_info);
          commandReceiverResponse.responseSuccess(result_info, res);
        }).catch((e) => {
          let m = `Error response from product callback function ${callback}, reason = ${e.message}`;
          robot.logger.error(m);
          robot.logger.debug(e);
          commandReceiverResponse.responseFailed(400, e.message, res);
          return;
        });
    });
}
module.exports = {commandReceiver};

