#!/usr/bin/env node

'use strict';

// set process title
process.title = 'fengine';

var Tilda = require('tilda');
var fengine = require('../');
var colors = require('colors/safe');
var pkg = require('../package.json');

// set commander
new Tilda({
  name: 'fengine',
  version: pkg.version,
  description: colors.cyan.bold(pkg.description),
  documentation: colors.magenta.bold(pkg.homepage),
  examples: ['fengine', 'fengine -p 80'],
  notes: 'Well, this is just a tiny example how to use fengine.'
}).option([
  {
    default: 80,
    name: 'port',
    type: 'number',
    opts: ['p', 'port'],
    desc: 'Set the server port.'
  }
]).main(function (tilda){
  var port = tilda.options.port;

  console.log(port.value < 0 ? port.default : port.value);
});

