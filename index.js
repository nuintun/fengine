/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
// var HTMLParser = require('./lib/htmlparser');

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  // HTMLParser(fs.readFileSync('./test/index.html').toString(), {
  //   html5: true,
  //   partialMarkup: true,
  //   customAttrAssign: [],
  //   customAttrSurround: [],
  //   doctype: function (doctype){
  //     console.log(doctype)
  //   },
  //   comment: function (comment){
  //     console.log(comment);
  //   },
  //   start: function (name, attrs, unary, slash){
  //     console.log(name, JSON.stringify(attrs, null, 2), unary, slash);
  //   },
  //   end: function (name){
  //     console.log(name);
  //   },
  //   chars: function (chars){
  //     console.log(chars);
  //   }
  // });

  // var htmlParser = require('html-parser');
  //
  // var html = fs.readFileSync('./test/index.html').toString();
  //
  // htmlParser.parse(html, {
  //   openElement: function (name){ console.log('open: %s', name); },
  //   closeOpenedElement: function (name, token, unary){ console.log('name: %s, token: %s, unary: %s', name, token, unary); },
  //   closeElement: function (name){ console.log('close: %s', name); },
  //   comment: function (value){ console.log('comment: %s', value); },
  //   cdata: function (value){ console.log('cdata: %s', value); },
  //   attribute: function (name, value){ console.log('attribute: %s=%s', name, value); },
  //   docType: function (value){ console.log('doctype: %s', value); },
  //   text: function (value){ console.log('text: %s', JSON.stringify(value)); },
  //   vars: function (value){ console.log('vars: %s', JSON.stringify(value)); }
  // }, {
  //   dataElements: {
  //     vars: {
  //       start: '{{',
  //       data: function (){
  //         return 'aaa-bbb';
  //       },
  //       end: '}}'
  //     }
  //   }
  // });

  var htmlParser = require('./lib/htmlparser/parser');

  var html = fs.readFileSync('./test/index.html').toString();

  htmlParser.parse(html, {
    xmlType: function (value){console.log('xmltype: %s', value); },
    openElement: function (name){ console.log('open: %s', name); },
    closeOpenedElement: function (name, token, unary){ console.log('name: %s, token: %s, unary: %s', name, token, unary); },
    closeElement: function (name){ console.log('close: %s', name); },
    comment: function (value){ console.log('comment: %s', value); },
    cdata: function (value){ console.log('cdata: %s', value); },
    attribute: function (name, value){ console.log('attribute: %s=%s', name, value); },
    docType: function (value){ console.log('doctype: %s', value); },
    text: function (value){ console.log('text: %s', JSON.stringify(value)); },
    vars: function (value){ console.log('vars: %s', JSON.stringify(value)); }
  }, {
    dataElements: {
      vars: {
        start: '{{',
        data: function (){
          // return 'aaa-bbb';
        },
        end: '}}'
      }
    }
  });

  // function type(value){
  //   // nan
  //   if (value !== value) {
  //     return 'nan';
  //   }
  //
  //   if (value === Infinity || value === -Infinity) {
  //     return 'infinity';
  //   }
  //
  //   // get real type
  //   var type = toString.call(value).toLowerCase();
  //
  //   // return type
  //   return type.replace(/\[object (.+)\]/, '$1').toLowerCase();
  // }
  //
  // console.log(type(-Infinity))
};
