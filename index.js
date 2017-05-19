/*!
 * index
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/fengine/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// Import lib
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var colors = require('colors');
var util = require('./lib/util');
var Fengine = require('./lib/fengine');

// Variable declaration
var CWD = process.cwd();

/**
 * File exists sync
 *
 * @param src
 * @returns {boolean}
 */
function fileExistsSync(src) {
  if (!src) return false;

  try {
    return fs.statSync(src).isFile();
  } catch (error) {
    // check exception. if ENOENT - no such file or directory ok, file doesn't exist.
    // otherwise something else went wrong, we don't have rights to access the file, ...
    if (error.code !== 'ENOENT') {
      throw error;
    }

    return false;
  }
}

/**
 * Assert port
 *
 * @param port
 * @returns {boolean}
 */
function assertPort(port) {
  return util.number(port) && isFinite(port);
}

/**
 * Format watch
 *
 * @param watch
 * @returns {Array}
 */
function formatWatch(watch) {
  var unique = {};
  var result = [];

  watch.forEach(function(value) {
    value = value.toLowerCase();

    if (!unique[value]) {
      unique[value] = true;

      result.push(value);
    }
  });

  return result;
}

/**
 * Run
 *
 * @param port
 */
module.exports.run = function(port) {
  var yml = path.resolve(CWD, 'fengine.yml');

  // File config
  if (fileExistsSync(yml)) {
    // Parse yaml
    var source = fs.readFileSync(yml);

    yml = yaml.safeLoad(source, { filename: yml });
  } else {
    yml = {};
  }

  // Format options
  yml.root = CWD;
  yml.layout = yml.layout || null;
  yml.data = util.extend(true, {}, yml.data);
  yml.base = util.string(yml.base) ? path.join(CWD, yml.base) : CWD;
  yml.hostname = yml.hostname && util.string(yml.hostname) ? yml.hostname : false;
  yml.port = assertPort(port) ? Math.abs(port) : assertPort(yml.port) ? Math.abs(yml.port) : 0;
  yml.watch = util.array(yml.watch) ? formatWatch(yml.watch.concat(['.htm', '.html'])) : ['.htm', '.html'];

  // Run fengine
  new Fengine(yml);
};
