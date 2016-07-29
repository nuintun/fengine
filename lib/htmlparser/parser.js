/*!
 * parser
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

var fs = require('fs');
var util = require('./util');
var Context = require('./context');

var EMPTYELEMENTS = {
  'area': true,
  'base': true,
  'basefont': true,
  'br': true,
  'col': true,
  'frame': true,
  'hr': true,
  'img': true,
  'input': true,
  'isindex': true,
  'link': true,
  'meta': true,
  'param': true,
  'embed': true
};

function readAttribute(context){
  var value = null;
  var name = context.readRules(context.rules.attribute);

  if (context.current === '=' || context.peekIgnoreWhitespace() === '=') {
    context.readRules(/\s*=\s*/);

    var quote = /['"]/.test(context.current) ? context.current : '';
    var attributeValueRegex = !quote
      ? /(.*?)(?=[\s>])/
      : new RegExp(quote + '(.*?)' + quote);
    var match = attributeValueRegex.exec(context.substring) || [0, ''];

    value = match[1];
    context.read(match[0].length);
  }

  context.callbacks.attribute(name, value);
}

function readAttributes(context, isXML){
  function isClosingToken(){
    if (isXML) {
      return context.current === '?' && context.peek() === '>';
    }

    return context.current === '>' || (context.current === '/' && context.peekIgnoreWhitespace() === '>');
  }

  var next = context.current;

  while (!context.isEof() && !isClosingToken()) {
    if (context.rules.attribute.test(next)) {
      readAttribute(context);

      next = context.current;
    } else {
      if (parseDataElement(context)) {
        next = context.current;
      } else {
        next = context.read();
      }
    }
  }
}

function readCloserForOpenedElement(context, name){
  var isUnary = EMPTYELEMENTS.hasOwnProperty(name);

  if (context.current === '/') {
    // self closing tag "/>"
    context.readUntilNonWhitespace();
    context.read();
    context.callbacks.closeOpenedElement(name, '/>', isUnary);
  } else if (context.current === '?') {
    // xml closing "?>"
    context.read(2);
    context.callbacks.closeOpenedElement(name, '?>', isUnary);
  } else {
    // normal closing ">"
    context.read();
    context.callbacks.closeOpenedElement(name, '>', isUnary);
  }
}

function parseOpenElement(context){
  var name = context.readRules(context.rules.name);

  context.callbacks.openElement(name);
  readAttributes(context, false);
  readCloserForOpenedElement(context, name);

  if (!/^(script|xmp)$/i.test(name)) {
    return;
  }

  // just read until the closing tags for elements that allow cdata
  var regex = new RegExp('^([\\s\\S]*?)(?:$|</(' + name + ')\\s*>)', 'i');
  var match = regex.exec(context.substring);

  context.read(match[0].length);

  if (match[1]) {
    context.callbacks.cdata(match[1]);
  }

  if (match[2]) {
    context.callbacks.closeElement(match[2]);
  }
}

function parseEndElement(context){
  var name = context.readRules(context.rules.name);

  context.callbacks.closeElement(name);
  context.readRules(/.*?(?:>|$)/);
}

function parseDataElement(context){
  var start;
  var dataElement;
  var valid = false;
  var dataElements = context.rules.dataElements;

  for (var callback in dataElements) {
    if (!dataElements.hasOwnProperty(callback)) {
      continue;
    }

    dataElement = dataElements[callback];
    start = dataElement.start;

    switch (util.type(start)) {
      case 'string':
        valid = start && context.substring.indexOf(start) === 0;
        start = start.length;
        break;
      case 'regexp':
        start.lastIndex = 0;

        start = start.exec(context.substring);
        valid = start && start.index === 0
          && (start = start.index + start[start.length - 1].length);
        break;
      default:
        return valid;
    }

    if (valid) {
      break;
    }
  }

  if (valid) {
    callbackText(context);

    var param;
    var index = -1;
    var data = dataElement.data;
    var end = dataElement.end;

    context.read(start);

    switch (util.type(end)) {
      case 'string':
        index = context.substring.indexOf(end);
        end = end.length;
        break;
      case 'regexp':
        end.lastIndex = 0;

        var match = end.exec(context.substring);

        if (match) {
          index = match.index;
          end = match[match.length - 1].length;
        }
        break;
      default:
        end = 0;
        index = -1;
        break;
    }

    param = index > -1 ? context.substring.slice(0, index) : context.substring;

    switch (util.type(data)) {
      case 'object':
        data = data[param];
        data = util.fn(data) ? data(param) : data;
        data = util.string(data) ? data : param;
        break;
      case 'function':
        data = data(context.substring);
        data = util.string(data) ? data : param;
        break;
      default:
        data = param;
        break;
    }

    context.read(param.length + end);

    callback = context.callbacks[callback];

    if (util.fn(callback)) {
      callback(data);
    }
  }

  return valid;
}

