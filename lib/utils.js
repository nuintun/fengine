/**
 * @module utils
 * @license MIT
 * @version 2017/11/14
 */

'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const parseURL = require('url').parse;

const relative = path.relative;

// Prototype method
const toString = Object.prototype.toString;
const getPrototypeOf = Object.getPrototypeOf;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const fnToString = hasOwnProperty.toString;
const objectFunctionString = fnToString.call(Object);

// Variable declaration
const EXTRACTTYPE_RE = /\[object (.+)\]/;
const REGEXSYMBOL_RE = /[\[\]\\.^|()*+$:?!-]/g;
const LOG_LEVELS = { INFO: 0, WARN: 1, ERROR: 2 };

/**
 * @function dateFormat
 * @description Simple date format
 * @param {Date} date
 * @param {string} format
 * @returns {string}
 */
function dateFormat(date, format) {
  if (!date instanceof Date) {
    throw new TypeError('param date must be a date.');
  }

  format = format || 'YYYY-MM-DD hh:mm:ss';

  const map = {
    'Y': date.getFullYear(), // Year
    'M': date.getMonth() + 1, // Month
    'D': date.getDate(), // Date
    'h': date.getHours(), // Hours
    'm': date.getMinutes(), // Minutes
    's': date.getSeconds() // Seconds
  };

  format = format.replace(/([YMDhms])+/g, (matched, key) => {
    let value = map[key];

    if (key === 'Y') {
      return String(value).substr(Math.max(0, 4 - matched.length));
    } else {
      if (matched.length > 1) {
        value = '0' + value;
        value = value.substr(value.length - 2);
      }

      return value;
    }
  });

  return format;
}

/**
 * @function typeOf
 * @param {any} value
 * @returns {string}
 */
function typeOf(value) {
  // Get real type
  let type = toString.call(value).toLowerCase();

  type = type.replace(EXTRACTTYPE_RE, '$1').toLowerCase();

  // Is nan and infinity
  if (type === 'number') {
    // Is nan
    if (value !== value) {
      return 'nan';
    }

    // Is infinity
    if (value === Infinity || value === -Infinity) {
      return 'infinity';
    }
  }

  // Return type
  return type;
}

/**
 * @function isFunction
 * @param {any} value
 * @returns {boolean}
 */
function isFunction(value) {
  return typeOf(value) === 'function';
}

/**
 * @function isString
 * @param {any} value
 * @returns {boolean}
 */
function isString(value) {
  return typeOf(value) === 'string';
}

/**
 * @function isPlainObject
 * @param {any} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  let proto, ctor;

  // Detect obvious negatives
  if (!value || typeOf(value) !== 'object') {
    return false;
  }

  // Proto
  proto = getPrototypeOf(value);

  // Objects with no prototype (e.g., `Object.create( null )`) are plain
  if (!proto) {
    return true;
  }

  // Objects with prototype are plain iff they were constructed by a global Object function
  ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;

  return typeof ctor === 'function' && fnToString.call(ctor) === objectFunctionString;
}

/**
 * @function extend
 * @returns {Object}
 */
function extend() {
  let i = 1;
  let deep = false;
  let target = arguments[0] || {};
  const length = arguments.length;
  let options, name, src, copy, copyIsArray, clone;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    // Skip the boolean and the target
    target = arguments[i++] || {};
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !isFunction(target)) {
    target = {};
  }

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) != null) {
      // Extend the base object
      for (name in options) {
        // Only copy own property
        if (!options.hasOwnProperty(name)) {
          continue;
        }

        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        // Recurse if we're merging plain objects or arrays
        if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false;
            clone = src && Array.isArray(src) ? src : [];
          } else {
            clone = src && isPlainObject(src) ? src : {};
          }

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);
        } else if (copy !== undefined) {
          // Don't bring in undefined values
          target[name] = copy;
        }
      }
    }
  }

  // Return the modified object
  return target;
}

/**
 * @function str4regex
 * @description String for regex
 * @param {string} string
 * @returns {void|XML}
 */
