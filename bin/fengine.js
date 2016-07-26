#!/usr/bin/env node

'use strict';

// set process title
process.title = 'fengine';

var fengine = require('../');
var colors = require('colors/safe');
var pkg = require('../package.json');
var yargs = require('yargs');

var argv = yargs
  .usage('Usage: [options]')
  .option('p', {
    alias: 'port',
    default: 80,
    describe: 'Server port',
    type: 'number'
  })
  .help('h')
  .alias('h', 'help')
  .argv;

console.log(argv);
