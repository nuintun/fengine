/*!
 * transform
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/Nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/fengine/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

var CWD = process.cwd();
var path = require('path');
var util = require('./util');
var Events = require('./events');

var assert = {
  delimiter: function (){

  },
  data: function (){

  },
  command: function (){

  }
};

/**
 * Transform
 * @param source
 * @param options
 * @constructor
 */
function Transform(source, options){
  if (!util.string(source)) {
    throw new TypeError('source must be a string.');
  }

  var defaults = {
    src: '',
    root: CWD,
    delimiter: {
      data: ['{{', '}}'],
      command: ['<!--', '-->']
    },
    data: {
      dirname: function (src){
        return path.dirname(src);
      },
      filename: function (src){
        return path.basename(src);
      }
    },
    command: {
      slot: 'slot',
      include: 'include',
      layout: 'layout',
      nonlayout: '!layout'
    }
  };

  this.index = 0;
  this.source = source;
  this.options = options = util.mix({
    src: '',
    root: CWD,
    delimiter: {
      data: ['{{', '}}'],
      command: ['<!--', '-->']
    },
    data: {
      dirname: function (src){
        return path.dirname(src);
      },
      filename: function (src){
        return path.basename(src);
      }
    },
    command: {
      slot: 'slot',
      include: 'include',
      layout: 'layout',
      nonlayout: '!layout'
    }
  }, options);

  Object.keys(options.delimiter).forEach(function (delimiter){
    assert.delimiter(delimiter, defaults.delimiter);
  });

  Object.keys(options.data).forEach(function (data){
    assert.data(data, defaults.data);
  });

  Object.keys(options.command).forEach(function (command){
    assert.command(command, defaults.command);
  });

  this.regexp = new RegExp(
    util.str4regex(options.delimiter.command[0])
    + '\\s*(\\S+?)\\s*'
    + util.str4regex(options.delimiter.command[1])
    + '|'
    + util.str4regex(options.delimiter.data[0])
    + '\\s*(\\S+?)\\s*'
    + util.str4regex(options.delimiter.data[1]),
    'img'
  );
}

/**
 * extend
 * @type {EventEmitter}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

Transform.prototype.exec = function (){

};

Transform.prototype.next = function (){
  if (!this.exec()) {
    this.emit('end');
  } else {

  }
};

// exports
module.exports = Transform;
