const fs = require('fs');
const mkp = require('mkdirp');

function mkdirp(dirpath) {
  if (!fs.existsSync(dirpath)) {
    mkp.sync(dirpath);
  }
}

function eval2(string) {
  let Func = Function;
  return new Func('return ' + string)();
}

function envs(name, value) {
  if (value) {
    return process.env[name] = value;
  }
  return process.env[name] || null;
}

function subByte(source) {
  source = source.replace(/[^A-Za-zАа-я-Я0-9_`~!@#%&="',;/:<>\-/$()*+.[\]?\\^{}|]+/g, ' ');
  return source;
}

function cleanUpFolder(path) {
  if (fs.existsSync(path)) {
    let info = fs.statSync(path);
    if (info.isDirectory()) {
      let files = fs.readdirSync(path);
      files.forEach(file => {
        let curPath = path + '/' + file;
        if (fs.statSync(curPath).isDirectory()) { // recurse
          cleanUpFolder(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      // fs.rmdirSync(path);
    } else {
      fs.unlinkSync(path);
    }
  }
}

module.exports = {
  mkdirp,
  cleanUpFolder,
  eval2,
  envs,
  subByte
};
