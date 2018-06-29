const Di = require('sactive-di');
const constantsBinder = require('./constantsBinder');
const utilsBinder = require('./utilsBinder');
const helperBinder = require('./helperBinder');

let instance = null;
function getInjector() {
  if (instance === null) {
    instance = new Di();
  }
  return instance;
}

function loadBinders() {
  let injector = getInjector();
  constantsBinder(injector);
  utilsBinder(injector);
  helperBinder(injector);
}

module.exports = {
  injector: getInjector(),
  loadBinders
};