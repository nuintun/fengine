/*!
 * context
 * Version: 0.0.1
 * Date: 2016/7/29
 * https://github.com/Nuintun/fengine
 *
 * Original Author: https://github.com/tmont/html-parser
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// lib
var util = require('./util');

// event types
var EVENTTYPES = [
  'openElement',
  'closeElement',
  'attribute',
  'comment',
  'cdata',
  'text',
  'docType',
  'xmlType',
  'closeOpenedElement'
];

/**
 * format rule
 * @param rule
 * @param porp
 */
function formatRule(rule, porp){
  switch (util.type(rule[porp])) {
    case 'string':
      rule[porp] = util.str2regex(rule[porp]);
      break;
    case 'regexp':
      if (rule[porp].global) {
        var attr = '';

        if (rule[porp].ignoreCase) {
          attr += 'i';
        }

        if (rule[porp].multiline) {
          attr += 'm';
        }

        rule[porp] = util.str2regex(rule[porp].source, attr);
      }
      break;
    default:
      throw new TypeError('rules.dataElements.' + porp + ' must be a sting or regexp.');
      break;
  }
}

/**
 * create read
 * @param raw
 * @param callbacks
 * @param rules
 * @returns {{
 *   text: string,
 *   peek: context.peek,
 *   read: context.read,
 *   readUntilNonWhitespace: context.readUntilNonWhitespace,
 *   readRule: context.readRule,
 *   peekIgnoreWhitespace: context.peekIgnoreWhitespace
 * }}
 */
module.exports.create = function (raw, callbacks, rules){
  var index = 0;
  var current = null;
  var substring = null;

  var context = {
    text: '',
    peek: function (count){
      count = count || 1;

      return this.raw.substr(this.index + 1, count);
    },
    read: function (count, peek){
      var next;

      count = count || 1;

      if (peek) {
        next = this.peek(count);
      }

      this.index += count;

      if (this.index > this.length) {
        this.index = this.length;
      }

      return next;
    },
    readUntilNonWhitespace: function (){
      var next;
      var value = '';

      while (!this.EOF) {
        next = this.read(1, true);

        value += next;

        if (!/\s$/.test(value)) {
          break;
        }
      }

      return value;
    },
    readRule: function (rule){
      var match = rule.exec(this.substring);
      var value = match ? match[0] : '';

      this.index += (match ? match.index : 0) + value.length;

      return match ? value : null;
    },
    readUntilRule: function (rule){
      var substring = this.substring;
      var match = rule.exec(this.substring);

      this.index += match ? match.index : 0;

      return match ? substring.substr(0, match.index) : null;
    },
    peekIgnoreWhitespace: function (count){
      count = count || 1;

      var value = '';
      var next = '';
      var offset = 0;

      do {
        next = this.raw.charAt(this.index + ++offset);

        if (!next) {
          break;
        }

        if (!/\s/.test(next)) {
          value += next;
        }
      } while (value.length < count);

      return value;
    }
  };

  // end of file
  context.__defineGetter__('EOF', function (){
    return this.index >= this.length;
  });

  // current char
  context.__defineGetter__('current', function (){
    return this.EOF ? '' : current === null ? (current = this.raw.charAt(this.index)) : current;
  });

  // raw code
  context.__defineGetter__('raw', function (){
    return raw;
  });

  // raw length
  context.__defineGetter__('length', function (){
    return this.raw.length;
  });

  // index
  context.__defineGetter__('index', function (){
    return index;
  });

  // set index
  context.__defineSetter__('index', function (value){
    index = value;
    current = null;
    substring = null;
  });

  // non parsed code
  context.__defineGetter__('substring', function (){
    return substring === null ? (substring = this.raw.substring(this.index)) : substring;
  });

  // callbacks
  context.callbacks = {};

  // format event callbacks
  EVENTTYPES.forEach(function (value){
    context.callbacks[value] = util.noop;
  });

  // merge callbacks
  util.merge(context.callbacks, callbacks || {});

  // rules
  context.rules = {
    name: /[a-zA-Z_][\w:.-]*/,
    attribute: /[a-zA-Z_][\w:.-]*/,
    dataElements: {
      cdata: {
        start: '<![CDATA[',
        end: ']]>'
      },
      comment: {
        start: '<!--',
        end: '-->'
      },
      docType: {
        start: /^<!DOCTYPE /i,
        end: '>'
      }
    }
  };

  // merge rules
  util.merge(context.rules, rules || {});

  var rule;
  var dataElements = context.rules.dataElements;

  for (var data in dataElements) {
    if (dataElements.hasOwnProperty(data)) {
      rule = dataElements[data];

      formatRule(rule, 'start');
      formatRule(rule, 'end');
    }
  }

  // return read
  return context;
};
