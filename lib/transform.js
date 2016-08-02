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

var fs = require('fs');
var path = require('path');
var util = require('./util');
var Events = require('./events');

var DIRECTIVE = {
  SLOT: 'slot',
  LAYOUT: 'layout',
  INCLUDE: 'include',
  NONLAYOUT: '!layout'
};
var EVENTS = {
  END: 'end',
  DATA: 'data',
  SLOT: '__SLOT__'
};
var CWD = process.cwd();

var assert = {
  delimiter: function (options, defaults){
    Object.keys(options.delimiter).forEach(function (key){
      var def = defaults.delimiter[key];
      var delimiter = options.delimiter[key];

      if (!util.array(delimiter)) {
        options.delimiter[key] = def;
      } else {
        if (!util.string(delimiter[0])) {
          delimiter[0] = def[0];
        }

        if (!util.string(delimiter[1])) {
          delimiter[1] = def[1];
        }
      }
    });
  },
  data: function (options, defaults){
    Object.keys(options.data).forEach(function (key){
      var def = defaults.data[key];
      var data = options.data[key];

      if (util.fn(data)) {
        data = data(options.src);
      }

      if (!util.string(data)) {
        options.data[key] = def;
      }
    });
  }
};

/**
 * Transform
 * @param src
 * @param source
 * @param options
 * @constructor
 */
function Transform(src, source, options){
  if (!util.string(src)) {
    throw new TypeError('options.src must be a file path.');
  }

  if (!util.string(source)) {
    throw new TypeError('source must be a string.');
  }

  var context = this;
  var defaults = {
    root: CWD,
    layout: null,
    delimiter: {
      data: ['{{', '}}'],
      directive: ['<!--', '-->']
    },
    data: {
      dirname: 'dirname',
      filename: 'filename'
    }
  };

  context.index = 0;
  context.entry = null;
  context.source = source;
  context.isLayout = false;
  context.options = options = util.mix(defaults, options);

  assert.data(options, defaults);
  assert.delimiter(options, defaults);

  context.src = path.resolve(CWD, src);
  context.dirname = path.dirname(context.src);
  context.filename = path.basename(context.src);
  context.root = path.resolve(CWD, util.string(options.root) ? options.root : CWD);
  context.layout = util.fn(options.layout) ? options.layout(context.src) : options.layout;
  context.layout = util.string(context.layout) ? context.resolve(context.layout) : null;

  var dataDelimiter = options.delimiter.data.map(function (directive){
    return util.str4regex(directive);
  });

  var dataDirective = Object.keys(options.data).map(function (data){
    return util.str4regex(data);
  }).join('|');

  var directiveDelimiter = options.delimiter.directive.map(function (directive){
    return util.str4regex(directive);
  });

  context.regexp = {
    transform: new RegExp(
      directiveDelimiter[0]
      + '\\s*('
      + util.str4regex(DIRECTIVE.INCLUDE)
      + '\\s*\\(\\s*(.+?)\\s*\\)|'
      + util.str4regex(DIRECTIVE.SLOT)
      + ')\\s*'
      + directiveDelimiter[1]
      + '|'
      + dataDelimiter[0]
      + '\\s*('
      + dataDirective
      + ')\\s*'
      + dataDelimiter[1],
      'img'
    ),
    layout: new RegExp(
      directiveDelimiter[0]
      + '\\s*'
      + util.str4regex(DIRECTIVE.LAYOUT)
      + '\\s*\\(\\s*(.+?)\\s*\\)\\s*'
      + directiveDelimiter[1]
    ),
    nonlayout: new RegExp(
      directiveDelimiter[0]
      + '\\s*'
      + util.str4regex(DIRECTIVE.NONLAYOUT)
      + '\\s*'
      + directiveDelimiter[1]
    )
  };

  context.transform();
}

/**
 * extend
 * @type {EventEmitter}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

Transform.prototype.transform = function (){
  var context = this;

  process.nextTick(function (){
    var src;
    var layout = context.regexp.layout.exec(context.source);
    var nonlayout = context.regexp.nonlayout.exec(context.source);

    if (nonlayout && (layout ? nonlayout.index < layout.index : true)) {
      context.next();
    } else {
      src = layout ? context.resolve(layout[1]) : context.layout;

      if (src && src !== context.src) {
        context.setLayout(src);
      } else {
        context.next();
      }
    }
  });
};

Transform.prototype.setLayout = function (src){
  var context = this;

  fs.readFile(src, function (error, source){
    if (error) {
      return context.next();
    }

    var options = util.mix({}, context.options);

    options.layout = null;

    var layout = new Transform(src, source.toString(), options);

    layout.entry = context;
    layout.isLayout = true;

    layout.on(EVENTS.DATA, function (data){
      context.write(data);
    });

    context.once(EVENTS.SLOT, function (){
      layout.next();
    });

    layout.once(EVENTS.END, function (){
      context.end();
    });
  });
};

Transform.prototype.exec = function (){
  var context = this;
  var match = context.regexp.transform.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var type = match[1] ? 'directive' : 'data';
  var command = type === 'directive' ? match[1] : match[3];
  var data = type === 'directive' ? match[2] : match[3];

  match = match[0];

  context.write(context.source.substring(context.index, index));

  context.index = index + match.length;

  if (type === 'directive') {
    command = command.toLowerCase();

    switch (command) {
      case DIRECTIVE.SLOT:
        if (context.isLayout && context.entry) {
          context.entry.next();
        } else {
          context.write(match);
          context.next();
        }
        break;
      default:
        if (command.indexOf(DIRECTIVE.INCLUDE) === 0) {
          var src = context.resolve(data);

          if (src === context.src) {
            context.write(match);
            context.next();

            return true;
          }

          var entry = context.entry;

          while (entry) {
            if (context.src === entry.src) {
              context.entry = null;

              return true;
            }

            entry = entry.entry;
          }

          fs.readFile(src, function (error, source){
            if (error) {
              context.write(match);

              return context.next();
            }

            var options = util.mix({}, context.options);

            options.layout = null;

            var child = new Transform(src, source.toString(), options);

            child.entry = context;

            child.on(EVENTS.DATA, function (data){
              context.write(data);
            });

            child.once(EVENTS.END, function (){
              context.next();
            });
          });
        } else {
          context.write(match);
          context.next();
        }
        break;
    }
  } else {
    context.write(context.options.data[data] || match);
    context.next();
  }

  return true;
};

Transform.prototype.resolve = function (url){
  return path.resolve(this.dirname, url);
};

Transform.prototype.write = function (data){
  this.emit(EVENTS.DATA, data);

  return data;
};

Transform.prototype.end = function (data){
  if (data) {
    this.emit(EVENTS.DATA, data);
  }

  this.emit(EVENTS.END);

  return data;
};

Transform.prototype.next = function (){
  var context = this;

  if (!context.exec()) {
    context.write(context.source.substring(context.index));

    if (context.isLayout) {
      context.end();
    } else {
      if (context.layout) {
        context.emit(EVENTS.SLOT);
      } else {
        context.end();
      }
    }
  }
};

// exports
module.exports = Transform;
