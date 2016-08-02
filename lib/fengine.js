/*!
 * fengine
 * Version: 0.0.1
 * Date: 2016/8/2
 * https://github.com/Nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/fengine/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

var os = require('os');
var fs = require('fs');
var url = require('url');
var path = require('path');
var http = require('http');
var util = require('./util');
var colors = require('colors');
var cluster = require('cluster');
var FileSend = require('file-send');
var Transform = require('./transform');

// variable declaration
var NUMCPUS = os.cpus().length;
var LOGLEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

var FAVICONSIZE = fs.lstatSync(path.join(__dirname, '../favicon.ico')).size;

function Fengine(options){
  this.options = options;

  this.run();
}

Fengine.prototype = {
  dir: function (files, dir){
    var html = '<!DOCTYPE html>'
      + '<html>'
      + '  <head>'
      + '    <meta name="renderer" content="webkit"/>'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type"/>'
      + '    <title>' + dir + '</title>'
      + '    <style>'
      + '      html, body, hr { margin: 0; padding: 0; }'
      + '      h1 { margin: 6px 0; }'
      + '      hr { font-size: 0; line-height: 0; height: 1px; }'
      + '      a { display: block; }'
      + '      .ui-dir { text-indent: 10px; }'
      + '      .ui-file { padding: 3px 30px; }'
      + '    </style>'
      + '  </head>'
      + '  <body>'
      + '    <a class="ui-dir" href="' + dir + '" title="' + dir + '"><h1>' + dir + '</h1></a><hr/>';

    files.forEach(function (file){
      var href = dir + file;

      html += '<a class="ui-file" href="' + href + '" title="' + href + '">' + file + '</a>';
    });

    html += '  </body>'
      + '</html>';

    return html;
  },
  log: function (data){
    var message = data.message;

    switch (data.type) {
      case LOGLEVELS.INFO:
        message = colors.cyan.bold(message);
        break;
      case LOGLEVELS.WARN:
        message = colors.yellow.bold(message);
        break;
      case LOGLEVELS.ERROR:
        message = colors.red.bold(message);
        break;
    }

    console.log(message);
  },
  run: function (){
    var context = this;
    var options = context.options;

    if (cluster.isMaster) {
      // worker
      var worker;

      // create thread
      for (var i = 0; i < NUMCPUS; i++) {
        // fork
        worker = cluster.fork();

        // listen event
        worker.on('message', context.log);
      }
    } else {
      // create server
      var server = http.createServer(function (requset, response){
        var parsed = url.parse(requset.url);
        var pathname = parsed.pathname;
        var extname = path.extname(pathname);

        switch (extname) {
          case '.htm':
          case '.html':
            pathname = path.join(options.root, pathname);

            if (!/^[.]+[/\\]/.test(path.relative(options.base, pathname))) {
              fs.readFile(pathname, function (error, source){
                if (error) {
                  response.statusCode = 404;
                  response.setHeader('Content-Type', 'text/html; charset=UTF-8');

                  return response.end(http.STATUS_CODES[404]);
                }

                var transform = new Transform(pathname, source.toString(), {
                  root: options.base,
                  layout: options.layout
                });

                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/html');

                transform.on('data', function (data){
                  response.write(data);
                });

                transform.on('end', function (){
                  response.end();
                });
              });
            } else {
              new FileSend(requset, {
                root: options.root
              }).pipe(response);
            }
            break;
          default:
            if (pathname === '/favicon.ico') {
              pathname = path.join(options.root, pathname);

              fs.lstat(pathname, function (error){
                response.statusCode = 200;
                response.setHeader('Content-Type', 'image/x-icon');

                if (error) {
                  response.setHeader('Content-Length', FAVICONSIZE);

                  pathname = path.join(__dirname, '../favicon');

                  return fs.createReadStream(pathname).pipe(response);
                } else {
                  new FileSend(requset, {
                    root: options.root
                  }).pipe(response);
                }
              });
            } else {
              var send = new FileSend(requset, {
                root: options.root
              }).on('dir', function (realpath, stats, next){
                // set Content-Type
                send.setHeader('Content-Type', 'text/html; charset=UTF-8');

                // read dir
                fs.readdir(realpath, function (error, files){
                  if (error) {
                    send.statError(response, error);
                  } else {
                    // response
                    next(context.dir(files, pathname));
                  }
                });
              }).pipe(response);
            }
            break;
        }
      });

      // start listening
      server.on('listening', function (){
        // message
        process.send({
          type: 'info',
          message: 'Server thread ' + cluster.worker.id + ' runing at: ' + options.hostname + ':' + options.port
        });
      });

      // error
      server.on('error', function (error){
        // message
        process.send({
          type: 'error',
          message: 'Server thread ' + cluster.worker.id + ' failed to start: ' + error.message
        });

        // exit
        process.exit();
      });

      // close
      server.on('close', function (){
        // message
        process.send({
          type: 'info',
          message: 'Server thread ' + cluster.worker.id + ' closed'
        });

        // exit
        process.exit();
      });

      // listen
      server.listen(options.port, options.hostname || '127.0.0.1');

      // return
      return server;
    }
  }
};

module.exports = Fengine;
