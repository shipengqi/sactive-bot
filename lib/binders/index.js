const Di = require('sactive-di');

function getInjector() {
  let instance = null;
  if (instance === null) {
    instance = new Di();
  }
  return instance;
}

module.exports = {
  injector: getInjector()
};