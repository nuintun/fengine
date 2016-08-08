/*!
 * fengine
 * Version: 0.0.1
 * Date: 2016/8/2
 * https://github.com/Nuintun/fengine
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// lib
var os = require('os');
var fs = require('fs');
var url = require('url');
var path = require('path');
var http = require('http');
var util = require('./util');
var colors = require('colors');
var cluster = require('cluster');
var mime = require('mime-types');
var FileSend = require('file-send');
var pkg = require('../package.json');
var Transform = require('./transform');

// variable declaration
var CWD = process.cwd();
var NUMCPUS = os.cpus().length;
var LOGLEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};
var FAVICON = path.join(__dirname, '../favicon.ico');
var FAVICONSIZE = fs.lstatSync(FAVICON).size;

/**
 * date format
 * @param date
 * @param format
 * @returns {*}
 */
function dateFormat(date, format){
  if (!date instanceof Date) {
    throw new TypeError('param date must be a date.');
  }

  format = format || 'yyyy-MM-dd hh:mm:ss';

  var map = {
    'M': date.getMonth() + 1, // month
    'd': date.getDate(), // date
    'h': date.getHours(), // hours
    'm': date.getMinutes(), // minutes
    's': date.getSeconds(), // seconds
    'q': Math.floor((date.getMonth() + 3) / 3), // quarter
    'S': date.getMilliseconds() // milliseconds
  };

  format = format.replace(/([yMdhmsqS])+/g, function (all, t){
    var v = map[t];

    if (v !== undefined) {
      if (all.length > 1) {
        v = '0' + v;
        v = v.substr(v.length - 2);
      }

      return v;
    } else if (t === 'y') {
      return (date.getFullYear() + '').substr(4 - all.length);
    }

    return all;
  });

  return format;
}

/**
 * is out bound
 * @param path
 * @param root
 * @returns {boolean}
 */
function isOutBound(path, root){
  if (process.platform === 'win32') {
    path = path.toLowerCase();
    root = root.toLowerCase();
  }

  if (path.length < root.length) {
    return true;
  }

  return path.indexOf(root) !== 0;
}

/**
 * decode uri
 * @param uri
 * @returns {*}
 */
function decodeURI(uri){
  try {
    return decodeURIComponent(uri);
  } catch (err) {
    return -1;
  }
}

/**
 * converts a number to a string with
 * a given amount of leading characters.
 * @param {number} number Number to convert.
 * @param {number} width Amount of leading characters to prepend.
 * @param {string} [padding = '0'] leading character.
 * @throws Error
 * @returns {string}
 */
function pad(number, width, padding){
  // Convert number to string.
  var string = number.toString();

  // Return either the original number as string,
  // or the number with leading padding characters.
  if (!width || string.length >= width) {
    return string;
  }

  var leadingCharacters = new Array(width - string.length + 1).join(padding || '0');

  return leadingCharacters + string;
}

/**
 * Fengine
 * @param options
 * @constructor
 */
function Fengine(options){
  this.options = options;

  this.run();
}

/**
 *
 * @type {{
 *   dir: Fengine.dir,
 *   error: Fengine.error,
 *   log: Fengine.log,
 *   run: Fengine.run
 * }}
 */
