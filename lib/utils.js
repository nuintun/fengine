/*!
 * utils
 *
 * Date: 2016/7/29
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

var fs = require('fs');
var chalk = require('chalk');

// Prototype method
var toString = Object.prototype.toString;
var getPrototypeOf = Object.getPrototypeOf;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var fnToString = hasOwnProperty.toString;
var objectFunctionString = fnToString.call(Object);

// Variable declaration
var EXTRACTTYPE_RE = /\[object (.+)\]/;
var REGEXSYMBOL_RE = /[\[\]\\.^|()*+$:?!-]/g;
var LOG_LEVELS = { INFO: 0, WARN: 1, ERROR: 2 };

/**
 * Simple date format
 *
 * @param date
 * @param format
 * @returns {String}
 */
function dateFormat(date, format) {
  if (!date instanceof Date) {
    throw new TypeError('param date must be a date.');
  }

  format = format || 'YYYY-MM-DD hh:mm:ss';

  var map = {
    'Y': date.getFullYear(), // Year
    'M': date.getMonth() + 1, // Month
    'D': date.getDate(), // Date
    'h': date.getHours(), // Hours
    'm': date.getMinutes(), // Minutes
    's': date.getSeconds() // Seconds
  };

  format = format.replace(/([YMDhms])+/g, function(matched, key) {
    var value = map[key];

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
 * typeOf
 *
 * @param value
 * @returns {String}
 */
function typeOf(value) {
  // Get real type
  var type = toString.call(value).toLowerCase();

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
 * Is function
 *
 * @param value
 * @returns {Boolean}
 */
function isFunction(value) {
  return typeOf(value) === 'function';
}

/**
 * Is string
 *
 * @param value
 * @returns {Boolean}
 */
function isString(value) {
  return typeOf(value) === 'string';
}

/**
 * Is number
 *
 * @param value
 * @returns {Boolean}
 */
function isNumber(value) {
  return typeOf(value) === 'number';
}

/**
 * Is plain object
 *
 * @param value
 * @returns {Boolean}
 */
function isPlainObject(value) {
  var proto, ctor;

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
 * extend
 *
 * @returns {Object}
 */
function extend() {
  var i = 1;
  var deep = false;
  var length = arguments.length;
  var target = arguments[0] || {};
  var options, name, src, copy, copyIsArray, clone;

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
 * String for regex
 *
 * @param string
 * @returns {void|XML}
 */
function str4regex(string) {
  REGEXSYMBOL_RE.lastIndex = 0;

  return string.replace(REGEXSYMBOL_RE, '\\$&');
}

// Exports
module.exports = {
  typeOf: typeOf,
  fn: isFunction,
  extend: extend,
  string: isString,
  number: isNumber,
  str4regex: str4regex,
  /**
   * Normalize path
   *
   * @param path
   * @returns {String}
   */
  normalize: function(path) {
    // \a\b\.\c\.\d ==> /a/b/./c/./d
    path = path.replace(/\\/g, '/');

    // :///a/b/c ==> ://a/b/c
    path = path.replace(/(:)?\/{2,}/, '$1//');

    // /a/b/./c/./d ==> /a/b/c/d
    path = path.replace(/\/\.\//g, '/');

    // @author wh1100717
    // a//b/c ==> a/b/c
    // a///b/////c ==> a/b/c
    path = path.replace(/([^:/])\/+\//g, '$1/');

    // Transfer path
    var src = path;
    // DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
    var DOUBLE_DOT_RE = /([^/]+)\/\.\.(?:\/|$)/g;

    // a/b/c/../../d ==> a/b/../d ==> a/d
    do {
      src = src.replace(DOUBLE_DOT_RE, function(matched, dirname) {
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
  },
  /**
   * Is out bound
   *
   * @param path
   * @param root
   * @returns {Boolean}
   */
  isOutBound: function(path, root) {
    if (process.platform === 'win32') {
      path = path.toLowerCase();
      root = root.toLowerCase();
    }

    if (path.length < root.length) {
      return true;
    }

    return path.indexOf(root) !== 0;
  },
  /**
   * Decode uri
   *
   * @param uri
   * @returns {String|Number}
   */
  decodeURI: function(uri) {
    try {
      return decodeURIComponent(uri);
    } catch (err) {
      return -1;
    }
  },
  /**
   * Converts a number to a string with
   * a given amount of leading characters.
   *
   * @param {Number} number Number to convert.
   * @param {Number} width Amount of leading characters to prepend.
   * @param {String} [padding = '0'] leading character.
   * @throws Error
   * @returns {String}
   */
  pad: function(number, width, padding) {
    // Convert number to string.
    var string = number.toString();

    // Return either the original number as string,
    // or the number with leading padding characters.
    if (!width || string.length >= width) {
      return string;
    }

    var leadingCharacters = new Array(width - string.length + 1).join(padding || '0');

    return leadingCharacters + string;
  },
  // Check that the port number is not NaN when coerced to a number,
  // is an integer and that it falls within the legal range of port numbers.
  isLegalPort: function(port) {
    return port === port >>> 0 && port <= 0xFFFF;
  },
  /**
   * File exists sync
   *
   * @param src
   * @returns {boolean}
   */
  existsSync: function(src) {
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
  },
  LOG_LEVELS: LOG_LEVELS,
  log: function(message) {
    var type = message.type;
    var data = message.data;
    var bookmark = dateFormat(new Date());
    var output = chalk.reset.green.bold('[' + bookmark + '] ');

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
};