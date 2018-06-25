const fs = require('fs');
const mkp = require('mkdirp');

function mkdirp(dirpath, options) {
  if (!fs.existsSync(dirpath)) {
    mkp.sync(dirpath);
  }
}

module.exports = {
  mkdirp
};
