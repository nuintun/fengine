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
var fs = require('fs');
var path = require('path');
var util = require('./util');
var Events = require('./events');

var assert = {
  delimiter: function (){

  },
  data: function (){

  },
  directive: function (){

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

  var context = this;
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

  context.index = 0;
  context.entry = null;
  context.source = source;
  context.options = options = util.mix({
    src: '',
    root: CWD,
    delimiter: {
      data: ['{{', '}}'],
      directive: ['<!--', '-->']
    },
    data: {
      dirname: function (src){
        return path.dirname(src);
      },
      filename: function (src){
        return path.basename(src);
      }
    },
    directive: {
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

  Object.keys(options.directive).forEach(function (directive){
    assert.directive(directive, defaults.directive);
  });

  context.src = options.src;
  context.root = options.root;
  context.dirname = path.dirname(context.src);
  context.filename = path.basename(context.src);
  context.regexp = new RegExp(
    util.str4regex(options.delimiter.directive[0])
    + '\\s*(\\S+?)\\s*'
    + util.str4regex(options.delimiter.directive[1])
    + '|'
    + util.str4regex(options.delimiter.data[0])
    + '\\s*(\\S+?)\\s*'
    + util.str4regex(options.delimiter.data[1]),
    'img'
  );

  process.nextTick(function (){
    context.next();
  });
}

/**
 * extend
 * @type {EventEmitter}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

Transform.prototype.exec = function (){
  var context = this;
  var match = context.regexp.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var options = context.options;
  var type = match[1] ? 'directive' : 'data';
  var command = type === 'directive' ? match[1] : match[2];

  match = match[0];

  context.emit('data', context.source.substring(context.index, index));

  if (type === 'directive') {
    if (command === options.directive.include) {
      var entry = context.entry;

      while (entry instanceof Transform) {
        if (context.src === entry.src) {
          return true;
        }

        entry = entry.entry;
      }

      fs.readFile(context.resolve(command), function (error, source){
        if (error) {
          return context.next();
        }

        var child = new Transform(source.toString(), context.options);

        child.entry = context;

        child.on('end', function (){
          var entry = this.entry;

          if (this.entry instanceof Transform) {
            entry.next();
          }
        });
      });
    } else {
      context.emit('data', match);
    }
  } else {
    context.emit('data', context.options.data[command] || match);
  }

  context.index = index + match.length;

  return true;
};
Transform.prototype.resolve = function (url){
  var context = this;

  if (path.isAbsolute(url)) {
    return path.join(context.root, url);
  } else {
    return path.join(context.dirname, url);
  }
};

Transform.prototype.next = function (){
  if (!this.exec()) {
    this.emit('end');
  }
};

// exports
module.exports = Transform;