Fengine.prototype = {
  dir: function (files, dir){
    var parent = util.normalize(path.join(dir, '../'));
    var upLink = '      <span>—</span>\n'
      + '      <a href="' + parent + '" title="Back to parent directory."><h1>up</h1></a>\n';
    var up = dir === '/' ? '' : upLink;
    var html = '<!DOCTYPE html>\n'
      + '<html>\n'
      + '  <head>\n'
      + '    <meta name="renderer" content="webkit"/>\n'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>\n'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type"/>\n'
      + '    <title>' + dir + '</title>\n'
      + '    <style>\n'
      + '      html, body, p{\n'
      + '        margin: 0; padding: 0;\n'
      + '        font-family: "Lucida Console", Consolas, "Liberation Mono", Menlo, Courier, monospace;\n'
      + '      }\n'
      + '      h1 { margin: 10px 0; }\n'
      + '      a { display: inline-block; color: #0e90d2; text-decoration: none; }\n'
      + '      a:focus, a:hover { color: #095f8a; }\n'
      + '      a:focus { outline: thin dotted; }\n'
      + '      a:active, a:hover { outline: 0; }\n'
      + '      a:hover { text-decoration: underline; }\n'
      + '      .ui-dir {\n'
      + '         text-indent: 10px; border-bottom: 1px solid #ddd; margin-bottom: 10px; background: #f5f5f5;\n'
      + '      }\n'
      + '      .ui-dir > span + a h1 { text-indent: 0; }\n'
      + '      .ui-file { padding: 4px 30px; }\n'
      + '      .ui-file > span { color: #080; }\n'
      + '    </style>\n'
      + '  </head>\n'
      + '  <body>\n'
      + '    <div class="ui-dir">\n'
      + '      <a href="' + dir + '" title="' + dir + '"><h1>' + dir + '</h1></a>\n' + up
      + '    </div>\n';

    var width = (files.length + 1).toString().length;

    files.forEach(function (file, index){
      var href = dir + file;

      html += ''
        + '    <div class="ui-file">\n'
        + '      <span>' + pad(++index, width) + ':</span>\n'
        + '      <a href="' + href + '" title="' + href + '">' + file + '</a></div>\n'
        + '    </div>\n';
    });

    html += '  </body>\n'
      + '</html>\n';

    return html;
  },
  error: function (response, statusCode, next){
    var html = '<!DOCTYPE html>\n'
      + '<html>\n'
      + '  <head>\n'
      + '    <meta name="renderer" content="webkit"/>\n'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>\n'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type"/>\n'
      + '    <title>' + statusCode + '</title>\n'
      + '    <style>\n'
      + '      html, body, div, p{\n'
      + '        margin: 0; padding: 0;\n'
      + '        text-align: center;\n'
      + '        font-family: Calibri, "Lucida Console", Consolas, "Liberation Mono", Menlo, Courier, monospace;\n'
      + '      }\n'
      + '      p { color: #0e90d2; line-height: 100%; }\n'
      + '      .ui-code { font-size: 200px; font-weight: bold; margin-top: 66px; }\n'
      + '      .ui-message { font-size: 80px; }\n'
      + '    </style>\n'
      + '  </head>\n'
      + '  <body>\n'
      + '    <p class="ui-code">' + statusCode + '</p>\n'
      + '    <p class="ui-message">' + http.STATUS_CODES[statusCode] + '</p>\n'
      + '  </body>\n'
      + '</html>\n';

    if (util.fn(next)) {
      next(html);
    } else {
      response.statusCode = statusCode;

      response.setHeader('Content-Type', 'text/html; charset=UTF-8');
      response.end(html);
    }
  },
  log: function (data){
    var date = dateFormat(new Date(), 'yyyy-MM-dd hh:mm:ss');
    var message = colors.green.bold('[' + date + '] ');

    switch (data.type) {
      case LOGLEVELS.INFO:
        message += colors.cyan.bold(data.message);
        break;
      case LOGLEVELS.WARN:
        message += colors.yellow.bold(data.message);
        break;
      case LOGLEVELS.ERROR:
        message += colors.red.bold(data.message);
        break;
    }

    // log
    console.log(message);
  },
  send: function (requset, response){
    var context = this;
    var options = context.options;

    // file send
    var send = new FileSend(requset, {
      root: options.root
    }).on('error', function (error, next){
      context.error(response, error.statusCode, next);
    }).on('dir', function (realpath, stats, next){
      // set Content-Type
      send.setHeader('Content-Type', 'text/html; charset=UTF-8');

      // read dir
      fs.readdir(realpath, function (error, files){
        if (error) {
          send.statError(response, error);
        } else {
          // response
          next(context.dir(files, send.url));
        }
      });
    }).pipe(response);

    // send
    return send;
  },
  transform: function (pathname, source, response){
    var context = this;
    var options = context.options;

    // set status code
    response.statusCode = 200;

    // set Content-Type
    response.setHeader('Content-Type', mime.lookup(pathname));

    // transform
    var transform = new Transform(pathname, source, {
      root: options.base,
      data: options.data,
      layout: options.layout,
      delimiter: options.tags
    });

    // data
    transform.on('data', function (data){
      response.write(data);
    });

    // error
    transform.on('error', function (event, file, command){
      var type;
      var message;

      switch (event) {
        case 'circle':
          type = 'warn';
          message = 'Found cyclic command \''
            + command + '\'\n  at file: /'
            + util.normalize(path.relative(options.root, file.src));
          break;
        case 'io':
          type = 'error';

          if (command) {
            message = 'File of command \''
              + command + '\' does not exist\n  at file: /'
              + util.normalize(path.relative(options.root, file.src));
          } else {
            message = 'The default layout file does not exist';
          }
          break;
      }

      // send message
      process.send({
        type: type,
        message: message
      })
    });

    // end
    transform.on('end', function (){
      response.end();
    });

    // transform
    return transform;
  },
  run: function (){
    var context = this;
    var options = context.options;

    // master thread
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
        var parsed = requset.url;

        response.setHeader('Server', 'Fengine/' + pkg.version);
        response.setHeader('X-Powered-By', 'Node/' + process.version);

        if (parsed === -1 || parsed.indexOf('\0') !== -1) {
          return context.error(response, 400);
        }

        parsed = url.parse(decodeURI(requset.url));

        var pathname = parsed.pathname;
        var extname = path.extname(pathname).toLowerCase();

        if (options.watch.indexOf(extname) !== -1) {
          pathname = path.join(options.root, pathname);

          if (isOutBound(pathname, CWD)) {
            return context.error(response, 403);
          }

          if (!isOutBound(pathname, options.base)) {
            fs.stat(pathname, function (error, stats){
              if (error) {
                return context.error(response, 404);
              }

              // is file
              if (stats.isFile()) {
                fs.readFile(pathname, function (error, source){
                  if (error) {
                    return context.error(response, 404);
                  }

                  context.transform(pathname, source, response);
                });
              } else {
                context.send(requset, response);
              }
            });
          } else {
            context.send(requset, response);
          }
        } else {
          if (pathname.toLowerCase() === '/favicon.ico') {
            pathname = path.join(options.root, pathname);

            fs.stat(pathname, function (error){
              if (error) {
                response.statusCode = 200;

                response.setHeader('Content-Type', 'image/x-icon');
                response.setHeader('Content-Length', FAVICONSIZE);

                return fs.createReadStream(FAVICON).pipe(response);
              }

              context.send(requset, response);
            });
          } else {
            context.send(requset, response);
          }
        }
      });

      // start listening
      server.on('listening', function (){
        var server = this.address();

        options.data.server = server.address + ':' + server.port;

        // message
        process.send({
          type: 'info',
          message: 'Server thread ' + cluster.worker.id + ' runing at: ' + server.address + ':' + server.port
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
      server.listen(options.port, options.hostname);

      // return
      return server;
    }
  }
};

// exports
module.exports = Fengine;
