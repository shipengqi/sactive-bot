const fs = require('fs');
const mkp = require('mkdirp');
const moment = require('moment');

function _date(Time) {
  let time = moment().format('YYYYMMDD');
  if (Time) {
    time = moment(Time).format('YYYYMMDD');
  }
  return time;
}

function _newDate(Time) {
  let time = moment().format('YYYY-MM-DD HH:mm:ss');
  if (Time) {
    time = moment(Time).format('YYYY-MM-DD HH:mm:ss');
  }
  return time;
}

function _second(Time) {
  let time = moment().format('MMDDHHmmss');
  if (Time) {
    time = moment(Time).format('MMDDHHmmss');
  }
  return time;
}

function _timestamp(Time) {
  let time = new Date().getTime();
  if (Time) {
    time = new Date(Time).getTime();
  }
  return time;
}

function checkPathAndCreate(dirpath, options) {
  if (options && options.checkOnly) {
    return fs.existsSync(dirPath);
  }

  if (!fs.existsSync(dirpath)) {
    mkp.sync(dirpath);
  }
}

function deleteFolder(path) {
  if (fs.existsSync(path)) {
    let info = fs.statSync(path);
    if (info.isDirectory()) {
      let files = fs.readdirSync(path);
      files.forEach(file => {
        let curPath = path + '/' + file;
        if (fs.statSync(curPath).isDirectory()) { // recurse
          deleteFolder(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    } else {
      fs.unlinkSync(path);
    }
  }
}

function transformAuthentication(username, pwd) {
  return 'Basic ' + (new Buffer(`${username}:${pwd}`)).toString('base64');
}

module.exports = {
  checkPathAndCreate,
  deleteFolder,
  _timestamp,
  _date,
  _second,
  _newDate,
  transformAuthentication
};
