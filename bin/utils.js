function create(cmd) {
  console.log(cmd.config);
  console.log(cmd.start);
}

function run(cmd) {
  console.log(cmd.name);
}

function createAndRun(cmd) {
  create(cmd);
  run(cmd);
}

module.exports = {
  createAndRun,
  create,
  run
};