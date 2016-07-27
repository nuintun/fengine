#!/usr/bin/env node

'use strict';

// set process title
process.title = 'fengine';

var fengine = require('../');
var program = require('commander');
var colors = require('colors/safe');
var pkg = require('../package.json');

// set commander
program
  .allowUnknownOption()
  .version(pkg.version)
  .description(colors.cyan.bold(pkg.description))
  .usage('[options] <value ...>')
  .option('-p, --port <number>', 'set the server port [default: 80]', function (value, def){
    value = Math.abs(parseInt(value));

    if (value !== value || value === Infinity) {
      value = def;
    }

    return value;
  }, 80)
  .on('--help', function (){
    var help = '  For more information, find our manual at ' + pkg.homepage + '\n';

    process.stdout.write(colors.green.bold(help));
  })
  .parse(process.argv);

// run fengine
fengine.run(program);
