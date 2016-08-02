/*!
 * util
 * Version: 0.0.1
 * Date: 2016/7/29
 * https://github.com/Nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/viewport/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// object to sting
var toString = Object.prototype.toString;

// variable declaration
var BACKSLASH_RE = /\\/g;
var DOT_RE = /\/\.\//g;
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
var MULTI_SLASH_RE = /([^:/])\/+\//g;
var PROTOCOL_SLASH_RE = /(:)?\/{2,}/;
var REGEXSYMBOLRE = /[\[\]\\.^|()*+$:?!-]/g;

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
 * mix
 * @param target
 * @param source
 */
function mix(target, source){
  for (var name in source) {
    if (!source.hasOwnProperty(name)) continue;

    var value = source[name];

    if (target[name] && type(value) === 'object') {
      mix(target[name], value);
    } else {
      target[name] = value;
    }
  }

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
  mix: mix,
  type: type,
  string: function (value){
    return type(value) === 'string';
  },
  fn: function (value){
    return type(value) === 'function';
  },
  array: Array.isArray ? Array.isArray : function (value){
    return type(value) === 'array';
  },
  nan: function (){
    return type(value) === 'nan';
  },
  infinity: function (){
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
