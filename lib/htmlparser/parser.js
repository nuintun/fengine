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
  var name = context.readRegex(context.regex.attribute);

  if (context.current === '=' || context.peekIgnoreWhitespace() === '=') {
    context.readRegex(/\s*=\s*/);

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
    if (context.regex.attribute.test(next)) {
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
  var name = context.readRegex(context.regex.name);

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
  var name = context.readRegex(context.regex.name);

  context.callbacks.closeElement(name);
  context.readRegex(/.*?(?:>|$)/);
}

function parseDataElement(context){
  var start;
  var dataElement;
  var valid = false;
  var dataElements = context.regex.dataElements;

  for (var callback in dataElements) {
    if (!dataElements.hasOwnProperty(callback)) {
      continue;
    }

    dataElement = dataElements[callback];
    start = dataElement.start;

    switch (util.type(start)) {
      case 'string':
        valid = context.substring.slice(0, start.length) === start;
        break;
      case 'regexp':
        valid = start.test(context.substring);
        break;
      case 'function':
        valid = start(context.substring) > -1;
        break;
    }

    if (valid) {
      break;
    }
  }

  if (valid) {
    callbackText(context);

    var param;
    var index = -1;
    // var start = dataElement.start;
    var data = dataElement.data;
    var end = dataElement.end;

    switch (util.type(start)) {
      case 'string':
        start = start.length;
        break;
      case 'regexp':
        start = start.exec(context.substring);
        start = start[start.length - 1].length;
        break;
      case 'function':
        start = start(context.substring);
        break;
    }

    context.read(start);

    switch (util.type(end)) {
      case 'string':
        index = context.substring.indexOf(end);
        end = end.length;
        break;
      case 'regexp':
        var match = context.substring.match(end);

        end = end.exec(context.substring);
        end = end[end.length - 1].length;

        if (match) {
          match = match[match.length - 1];
          index = context.substring.indexOf(match);
        }
        break;
      case 'function':
        end = end(context.substring);
    }

    param = index > -1 ? context.substring.slice(0, index) : context.substring;

    switch (util.type(data)) {
      case 'regexp':
        data = data.exec(context.substring);
        data = data[data.length - 1];
        break;
      case 'function':
        data = data(context.substring);
        break;
      case 'undefined':
        data = param;
        break;
    }

    context.read(param.length);
    context.read(end);

    context.callbacks[callback](data);
  }

  return valid;
  // var param;
  // var index = -1;
  // // var start = dataElement.start;
  // var data = dataElement.data;
  // var end = dataElement.end;
  //
  // switch (util.type(start)) {
  //   case 'string':
  //     start = start.length;
  //     break;
  //   case 'regexp':
  //     start = start.exec(context.substring);
  //     start = start[start.length - 1].length;
  //     break;
  //   case 'function':
  //     start = start(context.substring);
  //     break;
  // }
  //
  // context.read(start);
  //
  // switch (util.type(end)) {
  //   case 'string':
  //     index = context.substring.indexOf(end);
  //     end = end.length;
  //     break;
  //   case 'regexp':
  //     var match = context.substring.match(end);
  //
  //     end = end.exec(context.substring);
  //     end = end[end.length - 1].length;
  //
  //     if (match) {
  //       match = match[match.length - 1];
  //       index = context.substring.indexOf(match);
  //     }
  //     break;
  //   case 'function':
  //     end = end(context.substring);
  // }
  //
  // param = index > -1 ? context.substring.slice(0, index) : context.substring;
  //
  // switch (util.type(data)) {
  //   case 'regexp':
  //     data = data.exec(context.substring);
  //     data = data[data.length - 1];
  //     break;
  //   case 'function':
  //     data = data(context.substring);
  //     break;
  //   case 'undefined':
  //     data = param;
  //     break;
  // }
  //
  // context.read(param.length);
  // context.read(end);

  // return data;
}

function parseXMLType(context){
  //read "?xml"
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

    if (next === '/' && context.regex.name.test(context.substring.charAt(2))) {
      context.read(2);
      callbackText(context);
      parseEndElement(context);

      return;
    } else if (next === '?' && /^<\?xml/.test(context.substring)) {
      context.read(1);
      callbackText(context);
      parseXMLType(context);

      return;
    } else if (context.regex.name.test(next)) {
      context.read(1);
      callbackText(context);
      parseOpenElement(context);

      return;
    }
  }

  for (var callbackName in context.regex.dataElements) {
    if (!context.regex.dataElements.hasOwnProperty(callbackName)) {
      continue;
    }

    var dataElement = context.regex.dataElements[callbackName],
      start = dataElement.start,
      isValid = false;

    switch (typeof start) {
      case 'string':
        isValid = context.substring.slice(0, start.length) === start;
        break;
      case 'object':
        isValid = start.test(context.substring);
        break;
      case 'function':
        isValid = start(context.substring) > -1;
        break;
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
    callback && callback();
  });
};
