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
var http = require('http');
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

function Fengine(options){
  this.options = options;

  this.run();
}

Fengine.prototype = {
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
    var options = this.options;

    if (cluster.isMaster) {
      // worker
      var worker;

      // create thread
      for (var i = 0; i < NUMCPUS; i++) {
        // fork
        worker = cluster.fork();

        // listen event
        worker.on('message', this.log);
      }
    } else {
      // create server
      var server = http.createServer(function (requset, response){
        // send file

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
