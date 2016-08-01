/**
 * Created by nuintun on 2016/7/26.
 */

var fs = require('fs');
var path = require('path');
var Transform = require('./lib/transform');

module.exports.run = function (port){
  console.log('Server run at port %d.', port);

  var html = '';
  var source = fs
    .readFileSync('./test/index.html')
    .toString();

  var LOGS = false;

  console.time('parse');

  var parse = new Transform(source, { src: './test/index.html', layout: './layout.html' });

  parse.on('data', function (data){
    process.stdout.write(data);
  });

  parse.on('end', function (){
    console.log('end');
    console.timeEnd('parse');
  });
};
