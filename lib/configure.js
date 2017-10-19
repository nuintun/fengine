/*!
 * configure
 *
 * Date: 2017/10/19
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// Import lib
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var utils = require('./utils');

// Variable declaration
var CWD = process.cwd();

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
module.exports = function(port) {
  var yml = path.resolve(CWD, 'fengine.yml');

  // File config
  if (utils.existsSync(yml)) {
    // Parse yaml
    var source = fs.readFileSync(yml);

    yml = yaml.safeLoad(source, { filename: yml });
  } else {
    yml = {};
  }

  // Format options
  yml.root = CWD;
  yml.layout = yml.layout || null;
  yml.data = utils.extend(true, {}, yml.data);
  yml.base = utils.string(yml.base) ? path.join(CWD, yml.base) : CWD;
  yml.hostname = yml.hostname && utils.string(yml.hostname) ? yml.hostname : null;
  yml.port = port || port === 0 ? port : (utils.isLegalPort(+yml.port) ? +yml.port : 0);
  yml.watch = Array.isArray(yml.watch) ? formatWatch(yml.watch.concat(['.htm', '.html'])) : ['.htm', '.html'];

  return yml;
};
