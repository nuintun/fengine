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
  context.source = source;
  context.options = options = util.mix({
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

  context.src = options.src;
  context.root = options.root;
  context.dirname = path.dirname(context.src);
  context.filename = path.basename(context.src);
  context.regexp = new RegExp(
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
  var context = this;
  var match = context.regexp.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var type = match[1] ? 'command' : 'data';
  var directive = type === 'command' ? match[1] : match[2];

  match = match[0];

  context.emit('data', context.source.substring(context.index, index));

  if (type === 'command') {
    if (directive === context.options.command.include) {
      new Transform('', context.options)
        .on('end', function (){
          context.next();
        }.bind(context));
    }
  } else {
    context.emit('data', context.options.data[directive] || match);
  }

  context.index = index + match.length;

  return {
    type: type,
    directive: directive
  };
};
Transform.prototype.resolve = function (url){
  var context = this;

  if (path.isAbsolute(url)) {
    return path.join(context.root, url);
  } else {
    return path.join(path.dirname)
  }
};

Transform.prototype.next = function (){
  if (!this.exec()) {
    this.emit('end');
  }
};

// exports
module.exports = Transform;
