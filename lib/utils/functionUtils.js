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

module.exports = {
  mkdirp,
  eval2,
  envs,
  subByte
};
