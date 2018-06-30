const Di = require('sactive-di');
const fs = require('fs');
const _ = require('lodash');

let instance = null;
function getInjector() {
  if (instance === null) {
    instance = new Di();
  }
  return instance;
}

function loadBinders() {
  let injector = getInjector();
  let files = fs.readdirSync(__dirname);
  let binders = _.filter(files, file => {
    return file.endsWith('_binder.js');
  });

  _.each(binders, binder => {
    require(`${__dirname}/${binder}`)(injector);
  });
}

module.exports = {
  injector: getInjector(),
  loadBinders
};