function parseXMLType(context){
  // read "?xml"
  context.read(4);
  context.callbacks.xmlType();
  readAttributes(context, true);
  readCloserForOpenedElement(context, '?xml');
}

function appendText(value, context){
  context.text += value;
}

function callbackText(context){
  if (context.text) {
    context.callbacks.text(context.text);

    context.text = '';
  }
}

function parseNext(context){
  if (context.current === '<') {
    var next = context.substring.charAt(1);

    if (next === '/' && context.rules.name.test(context.substring.charAt(2))) {
      context.read(2);
      callbackText(context);
      parseEndElement(context);

      return;
    } else if (next === '?' && /^<\?xml/.test(context.substring)) {
      context.read(1);
      callbackText(context);
      parseXMLType(context);

      return;
    } else if (context.rules.name.test(next)) {
      context.read(1);
      callbackText(context);
      parseOpenElement(context);

      return;
    }
  }

  if (!parseDataElement(context)) {
    appendText(context.current, context);
    context.read();
  }
}

/**
 * Parses the given string o' HTML, executing each callback when it
 * encounters a token.
 *
 * @param {String} html A string o' HTML
 * @param {Object} [callbacks] Callbacks for each token
 * @param {Function} [callbacks.attribute] Takes the name of the attribute and its value
 * @param {Function} [callbacks.openElement] Takes the tag name of the element
 * @param {Function} [callbacks.closeOpenedElement] Takes the tag name of the element, the token used to
 * close it (">", "/>", "?>") and a boolean telling if it is unary or not (i.e., if it doesn't requires
 * another tag closing it later)
 * @param {Function} [callbacks.closeElement] Takes the name of the element
 * @param {Function} [callbacks.comment] Takes the content of the comment
 * @param {Function} [callbacks.docType] Takes the content of the document type declaration
 * @param {Function} [callbacks.cdata] Takes the content of the CDATA
 * @param {Function} [callbacks.xmlType] Takes no arguments
 * @param {Function} [callbacks.text] Takes the value of the text node
 * @param {Object} [regex]
 * @param {RegExp} [regex.name] Regex for element name. Default is [a-zA-Z_][\w:\-\.]*
 * @param {RegExp} [regex.attribute] Regex for attribute name. Default is [a-zA-Z_][\w:\-\.]*
 * @param {Object.<string,DataElementConfig>} [regex.dataElements] Config of data elements like docType, comment and your own custom data elements
 */
exports.parse = function (html, callbacks, regex){
  html = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  var context = Context.create(html, callbacks, regex);

  do {
    parseNext(context);
  } while (!context.isEof());

  callbackText(context);
};

/**
 * @typedef {Object} DataElementConfig
 * @property {String|RegExp|Function} start - start of data element, for example '<%' or /^<\?=/ or function(string){return string.slice(0, 2) === '<%' ? 2 : -1;}
 * @property {RegExp|Function} data - content of data element, for example /^[^\s]+/ or function(string){return string.match(/^[^\s]+/)[0];}
 * @property {String|RegExp|Function} end - end of data element, for example '%>' or /^\?>/ or function(string){return 2;}
 */

/**
 * Parses the HTML contained in the given file asynchronously.
 *
 * Note that this is merely a convenience function, it will still read the entire
 * contents of the file into memory.
 *
 * @param {String} filename of the file to parse
 * @param {String} [encoding] Optional encoding to read the file in, defaults to utf8
 * @param {Object} [callbacks] Callbacks to pass to parse()
 * @param {Function} [callback]
 */
exports.parseFile = function (filename, encoding, callbacks, callback){
  fs.readFile(filename, encoding || 'utf8', function (error, contents){
    if (error) {
      return callback && callback(error);
    }

    exports.parse(contents, callbacks);
    util.fn(callback) && callback();
  });
};
