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

// lib
var util = require('./util');
var Context = require('./context');

// self closed elements
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

/**
 * read attribute
 * @param context
 */
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

/**
 * read attributes
 * @param context
 * @param isXML
 */
function readAttributes(context, isXML){
  function isClosingToken(){
    if (isXML) {
      return context.current === '?' && context.peek() === '>';
    }

    return context.current === '>' || (context.current === '/' && context.peekIgnoreWhitespace() === '>');
  }

  var next = context.current;

  while (!context.EOF && !isClosingToken()) {
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

/**
 * read closer for opened element
 * @param context
 * @param name
 */
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

/**
 * parse open element
 * @param context
 */
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

/**
 * parse end element
 * @param context
 */
function parseEndElement(context){
  var name = context.readRules(context.rules.name);

  context.callbacks.closeElement(name);
  context.readRules(/.*?(?:>|$)/);
}

/**
 * parse data element
 * @param context
 * @returns {boolean}
 */
function parseDataElement(context){
  var dataElement;
  var start, match;
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
        valid = start.length && context.substring.indexOf(start) === 0;
        break;
      case 'regexp':
        start.lastIndex = 0;
        match = start.exec(context.substring);

        if (match) {
          start = match[match.length - 1];
          valid = match.index === 0 && start.length;
        }
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

    context.read(start.length >>> 0);

    switch (util.type(end)) {
      case 'string':
        index = context.substring.indexOf(end);
        break;
      case 'regexp':
        end.lastIndex = 0;

        match = end.exec(context.substring);

        if (match) {
          index = match.index;
          end = match[match.length - 1];
        }
        break;
      default:
        end = null;
        break;
    }

    param = index > -1 ? context.substring.slice(0, index) : context.substring;

    switch (util.type(data)) {
      case 'function':
        data = data(context.substring);
        data = util.string(data) ? data : param;
        break;
      default:
        data = param;
        break;
    }

    context.read(param.length + end.length >>> 0);

    callback = context.callbacks[callback];

    if (util.fn(callback)) {
      callback(data, param, [start, end]);
    }
  }

  return valid;
}

/**
 * parse xml type
 * @param context
 */
function parseXMLType(context){
  // read "?xml"
  context.read(4);
  context.callbacks.xmlType();
  readAttributes(context, true);
  readCloserForOpenedElement(context, '?xml');
}

/**
 * append text
 * @param value
 * @param context
 */
function appendText(value, context){
  context.text += value;
}

/**
 * callback text
 * @param context
 */
function callbackText(context){
  if (context.text) {
    context.callbacks.text(context.text);

    context.text = '';
  }
}

/**
 * parse next
 * @param context
 */
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
 *    close it (">", "/>", "?>") and a boolean telling if it is unary or not (i.e., if it doesn't
 *    requires another tag closing it later)
 * @param {Function} [callbacks.closeElement] Takes the name of the element
 * @param {Function} [callbacks.comment] Takes the content of the comment
 * @param {Function} [callbacks.docType] Takes the content of the document type declaration
 * @param {Function} [callbacks.cdata] Takes the content of the CDATA
 * @param {Function} [callbacks.xmlType] Takes no arguments
 * @param {Function} [callbacks.text] Takes the value of the text node
 * @param {Object} [rules]
 * @param {RegExp} [rules.name] Regex for element name. Default is [a-zA-Z_][\w:\-\.]*
 * @param {RegExp} [rules.attribute] Regex for attribute name. Default is [a-zA-Z_][\w:\-\.]*
 * @param {Object} [rules.dataElements] Config of data elements like docType, comment and your own custom
 *    data elements
 */
exports.parse = function (html, callbacks, rules){
  html = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  var context = Context.create(html, callbacks, rules);

  do {
    parseNext(context);
  } while (!context.EOF);

  callbackText(context);
};
