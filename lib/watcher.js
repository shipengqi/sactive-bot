const Chokidar = require('chokidar');
const logger = require('winston');
const Path = require('path');
const fs = require('fs');
const _ = require('lodash');
const AdmZip = require('adm-zip');
const I18nConfigure = require('../i18n/i18n_configure');
const {
  getRasaNluProcessInstance
} = require('../rasa');
const {
  checkPathAndCreate
} = require('./functionUtils');
const {
  createDialog,
  createVCDialog
} = require('../conversation');

class ContentPackWatcher {
  constructor(robot, options = {awaitWriteFinish: true}) {
    let CONSUMER_SCRIPTS_PATH = `${process.env.HUBOT_ENTERPRISE_ROOT}/scripts`;
    if (process.env.ENV_TYPE !== 'kubernetes' && !_.isEmpty(process.env.HUBOT_SCRIPTS)) {
      CONSUMER_SCRIPTS_PATH = process.env.HUBOT_SCRIPTS;
    }
    checkPathAndCreate(process.env.HUBOT_ENTERPRISE_PACKAGES_DIR);
    checkPathAndCreate(CONSUMER_SCRIPTS_PATH);
    checkPathAndCreate(`${process.env.HUBOT_ENTERPRISE_ROOT}/scripts`);
    checkPathAndCreate(`${process.env.HUBOT_ENTERPRISE_ROOT}/training_data`);
    let dirPath = `${process.env.HUBOT_ENTERPRISE_PACKAGES_DIR}/*.zip`;
    this.robot = robot;
    this.i18n = new I18nConfigure(robot);
    this.rasaNluProcess = getRasaNluProcessInstance(robot);
    this.watcher = Chokidar.watch(dirPath, options);
    this.watcher
      .on('add', this.addFileListener.bind(this))
      .on('addDir', this.addDirectoryListener.bind(this))
      .on('change', this.fileChangeListener.bind(this))
      .on('unlink', this.fileDeleteListener.bind(this))
      .on('unlinkDir', this.directoryDeleteListener.bind(this))
      .on('error', this.errorListener.bind(this))
      .on('ready', this.readyListener.bind(this));
    this.CONSUMER_SCRIPTS_PATH = CONSUMER_SCRIPTS_PATH;
  }

  getWatched() {
    return this.watcher.getWatched();
  }

  stopWatch(paths) {
    this.watcher.unwatch(paths);
  }

  readyListener() {
    logger.info('Initial scan complete. Ready for changes.');
  }

  errorListener(error) {
    logger.error('Error happened', error);
  }

  // add new file
  addFileListener(filePath, stats) {
    if (stats.size > 0) {
      logger.info(`File ${filePath} has been added, size: ${stats.size}.`);
      this._change(filePath);
    }
  }

  // add new directory
  addDirectoryListener(dirPath) {
    logger.info(`Directory ${dirPath} has been added.`);
  }

  // watch file change
  fileChangeListener(filePath, stats) {
    if (stats.size > 0) {
      logger.info(`File ${filePath} has been changed, size: ${stats.size}.`);
      this._change(filePath);
    }
  }

  // watch file delete
  fileDeleteListener(filePath) {
    logger.info(`File ${filePath} has been removed.`);
    this._delete(filePath);
  }

  // watch directory delete
  directoryDeleteListener(dirPath) {
    logger.info(`Directory ${dirPath} has been removed.`);
  }

  _change(filePath) {
    let self = this;
    self._delete(filePath, true);
    let integration = Path.basename(filePath).split('_')[0];
    let zip = new AdmZip(filePath);
    let zipEntries = zip.getEntries();
    try {
      zipEntries.forEach(zipEntry => {
        if (zipEntry.entryName === `${integration}/`) {
          zip.extractEntryTo(zipEntry.entryName, self.CONSUMER_SCRIPTS_PATH, true, true);
        }

        if (zipEntry.entryName === 'locales/') {
          zip.extractEntryTo(zipEntry.entryName, `${process.env.HUBOT_ENTERPRISE_ROOT}/locales`, false, true);
        }

        if (zipEntry.entryName === 'training_data/' && process.env.CHATOPS_RASA_ENABLE === 'yes') {
          zip.extractEntryTo(zipEntry.entryName, `${process.env.HUBOT_ENTERPRISE_ROOT}/training_data`, false, true);
        }
      });
      this._reload();
    } catch (e) {
      logger.error(`Auto reload script file or locale files failed, please check ${filePath}.`);
      logger.error(e);
    }
  }

