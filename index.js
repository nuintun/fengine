/*!
 * index
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/Nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/fengine/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var util = require('./lib/util');
var Fengine = require('./lib/fengine');

// variable declaration
var CWD = process.cwd();

/**
 * file is exists sync
 * @param path
 * @param [mode]
 * @returns {boolean}
 */
var existsSync = fs.accessSync ? function (path, mode){
  try {
    fs.accessSync(path, fs.constants[mode]);

    return true;
  } catch (e) {
    return false;
  }
} : fs.existsSync;

module.exports.run = function (port){
  var yml = path.resolve(CWD, 'fengine.yml');

  // file config
  if (existsSync(yml, 'R_OK')) {
    // parse yaml
    try {
      yml = fs.readFileSync(yml);
      yml = yaml.safeLoad(yml);
      yml = yml || {};
    } catch (exception) {
      console.log(JSON.stringify(exception, null, 2));
    }
  } else {
    yml = {};
  }

  yml.root = CWD;
  yml.port = yml.port || port;
  yml.hostname = yml.hostname || '127.0.0.1';
  yml.base = util.string(yml.base) ? path.join(CWD, yml.base) : CWD;
  yaml.data = util.mix(yaml.data || {}, {
    server: yml.hostname + ':' + yml.port
  });

  new Fengine(yml);
};
