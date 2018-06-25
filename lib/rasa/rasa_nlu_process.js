const _ = require('lodash');
const jsf = require('jsonfile');
const fs = require('fs');
const logger = require('winston');
const {
  WordTokenizer,
  NaturalLanguageProcess
} = require('../natural_language');
const {
  DEFAULT_RASA_NLU_TRAINING_DATA_PATH,
  DEFAULT_CONFIDENCE
} = require('./constant');
const RasaNluService = require('./rasa_nlu_service');
let rasaTraingingDataPath = process.env.CHATOPS_RASA_NLU_TRAINING_DATA_PATH || DEFAULT_RASA_NLU_TRAINING_DATA_PATH;
let wordTokenizer = new WordTokenizer({discardEmptyStr: true});

class RasaNluProcess {
  constructor(robot) {
    this.robot = robot;
    this.rasaNluServerEndpoint = process.env.CHATOPS_RASA_NLU_SERVER_ENDPOINT;
    this.rasaProjectName = process.env.CHATOPS_RASA_PROJECT_NAME || 'chatops-default';
    this.rasaService = new RasaNluService(this.rasaNluServerEndpoint);
    this.naturalLanguageProcess = new NaturalLanguageProcess(robot);
  }

  /**
   * training the data in RASA NLU Server
   * @param filePath <string>  the json file path of training data
   * @returns {Promise.<*>}
   */
  async loadingTrainingData(filePath) {
    logger.info('Starting load RASA NLU training data...');
    let trainingFiles = getTrainingFiles(filePath);
    if (trainingFiles.length === 0) {
      let m = `No RASA training file found in path: ${filePath}`;
      logger.debug(m);
      return Promise.reject(m);
    }

    let finishTrainingFiles = [];
    let failedTrainingFiles = [];
    for (let file of trainingFiles) {
      let data = jsf.readFileSync(file);
      await this.rasaService.training(data, this.rasaProjectName)
        .then(resp => {
          finishTrainingFiles.push(file);
        })
        .catch(err => {
          failedTrainingFiles.push(file);
          logger.debug(`Loading RASA training file ${file} failed`);
          logger.debug(err);
        });
    }
    let trainingResult = {
      finished: finishTrainingFiles.toString(),
      failed: failedTrainingFiles.toString()
    };
    logger.info(`RASA NLU training file(s) loading finished, result = ${JSON.stringify(trainingResult)}`);
    return trainingResult;
  }

  async parseToBotCommand(text) {
    try {
      let result = {
        targetCommand: '',
        actualCommand: '',
        rasaEntities: {}
      };

      let tokenizedWords = wordTokenizer.tokenize(text);
      let botName = tokenizedWords.shift();
      let userInputText = tokenizedWords.join(' ');

      let parseResult = await this.rasaService.parseWithNlu(userInputText, this.rasaProjectName);
      if (parseResult.intent) {
        let tmp = parseResult.intent.name.replace(/(^\s*)|(\s*$)/g, '');
        result.targetCommand = `${tmp}`;
        let processResult = this.naturalLanguageProcess.misspellingProcess(`${botName} ${result.targetCommand}`);
        result.actualCommand = processResult.status.actualStr;
      }
      if (parseResult.entities) {
        _.forEach(parseResult.entities, value => {
          if (value.entity) {
            result.rasaEntities[value.entity] = value;
          }
        });
      }
      let rasaConfidence = process.env.CHATOPS_RASA_CONFIDENCE || DEFAULT_CONFIDENCE;
      logger.info(`The confidence value from RASA NLU is: ${parseResult.intent.confidence}`);
      if (parseResult.intent.confidence >= rasaConfidence) {
        return result;
      } else {
        let m = `The confidence is less than ${rasaConfidence}`;
        return Promise.reject(m);
      }
    } catch (err) {
      logger.debug(err);
    }
  }
}

function getTrainingFiles(filePath) {
  let result = [];
  let files = fs.readdirSync(filePath);
  _.forEach(files, file => {
    let fPath = filePath + '/' + file;
    let stat = fs.statSync(fPath);
    if (stat.isDirectory()) {
      getTrainingFiles(fPath);
    } else if (fPath.endsWith('.json')) {
      result.push(fPath);
    }
  });
  return result;
}

module.exports = RasaNluProcess;
