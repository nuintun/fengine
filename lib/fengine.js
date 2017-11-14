/**
 * @module fengine
 * @license MIT
 * @version 2017/11/14
 */

'use strict';

// Import lib
const fs = require('fs');
const path = require('path');
const http = require('http');
const utils = require('./utils');
const cluster = require('cluster');
const FileSend = require('file-send');
const pkg = require('../package.json');
const Transform = require('./transform');

// Variable declaration
const join = path.join;
const mime = FileSend.mime;
const relative = path.relative;
const LOG_LEVELS = utils.LOG_LEVELS;
const WORKER_ID = cluster.worker.id;
const FAVICON = join(__dirname, '../favicon.ico');
const FAVICON_SIZE = fs.lstatSync(FAVICON).size;

/**
 * @class Fengine
 */
class Fengine {
  /**
   * @constructor
   * @param {Object} options
   * @returns {Fengine}
   */
  constructor(options) {
    this.options = options;

    // Run server
    this.run();
  }

  /**
   * @method dir
   * @param {Array} files
   * @param {string} dir
   * @returns {string}
   */
  dir(files, dir) {
    const parent = utils.normalize(join(dir, '../'));
    const up = dir === '/' ? '' : '      <span>-</span>\n'
      + `      <a href="${ parent }" title="Back to parent directory."><h1>up</h1></a>\n`;
    let html = '<!DOCTYPE html>\n'
      + '<html>\n'
      + '  <head>\n'
      + '    <meta name="renderer" content="webkit" />\n'
      + '    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />\n'
      + '    <meta content="text/html; charset=utf-8" http-equiv="content-type" />\n'
      + `    <title>${ dir }</title>\n`
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
      + `      <a href="${ dir }" title="${ dir }"><h1>${ dir }</h1></a>\n${ up }`
      + '    </div>\n';

    const width = String(files.length).length;

    files.forEach((file, index) => {
      const href = dir + file;

      html += '    <div class="ui-file">\n'
        + '      <span>' + utils.pad(++index, width) + ':</span>\n'
        + '      <a href="' + href + '" title="' + href + '">' + file + '</a>\n'
        + '    </div>\n';
    });

    html += '  </body>\n'
      + '</html>\n';

    return html;
  }

  /**
   * @method send
   * @param {Request} request
   * @param {string} path
   * @param {Response} response
   * @returns {FileSend}
   */
  send(request, path, response) {
    // File send
    const send = new FileSend(request, path, {
      root: this.options.root
    }).on('dir', (realpath, next) => {
      // Read dir
      fs.readdir(realpath, (error, files) => {
        if (error) return this.send(request, path, response);

        // Set Content-Type
        send.setHeader('Content-Type', 'text/html; charset=UTF-8');
        // Response
        next(this.dir(files, path));
      });
    }).pipe(response);

    // Send
    return send;
  }

  /**
   * @method transform
   * @param {string} path
   * @param {string|Buffer} source
   * @param {Response} response
   * @returns {Transform}
   */
  transform(path, source, response) {
    // Set status code
    response.statusCode = 200;

    // Set Content-Type
    response.setHeader('Content-Type', mime.lookup(path));

    const options = this.options;

    // Transform
    const transform = new Transform(path, source, {
      root: options.base,
      data: options.data,
      layout: options.layout,
      delimiter: options.tags
    });

    // Event data
    transform.on('data', (data) => {
      response.write(data);
    });

    // Event error
    transform.on('error', (event, file, command) => {
      let type;
      let message;

      switch (event) {
        case 'circle':
          type = LOG_LEVELS.WARN;
          message = `Found cyclic command '${ command }'\n`
            + `  at file: /${ utils.normalize(relative(options.root, file.src)) }`;
          break;
        case 'io':
          type = LOG_LEVELS.ERROR;

          if (command) {
            message = `File of command '${ command }' does not exist\n`
              + `  at file: /${ utils.normalize(relative(options.root, file.src)) }`;
          } else {
            message = 'The default layout file does not exist';
          }
          break;
      }

      // Send message
      process.send({
        type: type,
        data: message
      })
    });

    // Event end
    transform.on('end', () => {
      response.end();
    });

    // Transform
    return transform;
  }

  /**
   * @method run
   */
  run() {
    const options = this.options;
    // Create server
    const server = http.createServer((request, response) => {
      response.setHeader('Server', 'Fengine/' + pkg.version);
      response.setHeader('X-Powered-By', 'Node/' + process.version);

      const pathname = utils.decodeURI(utils.pathname(request.url));

      if (pathname === -1 || pathname.indexOf('\0') !== -1) {
        return this.send(request, pathname, response);
      }

      const extname = path.extname(pathname).toLowerCase();

      if (options.watch.indexOf(extname) !== -1) {
        const realpath = join(options.root, pathname);

        if (utils.isOutBound(realpath, options.root)) {
          return this.send(request, pathname, response);
        }

        if (utils.isOutBound(realpath, options.base)) {
          return this.send(request, pathname, response);
        }

        fs.readFile(realpath, (error, source) => {
          if (error) {
            return this.send(request, pathname, response);
          }

          this.transform(realpath, source, response);
        });
      } else {
        if (pathname === '/favicon.ico') {
          const realpath = join(options.root, pathname);

          fs.stat(realpath, (error) => {
            if (error) {
              response.statusCode = 200;

              response.setHeader('Content-Type', 'image/x-icon');
              response.setHeader('Content-Length', FAVICON_SIZE);

              return fs.createReadStream(FAVICON).pipe(response);
            }

            this.send(request, pathname, response);
          });
        } else {
          this.send(request, pathname, response);
        }
      }
    });

    // Start listening
    server.on('listening', function() {
      const server = this.address();
      const hostname = options.hostname ? options.hostname : '127.0.0.1';

      options.data.server = hostname + ':' + server.port;

      // Message
      process.send({
        type: LOG_LEVELS.INFO,
        data: 'Server worker thread ' + WORKER_ID + ' runing at: ' + hostname + ':' + server.port
      });
    });

    // Event error
    server.on('error', (error) => {
      const hostname = options.hostname ? options.hostname : '127.0.0.1';
      const message = error.syscall + ' ' + error.code + ' ' + hostname + ':' + error.port;

      // Message
      process.send({
        type: LOG_LEVELS.ERROR,
        data: 'Server worker thread ' + WORKER_ID + ' failed to start: ' + message
      });

      // Exit
      process.exit();
    });

    // Event close
    server.on('close', () => {
      // Message
      process.send({
        type: LOG_LEVELS.INFO,
        data: 'Server worker thread ' + WORKER_ID + ' closed'
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
  }
}

// Exports
module.exports = Fengine;
