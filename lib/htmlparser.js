/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 */

'use strict';

var createMapFromString = require('./utils').createMapFromString;

/**
 * make map
 * @param values
 */
function makeMap(values){
  return createMapFromString(values, true);
}

// regular expressions for parsing tags and attributes
var singleAttrIdentifier = /([^\s"'<>\/=]+)/;
var singleAttrAssign = /=/;
var singleAttrAssigns = [singleAttrAssign];
var singleAttrValues = [
  // attr value double quotes
  /"([^"]*)"+/.source,
  // attr value, single quotes
  /'([^']*)'+/.source,
  // attr value, no quotes
  /([^\s"'=<>`]+)/.source
];
// https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
var qnameCapture = (function (){
  var ncname = require('ncname').source.slice(1, -1);

  return '((?:' + ncname + '\\:)?' + ncname + ')';
})();
var startTagOpen = new RegExp('^<' + qnameCapture);
var startTagClose = /^\s*(\/?)>/;
var endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>');
var doctype = /^<!DOCTYPE [^>]+>/i;
var IS_REGEX_CAPTURING_BROKEN = false;

'x'.replace(/x(.)?/g, function (m, g){
  IS_REGEX_CAPTURING_BROKEN = g === '';
});

// empty elements
var empty = makeMap('area,base,basefont,br,col,embed,frame,hr,'
  + 'img,input,isindex,keygen,link,meta,param,source,track,wbr');

// inline elements
var inline = makeMap('a,abbr,acronym,applet,b,basefont,bdo,big,br,'
  + 'button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,'
  + 'map,noscript,object,q,s,samp,script,select,small,span,strike,'
  + 'strong,sub,sup,svg,textarea,tt,u,var');

// elements that you can, intentionally, leave open
// (and which close themselves)
var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source');

// attributes that have their values filled in disabled='disabled'
var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,'
  + 'multiple,nohref,noresize,noshade,nowrap,readonly,selected');

// special elements (can contain anything)
var special = makeMap('script,style');

// html5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// phrasing content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
var nonPhrasing = makeMap('address,article,aside,base,blockquote,body,caption,col,'
  + 'colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,'
  + 'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,'
  + 'option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track');

var reCache = {};

function attrForHandler(options){
  var pattern = singleAttrIdentifier.source
    + '(?:\\s*(' + joinSingleAttrAssigns(options) + ')'
    + '\\s*(?:' + singleAttrValues.join('|') + '))?';

  if (options.customAttrSurround) {
    var attrClauses = [];

    for (var i = options.customAttrSurround.length - 1; i >= 0; i--) {
      attrClauses[i] = '(?:'
        + '(' + options.customAttrSurround[i][0].source + ')\\s*'
        + pattern
        + '\\s*(' + options.customAttrSurround[i][1].source + ')'
        + ')';
    }

    attrClauses.push('(?:' + pattern + ')');

    pattern = '(?:' + attrClauses.join('|') + ')';
  }

  return new RegExp('^\\s*' + pattern);
}

function joinSingleAttrAssigns(options){
  return singleAttrAssigns
    .concat(options.customAttrAssign || [])
    .map(function (assign){
      return '(?:' + assign.source + ')';
    })
    .join('|');
}