function str4regex(string) {
  REGEXSYMBOL_RE.lastIndex = 0;

  return string.replace(REGEXSYMBOL_RE, '\\$&');
}

/**
 * @function normalize
 * @description Normalize path
 * @param {string} path
 * @returns {string}
 */
function normalize(path) {
  // \a\b\.\c\.\d ==> /a/b/./c/./d
  path = path.replace(/\\/g, '/');

  // :///a/b/c ==> ://a/b/c
  path = path.replace(/:\/{3,}/, '://');

  // /a/b/./c/./d ==> /a/b/c/d
  path = path.replace(/\/\.\//g, '/');

  // a//b/c ==> a/b/c
  // //a//b/c ==> a/b/c
  // a///b/////c ==> a/b/c
  path = path.replace(/\/{2,}/g, '/');

  // Transfer path
  let src = path;
  // DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
  const DOUBLE_DOT_RE = /([^/]+)\/\.\.(?:\/|$)/g;

  // a/b/c/../../d ==> a/b/../d ==> a/d
  do {
    src = src.replace(DOUBLE_DOT_RE, (matched, dirname) => {
      return dirname === '..' ? matched : '';
    });

    // Break
    if (path === src) {
      break;
    } else {
      path = src;
    }
  } while (true);

  // Get path
  return path;
}

/**
 * @function isOutBound
 * @description Test path is out of bound of base
 * @param {string} path
 * @param {string} root
 * @returns {boolean}
 */
function isOutBound(path, root) {
  path = relative(root, path);

  if (/\.\.(?:[\\/]|$)/.test(path)) return true;

  return false;
}

/**
 * @function decodeURI
 * @description Decode URI component.
 * @param {string} uri
 * @returns {string|-1}
 */
function decodeURI(uri) {
  try {
    return decodeURIComponent(uri);
  } catch (err) {
    return -1;
  }
}

/**
 * @function pad
 * @description Converts a number to a string with a given amount of leading characters.
 * @param {number} number Number to convert.
 * @param {number} width Amount of leading characters to prepend.
 * @param {string} [padding = '0'] leading character.
 * @throws Error
 * @returns {string}
 */
function pad(number, width, padding) {
  // Convert number to string.
  const string = number.toString();

  // Return either the original number as string,
  // or the number with leading padding characters.
  if (!width || string.length >= width) {
    return string;
  }

  const leadingCharacters = new Array(width - string.length + 1).join(padding || '0');

  return leadingCharacters + string;
}

/**
 * @function isLegalPort
 * @description Check that the port number is not NaN when coerced to a number,
 *  is an integer and that it falls within the legal range of port numbers.
 * @param {any} port
 * @returns {boolean}
 */
function isLegalPort(port) {
  return port === port >>> 0 && port <= 0xFFFF;
}

/**
 * @function existsSync
 * @description File exists sync
 * @param {string} src
 * @returns {boolean}
 */
function existsSync(src) {
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
 * @function log
 * @param {Object} message
 */
function log(message) {
  const type = message.type;
  let data = message.data;
  const bookmark = dateFormat(new Date());
  let output = chalk.reset.green.bold('[' + bookmark + '] ');

  switch (type) {
    case LOG_LEVELS.INFO:
      data = chalk.reset.cyan(data);
      break;
    case LOG_LEVELS.WARN:
      data = chalk.reset.yellow(data);
      break;
    case LOG_LEVELS.ERROR:
      data = chalk.reset.red(data);
      break;
  }

  // Break line
  output += data + '\n';

  // Output message
  if (type === LOG_LEVELS.INFO) {
    process.stdout.write(output);
  } else {
    process.stderr.write(output);
  }
}

/**
 * @function pathname
 * @param {string} url
 * @returns {string}
 */
function pathname(url) {
  return parseURL(url).pathname;
}

// Exports
module.exports = {
  pad,
  log,
  typeOf,
  extend,
  pathname,
  str4regex,
  normalize,
  decodeURI,
  isOutBound,
  existsSync,
  LOG_LEVELS,
  isLegalPort,
  fn: isFunction,
  string: isString
};
