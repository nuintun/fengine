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
  var dest = fs.createWriteStream('./test/transform.html');

  console.time('parse');

  var parse = new Transform('./test/index.html', source, { layout: './layout.html' });

  parse.on('data', function (data){
    LOGS && process.stdout.write(data);

    dest.write(data);
  });

  parse.on('end', function (){
    dest.end();
    console.timeEnd('parse');
  });
};
