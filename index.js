/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var HTMLParser = require('./lib/htmlparser').HTMLParser;

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  HTMLParser(fs.readFileSync('./test/index.html').toString(), {
    customAttrSurround: [[/\{\{#.+\}\}/, /\{\{\/.+\}\}/]],
    comment: function (comment){
      console.log(comment);
    },
    ignore: function (){
      console.log(arguments);
    },
    start: function (tagName, attrs, unary, unarySlash){
      console.log(tagName, JSON.stringify(attrs, null, 2), unary, unarySlash);
    },
    end: function (tagName){
      console.log(tagName, '-------------------');
    },
    chars: function (chars){
      console.log(chars);
    }
  });
};
