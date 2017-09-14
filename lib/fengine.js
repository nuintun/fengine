/*!
 * fengine
 * Version: 0.0.1
 * Date: 2016/8/2
 * https://github.com/nuintun/fengine
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// Import lib
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

// Variable declaration
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
 * Fengine
 *
 * @param options
 * @constructor
 */
function Fengine(options) {
  this.options = options;

  this.run();
}

/**
 * prototype
 *
 * @type {{
 *   dir: Fengine.dir,
 *   error: Fengine.error,
 *   log: Fengine.log,
 *   run: Fengine.run
 * }}
 */
Fengine.prototype = {
  dir: function(files, dir) {
    var parent = util.normalize(path.join(dir, '../'));
    var up = dir === '/' ? '' : '      <span>-</span>\n'
      + '      <a href="' + parent + '" title="Back to parent directory."><h1>up</h1></a>\n';
    var html = '<!DOCTYPE html>\n'
      + '<html>\n'
      + '  <head>\n'
      + '    <meta name="renderer" content="webkit" />\n'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />\n'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type" />\n'
      + '    <title>' + dir + '</title>\n'
      + '    <style>\n'
      + '      html, body, p {\n'
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

    var width = String(files.length).length;

    files.forEach(function(file, index) {
      var href = dir + file;

      html += '    <div class="ui-file">\n'
        + '      <span>' + util.pad(++index, width) + ':</span>\n'
        + '      <a href="' + href + '" title="' + href + '">' + file + '</a>\n'
        + '    </div>\n';
    });

    html += '  </body>\n'
      + '</html>\n';

    return html;
  },
  error: function(response, statusCode, next) {
    var html = '<!DOCTYPE html>\n'
      + '<html>\n'
      + '  <head>\n'
      + '    <meta name="renderer" content="webkit" />\n'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />\n'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type" />\n'
      + '    <title>' + statusCode + '</title>\n'
      + '    <style>\n'
      + '      html, body, div, p {\n'
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
  log: function(data) {
    var type = data.type;
    var date = util.dateFormat(new Date());
    var message = colors.reset.green.bold(' [' + date + '] ');

    switch (type) {
      case LOGLEVELS.INFO:
        message += colors.reset.cyan.bold(data.message);
        break;
      case LOGLEVELS.WARN:
        message += colors.reset.yellow.bold(data.message);
        break;
      case LOGLEVELS.ERROR:
        message += colors.reset.red.bold(data.message);
        break;
    }

    // Break line
    message += '\n';

    // Output message
    if (type === LOGLEVELS.INFO) {
      process.stdout.write(message);
    } else {
      process.stderr.write(message);
    }
  },
  send: function(requset, response) {
    var context = this;
    var options = context.options;

    // File send
    var send = new FileSend(requset, {
      root: options.root
    }).on('error', function(error, next) {
      context.error(response, error.statusCode, next);
    }).on('dir', function(realpath, stats, next) {
      // Set Content-Type
      send.setHeader('Content-Type', 'text/html; charset=UTF-8');

      // Read dir
      fs.readdir(realpath, function(error, files) {
        if (error) {
          send.statError(response, error);
        } else {
          // Response
          next(context.dir(files, send.url));
        }
      });
    }).pipe(response);

    // Send
    return send;
  },
  transform: function(pathname, source, response) {
    var context = this;
    var options = context.options;

    // Set status code
    response.statusCode = 200;

    // Set Content-Type
    response.setHeader('Content-Type', mime.lookup(pathname));

    // Transform
    var transform = new Transform(pathname, source, {
      root: options.base,
      data: options.data,
      layout: options.layout,
      delimiter: options.tags
    });

    // Event data
    transform.on('data', function(data) {
      response.write(data);
    });

    // Event error
    transform.on('error', function(event, file, command) {
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

      // Send message
      process.send({
        type: type,
        message: message
      })
    });

    // Event end
    transform.on('end', function() {
      response.end();
    });

    // Transform
    return transform;
  },
  run: function() {
    var context = this;
    var options = context.options;

    // Master thread
    if (cluster.isMaster) {
      // Worker thread
      var worker;

      // Create thread
      for (var i = 0; i < NUMCPUS; i++) {
        // Fork
        worker = cluster.fork();

        // Listen event
        worker.on('message', context.log);
      }
    } else {
      // Create server
      var server = http.createServer(function(requset, response) {
        response.setHeader('Server', 'Fengine/' + pkg.version);
        response.setHeader('X-Powered-By', 'Node/' + process.version);

        var parsed = url.parse(requset.url);
        var pathname = util.decodeURI(parsed.pathname);

        if (pathname === -1 || pathname.indexOf('\0') !== -1) {
          return context.error(response, 400);
        }

        var extname = path.extname(pathname).toLowerCase();

        if (options.watch.indexOf(extname) !== -1) {
          pathname = path.join(options.root, pathname);

          if (util.isOutBound(pathname, CWD)) {
            return context.error(response, 403);
          }

          if (!util.isOutBound(pathname, options.base)) {
            fs.stat(pathname, function(error, stats) {
              if (error) {
                return context.error(response, 404);
              }

              // Is file
              if (stats.isFile()) {
                fs.readFile(pathname, function(error, source) {
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

            fs.stat(pathname, function(error) {
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

      // Start listening
      server.on('listening', function() {
        var server = this.address();
        var hostname = options.hostname
          ? server.address : '127.0.0.1';

        options.data.server = hostname + ':' + server.port;

        // Message
        process.send({
          type: 'info',
          message: 'Server thread ' + cluster.worker.id + ' runing at: ' + hostname + ':' + server.port
        });
      });

      // Event error
      server.on('error', function(error) {
        // Message
        process.send({
          type: 'error',
          message: 'Server thread ' + cluster.worker.id + ' failed to start: ' + error.message
        });

        // Exit
        process.exit();
      });

      // Event close
      server.on('close', function() {
        // Message
        process.send({
          type: 'info',
          message: 'Server thread ' + cluster.worker.id + ' closed'
        });

        // Exit
        process.exit();
      });

      // Listen
      if (options.hostname) {
        server.listen(options.port, options.hostname);
      } else {
        server.listen(options.port);
      }

      // Return server
      return server;
    }
  }
};

// Exports
module.exports = Fengine;
