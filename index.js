/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var htmlParser = require('./lib/htmlparser/parser');

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  var html = '';
  var source = fs
    .readFileSync('./test/index.html')
    .toString();

  var LOGS = true;

  console.time('parse');

  htmlParser.parse(source, {
    xmlType: function (value, origin, attr){
      LOGS && console.log('xmltype: %s', JSON.stringify(value));

      html += attr[0] + value + attr[1];
    },
    openElement: function (name){
      LOGS && console.log('open: %s', name);

      html += '<' + name;
    },
    closeOpenedElement: function (name, token, unary){
      LOGS && console.log('name: %s, token: %s, unary: %s', name, token, unary);

      html += token;
    },
    closeElement: function (name){
      LOGS && console.log('close: %s', name);

      html += '</' + name + '>';
    },
    comment: function (value, origin, attr){
      LOGS && console.log('comment: %s', JSON.stringify(value));

      html += attr[0] + value + attr[1];
    },
    cdata: function (value, origin, attr){
      LOGS && console.log('cdata: %s', JSON.stringify(value));

      html += attr[0] + value + attr[1];
    },
    attribute: function (name, value){
      LOGS && console.log('attribute: %s=%s', name, JSON.stringify(value));

      html += name + (value ? '=' + JSON.stringify(value) : '');
    },
    docType: function (value, origin, attr){
      LOGS && console.log('doctype: %s', JSON.stringify(value));

      html += attr[0] + value + attr[1];
    },
    text: function (value){
      LOGS && console.log('text: %s', JSON.stringify(value));

      html += value;
    },
    vars: function (value, origin, attr){
      LOGS && console.log(
        'vars: %s, origin: %s, vars: %s',
        JSON.stringify(value),
        JSON.stringify(origin),
        JSON.stringify(attr)
      );

      html += attr[0] + value + attr[1];
    }
  }, {
    dataElements: {
      vars: {
        start: /[{]{2}\s/,
        data: function (){
          return 'aaa-bbb';
        },
        end: /\s*[}]{2}/
      }
    }
  });

  console.timeEnd('parse');

  console.log();
  console.log(html);
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
