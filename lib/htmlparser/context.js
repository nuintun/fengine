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
 * create read
 * @param raw
 * @param callbacks
 * @param rules
 * @returns {{
 *   text: string,
 *   peek: context.peek,
 *   read: context.read,
 *   readUntilNonWhitespace: context.readUntilNonWhitespace,
 *   readRules: context.readRules,
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
    read: function (count){
      if (count === 0) {
        return '';
      }

      count = count || 1;

      var next = this.peek(count);

      this.index += count;

      if (this.index > this.length) {
        this.index = this.length;
      }

      return next;
    },
    readUntilNonWhitespace: function (){
      var value = '', next;

      while (!this.EOF) {
        next = this.read();
        value += next;

        if (!/\s$/.test(value)) {
          break;
        }
      }

      return value;
    },
    readRules: function (rules){
      var value = (rules.exec(this.raw.substring(this.index)) || [''])[0];

      this.index += value.length;

      return value;
    },
    peekIgnoreWhitespace: function (count){
      count = count || 1;

      var value = '', next = '', offset = 0;

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

  // return read
  return context;
};