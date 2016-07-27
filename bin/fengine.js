#!/usr/bin/env node

'use strict';

// set process title
process.title = 'fengine';

var fengine = require('../');
var program = require('commander');
var colors = require('colors/safe');
var pkg = require('../package.json');

program
  .allowUnknownOption()
  .version(pkg.version)
  .description(colors.cyan.bold(pkg.description))
  .usage('[options] <value ...>')
  .option('-p, --port <number>', 'set the server port [default: 80]', function (value){
    value = Math.abs(parseInt(value));

    if (value !== value || value === Infinity) {
      value = 80;
    }

    return value;
  })
  .on('--help', function (){
    var help = '  For more information, find our manual at ' + pkg.homepage + '\n';

    process.stdout.write(colors.green.bold(help));
  })
  .parse(process.argv);

console.log(program.port);
