/**
 * @module configure
 * @license MIT
 * @version 2017/11/14
 */

'use strict';

// Import lib
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const utils = require('./utils');

// Variable declaration
const CWD = process.cwd();

/**
 * @function formatWatch
 * @param {Array} watch
 * @returns {Array}
 */
function formatWatch(watch) {
  const unique = {};
  const result = [];

  watch.forEach((value) => {
    value = value.toLowerCase();

    if (!unique[value]) {
      unique[value] = true;

      result.push(value);
    }
  });

  return result;
}

/**
 * @function configure
 * @param {number} port
 * @returns {Object}
 */
module.exports = function(port) {
  let yml = path.resolve(CWD, 'fengine.yml');
  const DEFAULT_WATCH = ['.htm', '.html', '.shtml'];

  // File config
  if (utils.existsSync(yml)) {
    // Parse yaml
    const source = fs.readFileSync(yml);

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
  yml.watch = Array.isArray(yml.watch) ? formatWatch(yml.watch.concat(DEFAULT_WATCH)) : DEFAULT_WATCH;

  return yml;
};
