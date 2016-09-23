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

// lib
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var colors = require('colors');
var util = require('./lib/util');
var Fengine = require('./lib/fengine');

// variable declaration
var CWD = process.cwd();

/**
 * file exists sync
 * @param src
 * @returns {boolean}
 */
function fileExistsSync(src){
  if (!src) return false;

  try {
    return fs.statSync(src).isFile();
  } catch (error) {
    // check exception. if ENOENT - no such file or directory ok, file doesn't exist.
    // otherwise something else went wrong, we don't have rights to access the file, ...
    if (error.code != 'ENOENT') {
      throw error;
    }

    return false;
  }
}

/**
 * assert port
 * @param port
 * @returns {boolean}
 */
function assertPort(port){
  return util.number(port) && isFinite(port);
}

/**
 * format watch
 * @param watch
 * @returns {Array}
 */
function formatWatch(watch){
  var unique = {};
  var result = [];

  watch.forEach(function (value){
    value = value.toLowerCase();

    if (!unique[value]) {
      unique[value] = true;

      result.push(value);
    }
  });

  return result;
}

/**
 * run
 * @param port
 */
module.exports.run = function (port){
  var yml = path.resolve(CWD, 'fengine.yml');

  // file config
  if (fileExistsSync(yml)) {
    // parse yaml
    var source = fs.readFileSync(yml);

    yml = yaml.safeLoad(source, { filename: yml });
  } else {
    yml = {};
  }

  // format options
  yml.root = CWD;
  yml.layout = yml.layout || null;
  yml.data = util.extend(true, {}, yml.data);
  yml.base = util.string(yml.base) ? path.join(CWD, yml.base) : CWD;
  yml.hostname = yml.hostname && util.string(yml.hostname) ? yml.hostname : false;
  yml.port = port !== null ? port : assertPort(yml.port) ? Math.abs(yml.port) : null;
  yml.watch = util.array(yml.watch)
    ? formatWatch(yml.watch.concat(['.htm', '.html']))
    : ['.htm', '.html'];

  // run fengine
  new Fengine(yml);
};
