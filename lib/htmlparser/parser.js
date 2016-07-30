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
  callbackText(context);

  var value, quote;
  var name = context.readRule(context.rules.attribute);

  if (context.current === '=' || context.peekIgnoreWhitespace() === '=') {
    context.readRule(/\s*=\s*/);

    quote = /['"]/.test(context.current) ? context.current : '';

    var attributeValueRegex = !quote
      ? /(.*?)(?=[\s>])/
      : new RegExp(quote + '(.*?)' + quote);
    var match = attributeValueRegex.exec(context.substring) || [0, ''];

    value = match[1];

    context.read(match[0].length);
  }

  context.callbacks.attribute(name, value, quote);
}

/**
 * is closing token
 * @param context
 * @param isXML
 * @returns {boolean}
 */
function isClosingToken(context, isXML){
  return isXML
    ? context.current === '?' && context.peek() === '>'
    : context.current === '>' || (context.current === '/' && context.peekIgnoreWhitespace() === '>');
}

/**
 * read attributes
 * @param context
 * @param isXML
 */
function readAttributes(context, isXML){
  var next = context.current;

  while (!context.EOF && !isClosingToken(context, isXML)) {
    if (context.rules.attribute.test(next)) {
      readAttribute(context);
    } else {
      if (!parseDataElement(context)) {
        appendText(context.current, context);
        context.read();
      }
    }

    next = context.current;
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
  context.read(1);
  callbackText(context);

  var name = context.readRule(context.rules.name);

  context.callbacks.openElement(name);
  readAttributes(context, false);
  readCloserForOpenedElement(context, name);

  if (/^(script|style)$/i.test(name)) {
    var start;
    var substring = context.substring;
    var dataElements = context.rules.dataElements;
    var rule = new RegExp('(</\\s*' + util.str4regex(name) + '\\s*>)?', 'im');
    var match = rule.exec(substring);
    var index = match ? context.index + match.index : context.raw.length;

    while (context.index < index) {
      match = null;

      if (!parseDataElement(context)) {
        for (var data in dataElements) {
          if (dataElements.hasOwnProperty(data)) {
            rule = dataElements[data];
            match = rule.start.exec(substring);

            if (match) {
              start = substring.substring(0, match.index);

              appendText(start, context);
              context.read(start.length);

              substring = context.substring;
              break;
            }
          }
        }

        if (!match) {
          start = substring.substring(0, index - context.index);

          appendText(context.current + start, context);
          context.read(start.length);
          break;
        }
      }
    }
  }
}

/**
 * parse end element
 * @param context
 */
function parseEndElement(context){
  context.read(2);
  callbackText(context);

  var name = context.readRule(context.rules.name);

  context.callbacks.closeElement(name);
  context.readRule(/.*?(?:>|$)/);
}

/**
 * read data element
 * @param context
 * @returns {*}
 */
function readDataElement(context){
  var index = -1;
  var dataElement;
  var start, match;
  var hitDataElement;
  var dataElements = context.rules.dataElements;

  for (var callback in dataElements) {
    if (!dataElements.hasOwnProperty(callback)) {
      continue;
    }

    dataElement = dataElements[callback];
    start = dataElement.start;
    match = start.exec(context.substring);

    if (match) {
      if (!hitDataElement || index > match.index) {
        index = match.index;
        hitDataElement = {
          match: match,
          start: dataElement.start,
          end: dataElement.end,
          data: dataElement.data,
          callback: context.callbacks[callback]
        };
      }
    }
  }

  return hitDataElement;
}

/**
 * parse data element
 * @param context
 * @returns {boolean}
 */
function parseDataElement(context){
  var match;
  var dataElement = readDataElement(context);

  if (dataElement) {
    callbackText(context);

    var param;
    var index = -1;
    var start = dataElement.match[0];
    var data = dataElement.data;
    var end = dataElement.end;

    context.read(start.length);

    match = end.exec(context.substring);

    if (match) {
      index = match.index;
      end = match[0];
    } else {
      end = null;
    }

    param = index > -1 ? context.substring.slice(0, index) : context.substring;

    console.log(index);
    console.log(start, context.substring, end);
    console.log('---------------------------');

    switch (util.type(data)) {
      case 'function':
        data = data(param);
        data = util.string(data) ? data : param;
        break;
      default:
        data = param;
        break;
    }

    context.read(param.length + (end ? end.length : 0));

    if (util.fn(dataElement.callback)) {
      dataElement.callback(data, param, [start, end]);
    }

    return true;
  }

  return false;
}

/**
 * parse xml type
 * @param context
 */
function parseXMLType(context){
  context.read(1);
  callbackText(context);

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
    var name = context.rules.name;
    var next = context.substring.charAt(1);

    if (next === '/' && name.test(context.substring.charAt(2))) {
      return parseEndElement(context);
    } else if (next === '?' && /^<\?xml/.test(context.substring)) {
      return parseXMLType(context);
    } else if (name.test(next)) {
      return parseOpenElement(context);
    }
  }

  if (!parseDataElement(context)) {
    appendText(context.current, context);
    context.read();
  }
}

/**
 * parses the given string o' HTML, executing each callback when it
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
module.exports.parse = function (html, callbacks, rules){
  var context = Context.create(html, callbacks, rules);

  do {
    parseNext(context);
  } while (!context.EOF);

  callbackText(context);
};
