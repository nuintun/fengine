/*!
 * transform
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/Nuintun/fengine
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

/**
 *
 * @type {{
 *   delimiter: assert.delimiter,
 *   data: assert.data
 *   layout: assert.layout
 * }}
 */
var assert = {
  /**
   * delimiter
   * @param options
   * @param defaults
   */
  delimiter: function (options, defaults){
    Object.keys(options.delimiter).forEach(function (key){
      var def = defaults.delimiter[key];
      var delimiter = options.delimiter[key];

      if (!util.array(delimiter)) {
        options.delimiter[key] = def.map(function (delimiter){
          return util.str4regex(delimiter);
        });
      } else {
        if (!util.string(delimiter[0])) {
          delimiter[0] = util.str4regex(def[0]);
        }

        if (!util.string(delimiter[1])) {
          delimiter[1] = util.str4regex(def[1]);
        }
      }
    });
  },
  /**
   * data
   * @param options
   * @param defaults
   * @param context
   */
  data: function (options, defaults, context){
    Object.keys(options.data).forEach(function (key){
      var def = defaults.data[key];
      var data = options.data[key];

      if (util.fn(data)) {
        data = data.call(context, context.src);
      }

      if (!util.string(data)) {
        options.data[key] = def;
      } else {
        options.data[key] = data;
      }
    });
  },
  /**
   * layout
   * @param options
   * @param defaults
   * @param context
   */
  layout: function (options, defaults, context){
    context.layout = util.fn(options.layout)
      ? options.layout.call(context, context.src)
      : options.layout;

    context.layout = util.string(context.layout)
      ? path.join(context.root, context.layout)
      : defaults.layout;
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
  // buffer
  if (source instanceof Buffer) {
    source = source.toString();
  }

  // src must be a string
  if (!util.string(src)) {
    throw new TypeError('options.src must be a file path.');
  }

  // source must be a string
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
      dirname: function (){
        var dirname = util.normalize(path.relative(this.root, this.dirname));

        return dirname ? dirname + '/' : dirname;
      },
      filename: function (){
        return this.filename;
      }
    }
  };

  context.index = 0;
  context.slot = null;
  context.entry = null;
  context.layout = null;
  context.source = source;
  context.isLayout = false;
  context.defaults = defaults;
  context.options = options = util.extend(true, {}, defaults, options);

  context.src = path.resolve(CWD, src);
  context.dirname = path.dirname(context.src);
  context.extname = path.extname(context.src);
  context.filename = path.basename(context.src, context.extname);
  context.root = path.resolve(CWD, util.string(options.root) ? options.root : CWD);

  context.transform();
}

/**
 * extend
 * @type {Events}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

/**
 * splitter
 */
Transform.prototype.splitter = function (){
  var context = this;
  var options = context.options;
  var defaults = context.defaults;

  if (!context.entry) {
    assert.delimiter(options, defaults);
    assert.data(options, defaults, context);
  }

  var dataDelimiter = options.delimiter.data;
  var directiveDelimiter = options.delimiter.directive;
  var dataDirective = Object.keys(options.data).map(function (data){
    return util.str4regex(data);
  }).join('|');

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
};

/**
 * set layout
 * @param src
 */
Transform.prototype.setLayout = function (src){
  var context = this;

  fs.readFile(src, function (error, source){
    if (error) {
      return context.next();
    }

    var slot = '';
    var layout = context.thread(src, source);

    layout.isLayout = true;

    context.on(EVENTS.DATA, function (data, type){
      if (type !== 'layout') {
        slot += data;
      }
    });

    context.on(EVENTS.SLOT, function (){
      layout.slot = slot;

      layout.next();
    });

    layout.on(EVENTS.DATA, function (data){
      context.write(data, 'layout');
    });

    layout.once(EVENTS.END, function (){
      context.end();
    });
  });
};

/**
 * skip layout
 */
Transform.prototype.skipLayout = function (){
  var context = this;

  context.layout = null;

  context.next();
};

/**
 * transform
 */
Transform.prototype.transform = function (){
  var context = this;

  process.nextTick(function (){
    context.splitter();

    if (!context.entry) {
      assert.layout(context.options, context.defaults, context);
    }

    var src;
    var layout = context.regexp.layout.exec(context.source);
    var nonlayout = context.regexp.nonlayout.exec(context.source);

    if (nonlayout && (layout ? nonlayout.index < layout.index : true)) {
      context.skipLayout();
    } else {
      src = layout ? context.resolve(layout[1]) : context.layout;

      if (src && src !== context.src) {
        context.setLayout(src);
      } else {
        context.skipLayout();
      }
    }
  });
};

/**
 * exec
 * @returns {boolean}
 */
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
          if (context.slot) {
            context.write(context.slot);
          } else {
            context.entry.next();
          }
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
            if (src === entry.src) {
              context.write(match);
              context.next();

              return true;
            }

            entry = entry.entry;
          }

          fs.readFile(src, function (error, source){
            if (error) {
              context.write(match);

              return context.next();
            }

            var child = context.thread(src, source);

            child.on(EVENTS.DATA, function (data){
              context.write(data, 'include');
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
    data = context.options.data.hasOwnProperty(data)
      ? context.options.data[data]
      : match;

    context.write(data);
    context.next();
  }

  return true;
};

/**
 * resolve
 * @param url
 * @returns {*}
 */
Transform.prototype.resolve = function (url){
  var context = this;

  if (/^[\\/]/.test(url)) {
    return path.join(context.root, url);
  } else {
    return path.join(context.dirname, url);
  }
};

/**
 * write
 * @param data
 * @param type
 * @returns {*}
 */
Transform.prototype.write = function (data, type){
  type = type || 'context';

  this.emit(EVENTS.DATA, data, type);

  return data;
};

/**
 * end
 * @param data
 * @param type
 * @returns {*}
 */
Transform.prototype.end = function (data, type){
  var context = this;

  data && context.write(data, type);

  context.emit(EVENTS.END);

  context.entry = null;

  return data;
};

/**
 * next
 */
Transform.prototype.next = function (){
  var context = this;

  if (!context.exec()) {
    context.write(context.source.substring(context.index));

    if (context.isLayout || !context.layout) {
      context.end();
    } else {
      context.emit(EVENTS.SLOT);
    }
  }
};

/**
 * thread
 * @param src
 * @param source
 * @returns {Transform}
 */
Transform.prototype.thread = function (src, source){
  var context = this;
  var options = util.extend(true, {}, context.options);

  options.layout = null;

  var thread = new Transform(src, source.toString(), options);

  thread.entry = context;

  return thread;
};

// exports
module.exports = Transform;
