/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var HTMLParser = require('htmlparser2');

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  var html = '';

  var parser = new HTMLParser.Parser({
    onprocessinginstruction: function (name, data){
      // console.log(name, data);
      html += '<' + data + '>';
    },
    oncomment: function (comment){
      // console.log(comment);
      html += '<!--' + comment + '-->';
    },
    onattribute: function (attribute, value){
      // console.log(attribute, value);
      html += ' ' + attribute + '="' + value + '"';
    },
    onopentagname: function (name){
      // console.log(name);
      html += '<' + name;
    },
    onopentag: function (){
      html += '>';
    },
    ontext: function (text){
      // console.log(text);
      html += text;
    },
    onclosetag: function (name){
      // console.log(name);
      html += '</' + name + '>';
    },
    onend: function (){
      console.log(html);
    }
  }, {
    decodeEntities: true
  });

  fs
    .createReadStream('./test/index.html')
    .pipe(parser);
};