function HTMLParser(html, options){
  var stack = [];
  var lastTag = null;
  var last, prevTag, nextTag;
  var attribute = attrForHandler(options);

  while (html) {
    last = html;

    // make sure we're not in a script or style element
    if (!lastTag || !special(lastTag)) {
      var textEnd = html.indexOf('<');

      if (textEnd === 0) {
        // comment:
        if (/^<!--/.test(html)) {
          var commentEnd = html.indexOf('-->');

          if (commentEnd >= 0) {
            if (options.comment) {
              options.comment(html.substring(4, commentEnd));
            }

            html = html.substring(commentEnd + 3);
            prevTag = '';
            continue;
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (/^<!\[/.test(html)) {
          var conditionalEnd = html.indexOf(']>');

          if (conditionalEnd >= 0) {
            if (options.comment) {
              options.comment(html.substring(2, conditionalEnd + 1), true /* non-standard */);
            }

            html = html.substring(conditionalEnd + 2);
            prevTag = '';
            continue;
          }
        }

        // doctype:
        var doctypeMatch = html.match(doctype);

        if (doctypeMatch) {
          if (options.doctype) {
            options.doctype(doctypeMatch[0]);
          }

          html = html.substring(doctypeMatch[0].length);
          prevTag = '';
          continue;
        }

        // End tag:
        var endTagMatch = html.match(endTag);

        if (endTagMatch) {
          html = html.substring(endTagMatch[0].length);

          endTagMatch[0].replace(endTag, parseEndTag);

          prevTag = '/' + endTagMatch[1].toLowerCase();
          continue;
        }

        // Start tag:
        var startTagMatch = parseStartTag(html);

        if (startTagMatch) {
          html = startTagMatch.rest;

          handleStartTag(startTagMatch);

          prevTag = startTagMatch.tagName.toLowerCase();
          continue;
        }
      }

      var text;

      if (textEnd >= 0) {
        text = html.substring(0, textEnd);
        html = html.substring(textEnd);
      } else {
        text = html;
        html = '';
      }

      // next tag
      var nextTagMatch = parseStartTag(html);

      if (nextTagMatch) {
        nextTag = nextTagMatch.tagName;
      } else {
        nextTagMatch = html.match(endTag);

        if (nextTagMatch) {
          nextTag = '/' + nextTagMatch[1];
        } else {
          nextTag = '';
        }
      }

      if (options.chars) {
        options.chars(text, prevTag, nextTag);
      }

      prevTag = '';
    } else {
      var stackedTag = lastTag.toLowerCase();
      var reStackedTag = reCache[stackedTag]
        || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)</' + stackedTag + '[^>]*>', 'i'));
      var isNormalTag = stackedTag !== 'script' && stackedTag !== 'style' && stackedTag !== 'noscript';

      html = html.replace(reStackedTag, function (all, text){
        if (isNormalTag) {
          text = text
            .replace(/<!--([\s\S]*?)-->/g, '$1')
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        }

        if (options.chars) {
          options.chars(text);
        }

        return '';
      });

      parseEndTag('</' + stackedTag + '>', stackedTag);
    }

    if (html === last) {
      throw new Error('Parse Error: ' + html);
    }
  }

  if (!options.partialMarkup) {
    // clean up any remaining tags
    parseEndTag();
  }

  /**
   * parse start tag
   * @param input
   * @returns {{tagName: *, attrs: Array}}
   */
  function parseStartTag(input){
    var start = input.match(startTagOpen);

    if (start) {
      var end, attr;
      var match = {
        tagName: start[1],
        attrs: []
      };

      input = input.slice(start[0].length);

      while (!(end = input.match(startTagClose)) && (attr = input.match(attribute))) {
        input = input.slice(attr[0].length);
        match.attrs.push(attr);
      }

      if (end) {
        match.unarySlash = end[1];
        match.rest = input.slice(end[0].length);

        return match;
      }
    }
  }

  /**
   * handle start tag
   * @param match
   */
  function handleStartTag(match){
    var tagName = match.tagName;
    var unarySlash = match.unarySlash;

    if (options.html5 && lastTag === 'p' && nonPhrasing(tagName)) {
      parseEndTag('', lastTag);
    }

    if (!options.html5) {
      while (lastTag && inline(lastTag)) {
        parseEndTag('', lastTag);
      }
    }

    if (closeSelf(tagName) && lastTag === tagName) {
      parseEndTag('', tagName);
    }

    var unary = empty(tagName) || tagName === 'html' && lastTag === 'head' || !!unarySlash;

    var attrs = match.attrs.map(function (args){
      var ncp = 7; // number of captured parts, scalar
      var value = null;
      var assign = null;
      var name, open, close, quote;

      // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        if (args[3] === '') { delete args[3]; }
        if (args[4] === '') { delete args[4]; }
        if (args[5] === '') { delete args[5]; }
      }

      /**
       * populate
       * @param index
       * @returns {*}
       */
      function populate(index){
        value = args[index + 1];
        assign = args[index];

        if (typeof value !== 'undefined') {
          return '"';
        }

        value = args[index + 2];

        if (typeof value !== 'undefined') {
          return '\'';
        }

        value = args[index + 3];

        if (typeof value === 'undefined' && fillAttrs(name)) {
          value = name;
        }

        return '';
      }

      var j = 1;

      if (options.customAttrSurround) {
        for (var i = 0, l = options.customAttrSurround.length; i < l; i++, j += ncp) {
          name = args[j + 1];

          if (name) {
            quote = populate(j + 2);
            open = args[j];
            close = args[j + 6];
            break;
          }
        }
      }

      if (!name && (name = args[j])) {
        quote = populate(j + 1);
      }

      return {
        name: name,
        value: value,
        open: open || null,
        close: close || null,
        quote: quote || null,
        assign: assign || '='
      };
    });

    if (!unary) {
      stack.push({ tag: tagName, attrs: attrs });

      unarySlash = '';
      lastTag = tagName;
    }

    if (options.start) {
      options.start(tagName, attrs, unary, unarySlash);
    }
  }

  /**
   * parse end tag
   * @param tag
   * @param tagName
   */
  function parseEndTag(tag, tagName){
    var pos;

    // find the closest opened tag of the same type
    if (tagName) {
      var needle = tagName.toLowerCase();

      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].tag.toLowerCase() === needle) {
          break;
        }
      }
    } else {
      // if no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // close all the open elements, up the stack
      for (var i = stack.length - 1; i >= pos; i--) {
        if (options.end) {
          options.end(stack[i].tag, stack[i].attrs, i > pos || !tag);
        }
      }

      // remove the open elements from the stack
      stack.length = pos;
      lastTag = pos && stack[pos - 1].tag;
    } else if (tagName.toLowerCase() === 'br') {
      if (options.start) {
        options.start(tagName, [], true, '');
      }
    } else if (tagName.toLowerCase() === 'p') {
      if (options.start) {
        options.start(tagName, [], false, '', true);
      }

      if (options.end) {
        options.end(tagName, []);
      }
    }
  }
}

module.exports = HTMLParser;
