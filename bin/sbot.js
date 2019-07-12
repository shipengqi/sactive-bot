#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const program = require('commander');
const {
  run,
  create,
  createAndRun
} = require('./utils');

let command = null;
if (process.platform === 'win32') {
  let rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => {
    console.log('SIGINT Finished');
    process.emit('SIGINT');
  });
}

process.on('SIGINT', () => {
  console.log('Finished');
  process.exit(0);
});
program
  .version(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    ).version
  );

program
  .command('run')
  .alias('start')
  .description('start a bot')
  .option('-p, --platform [name]', 'specify platform name')
  .action(cmd => {
    command = cmd;
    run(cmd);
  })
  .on('--help', () => {
    console.log();
    console.log('  Examples:');
    console.log();
    console.log('    $ sbot start');
    console.log('    $ sbot start -p wechat');
    console.log();
  });

program
  .command('create')
  .description('create a bot')
  .option('-c, --config [file]', 'configuration file')
  .option('-s, --start', 'create and start bot')
  .action(cmd => {
    command = cmd;
    if (cmd.start) {
      return createAndRun(cmd);
    }
    create(cmd);
  })
  .on('--help', () => {
    console.log();
    console.log('  Examples:');
    console.log();
    console.log('    $ sbot create');
    console.log('    $ sbot create -s');
    console.log('    $ sbot create -c file -s');
    console.log();
  });

program.parse(process.argv);

if (!program.args.length || !command || command === '') {
  program.help();
}