  _delete(filePath, justDelete) {
    let self = this;
    let integration = Path.basename(filePath).split('_')[0];
    try {
      deleteFolderRecursive(`${self.CONSUMER_SCRIPTS_PATH}/${integration}`);
      fs.readdirSync(`${process.env.HUBOT_ENTERPRISE_ROOT}/locales`)
        .forEach(file => {
          if (file.startsWith(`${integration}`)) {
            fs.unlinkSync(`${process.env.HUBOT_ENTERPRISE_ROOT}/locales/${file}`);
          }
        });
      fs.readdirSync(`${process.env.HUBOT_ENTERPRISE_ROOT}/training_data`)
        .forEach(file => {
          fs.unlinkSync(`${process.env.HUBOT_ENTERPRISE_ROOT}/training_data/${file}`);
        });
      if (!justDelete) {
        let mtimeMs = 0;
        let latestFile = null;
        let otherFiles = [];
        fs.readdirSync(process.env.HUBOT_ENTERPRISE_PACKAGES_DIR)
          .forEach(file => {
            if (`${process.env.HUBOT_ENTERPRISE_PACKAGES_DIR}/${file}`.endsWith('.zip')) {
              if (file.includes(integration)) {
                let tempStat = fs.statSync(`${process.env.HUBOT_ENTERPRISE_PACKAGES_DIR}/${file}`);
                if (tempStat.mtimeMs > mtimeMs) {
                  mtimeMs = tempStat.mtimeMs;
                  latestFile = `${process.env.HUBOT_ENTERPRISE_PACKAGES_DIR}/${file}`;
                } else {
                  otherFiles.push(`${process.env.HUBOT_ENTERPRISE_PACKAGES_DIR}/${file}`);
                }
              }
            }
          });
        if (latestFile) {
          logger.info(`Remove content: ${filePath}, reload latest content: ${latestFile}`);
          return self._change(latestFile);
        }
        if (otherFiles.length > 0) {
          logger.info(`Remove content: ${filePath},cannot read file's create time, reload content: ${otherFiles[0]}`);
          return self._change(otherFiles[0]);
        }

        this._reload();
      }
    } catch (e) {
      logger.error(`Auto delete script file or locale files failed, please check ${filePath}.`);
      logger.error(e);
    }
  }

  _reload() {
    this.robot.e = {};
    this.robot.e.integrationCommandReceiverCallbacks = {};
    this.robot.e.registrar = {apps: {}, mapping: {}};
    this.robot.e.i18nConfigRegisterObj = {integrations: {}, rooms: {}};
    this.robot.commands = [];
    this.robot.listeners = [];

    logger.info(`Clean up all conversations ...`);
    let dialog = createDialog(this.robot);
    dialog.conversationManage._cleanUp();

    let VCDialog = createVCDialog(this.robot);
    VCDialog.conversationManage._cleanUp();

    logger.info(`Reloading i18n locale files ...`);
    this.i18n.configureI18n({});

    // if rasa enable, loading rasa training data.
    if (process.env.CHATOPS_RASA_ENABLE === 'yes') {
      logger.info(`Reloading RASA training data ...`);
      let traingDataPath = `${process.env.HUBOT_ENTERPRISE_ROOT}/training_data`;
      this.rasaNluProcess.loadingTrainingData(traingDataPath).catch(e => {
        logger.debug(e);
      });
    }

    logger.info(`Reloading script files ...`);
    let customScriptPaths = process.env.HUBOT_SCRIPTS;
    let externalScripts = process.env.HUBOT_NODE_MODULES;
    // Convert external script (hubot-*) scripts into an array
    let customScriptPathArr = _.compact(_.split(customScriptPaths, ' '));
    if (_.isEmpty(customScriptPathArr)) {
      customScriptPathArr = [];
    }

    // Load Hubot Enterprise before everything else
    let srcPath = process.env.HUBOT_ENTERPRISE_ROOT + '/src';
    this.robot.load(srcPath);

    // Load Hubot scripts in path
    let defaultScriptsPath = process.env.HUBOT_ENTERPRISE_ROOT + '/scripts';
    reloadScripts(defaultScriptsPath, this.robot, true);

    // Load Hubot scripts from an additional specified path
    for (let customPath of Array.from(customScriptPathArr)) {
      let scriptPath = '';
      if (customPath[0] === '/') {
        scriptPath = customPath;
      } else {
        scriptPath = Path.resolve('.', customPath);
      }
      if ((scriptPath === srcPath) || (scriptPath === defaultScriptsPath)) {
        logger.info(`Script path: ${scriptPath} has loaded.`);
      } else {
        reloadScripts(scriptPath, this.robot, true);
      }
    }

    // Removed hubot-scripts.json usage since it is deprecated
    // https://github.com/github/hubot-scripts
    if (externalScripts && (externalScripts.length > 0)) {
      this.robot.loadExternalScripts(externalScripts);
    }
  }
}

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      let curPath = path + '/' + file;
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function reloadScripts(scriptPath, robot, deep) {
  for (let file of fs.readdirSync(scriptPath).sort()) {
    let filePath = scriptPath + '/' + file;
    if (fs.statSync(filePath).isDirectory()) {
      if (deep) {
        reloadScripts(filePath, robot, false);
      } else {
        robot.load(filePath);
      }
    } else {
      if (require.cache[require.resolve(filePath)]) {
        delete require.cache[require.resolve(filePath)];
      }
      robot.loadFile(scriptPath, file);
    }
  }
}

let instance = null;
module.exports = {
  ContentPackWatcher: ContentPackWatcher,
  getInstance: function(robot) {
    if (!instance) {
      instance = new ContentPackWatcher(robot);
    }
    return instance;
  }
};
