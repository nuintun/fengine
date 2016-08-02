/*!
 * util
 * Version: 0.0.1
 * Date: 2016/7/29
 * https://github.com/Nuintun/fengine
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// object to sting
var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// variable declaration
var BACKSLASH_RE = /\\/g;
var DOT_RE = /\/\.\//g;
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
var MULTI_SLASH_RE = /([^:/])\/+\//g;
var PROTOCOL_SLASH_RE = /(:)?\/{2,}/;
var REGEXSYMBOLRE = /[\[\]\\.^|()*+$:?!-]/g;

/**
 * is array
 * @type {Function}
 */
var isArray = Array.isArray ? Array.isArray : function (value){
  return type(value) === 'array';
};

/**
 * type
 * @param value
 * @returns {*}
 */
function type(value){
  // get real type
  var type = toString.call(value).toLowerCase();

  type = type.replace(/\[object (.+)]/, '$1').toLowerCase();

  // nan and infinity
  if (type === 'number') {
    // nan
    if (value !== value) {
      return 'nan';
    }

    // infinity
    if (value === Infinity || value === -Infinity) {
      return 'infinity';
    }
  }

  // return type
  return type;
}

/**
 * is plain object
 * @param value
 * @returns {*}
 */
function isPlainObject(value){
  if (type(value) !== 'object') {
    return false;
  }

  var hasOwnConstructor = hasOwnProperty.call(value, 'constructor');
  var hasIsPrototypeOf = value.constructor && value.constructor.prototype
    && hasOwnProperty.call(value.constructor.prototype, 'isPrototypeOf');

  // not own constructor property must be Object
  if (value.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    return false;
  }

  // own properties are enumerated firstly, so to speed up,
  // if last one is own, then all properties are own.
  var key;

  for (key in value) {}

  return key === undefined || hasOwnProperty.call(value, key);
}

/**
 * extend
 * @returns {*}
 */
function extend(){
  var i = 1;
  var deep = false;
  var target = arguments[0];
  var dataType = type(target);
  var length = arguments.length;
  var options, name, src, copy, copyIsArray, clone;

  // handle a deep copy situation
  if (dataType === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  } else if ((dataType !== 'object' && dataType !== 'function') || target == null) {
    target = {};
  }

  for (; i < length; ++i) {
    options = arguments[i];

    // only deal with non-null/undefined values
    if (options !== null) {
      // extend the base object
      for (name in options) {
        if (!options.hasOwnProperty(name)) continue;

        src = target[name];
        copy = options[name];

        // prevent never-ending loop
        if (target !== copy) {
          // recurse if we're merging plain objects or arrays
          if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && isArray(src) ? src : [];
            } else {
              clone = src && isPlainObject(src) ? src : {};
            }

            // never move original objects, clone them
            target[name] = extend(deep, clone, copy);
          } else if (copy !== undefined) {
            // don't bring in undefined values
            target[name] = copy;
          }
        }
      }
    }
  }

  // return the modified object
  return target;
}

/**
 * string for regex
 * @param string
 * @returns {void|XML}
 */
function str4regex(string){
  return string.replace(REGEXSYMBOLRE, function (symbol){
    return '\\' + symbol;
  });
}

// exports
module.exports = {
  type: type,
  extend: extend,
  string: function (value){
    return type(value) === 'string';
  },
  fn: function (value){
    return type(value) === 'function';
  },
  array: isArray,
  nan: function (value){
    return type(value) === 'nan';
  },
  infinity: function (value){
    return type(value) === 'infinity';
  },
  number: function (value){
    return type(value) === 'number';
  },
  str4regex: str4regex,
  /**
   * normalize path
   * @param path
   * @returns {string}
   */
  normalize: function (path){
    // \a\b\.\c\.\d ==> /a/b/./c/./d
    path = path.replace(BACKSLASH_RE, '/');

    // :///a/b/c ==> ://a/b/c
    path = path.replace(PROTOCOL_SLASH_RE, '$1//');

    // /a/b/./c/./d ==> /a/b/c/d
    path = path.replace(DOT_RE, '/');

    // @author wh1100717
    // a//b/c ==> a/b/c
    // a///b/////c ==> a/b/c
    // DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
    path = path.replace(MULTI_SLASH_RE, '$1/');

    // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
    while (path.match(DOUBLE_DOT_RE)) {
      path = path.replace(DOUBLE_DOT_RE, '/');
    }

    // get path
    return path;
  }
};
