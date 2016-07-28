/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var HTMLParser = require('htmlparser2');

// self closing elements
var SINGLETAG = {
  area: true,
  base: true,
  basefont: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  isindex: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
  // self closing svg elements
  path: true,
  circle: true,
  ellipse: true,
  line: true,
  rect: true,
  use: true,
  stop: true,
  polyline: true,
  polygon: true
};

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  var html = '';

  var parser = new HTMLParser.Parser({
    onprocessinginstruction: function (name, data){
      console.log(name, JSON.stringify(data), '--- data');
      html += '<' + data + '>';
    },
    oncomment: function (comment){
      console.log(comment, '--- comment');
      html += '<!--' + comment + '-->';
    },
    onattribute: function (attribute, value){
      console.log(attribute, JSON.stringify(value), '--- attr');
      html += ' ' + attribute + (value ? '="' + value + '"' : '');
    },
    onopentagname: function (name){
      console.log(name, '--- open');
      html += '<' + name;
    },
    onopentag: function (name){
      html += SINGLETAG[name] ? '/>' : '>';
    },
    ontext: function (text){
      console.log(JSON.stringify(text), '--- text');
      html += text;
    },
    onclosetag: function (name){
      console.log(name, '--- close');
      if (!SINGLETAG[name]) {
        html += '</' + name + '>';
      }
    },
    onend: function (){
      console.log();
      console.log(html);
    }
  }, {
    decodeEntities: true
  });

  fs
    .createReadStream('./test/index.html')
    .pipe(parser);
};
