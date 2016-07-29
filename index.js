/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var HTMLParser = require('./lib/htmlparser');

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  HTMLParser(fs.readFileSync('./test/index.html').toString(), {
    html5: true,
    partialMarkup: true,
    customAttrAssign: [],
    customAttrSurround: [],
    doctype: function (doctype){
      console.log(doctype)
    },
    comment: function (comment){
      console.log(comment);
    },
    start: function (name, attrs, unary, slash){
      console.log(name, JSON.stringify(attrs, null, 2), unary, slash);
    },
    end: function (name){
      console.log(name);
    },
    chars: function (chars){
      console.log(chars);
    }
  });
};
