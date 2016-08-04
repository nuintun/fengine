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

// lib
var fs = require('fs');
var path = require('path');
var util = require('./util');
var Events = require('./events');

// variable declaration
var DIRECTIVE = {
  SLOT: 'slot',
  LAYOUT: 'layout',
  INCLUDE: 'include',
  NONLAYOUT: '!layout'
};
var EVENTS = {
  END: 'end',
  DATA: 'data',
  ERROR: 'error'
};
var CWD = process.cwd();

/**
 * assert
 * @type {{
 *   delimiter: assert.delimiter,
 *   data: assert.data
 *   layout: assert.layout
 * }}
 */
var assert = {
  /**
   * delimiter
   * @param context
   */
  delimiter: function (context){
    var options = context.options;
    var defaults = context.defaults;

    function assert(key){
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
    }

    if (util.type(options.delimiter) === 'object') {
      assert('data');
      assert('directive');
    } else {
      options.delimiter = util.extend(true, {}, defaults.delimiter);
    }
  },
  /**
   * data
   * @param context
   */
  data: function (context){
    var options = context.options;
    var defaults = context.defaults;

    if (util.type(options.data) === 'object') {
      Object.keys(options.data).forEach(function (key){
        var def = defaults.data[key];
        var data = options.data[key];

        if (util.fn(data)) {
          data = data.call(context, context.src);
        }

        if (!util.string(data)) {
          if (util.string(def)) {
            options.data[key] = def;
          } else {
            options.data[key] = String(data);
          }
        } else {
          options.data[key] = data;
        }
      });
    } else {
      options.data = util.extend(true, {}, defaults.data);
    }
  },
  /**
   * layout
   * @param context
   */
  layout: function (context){
    var options = context.options;
    var defaults = context.defaults;

    options.layout = util.fn(options.layout)
      ? options.layout.call(context, context.src)
      : options.layout;

    options.layout = util.string(options.layout)
      ? path.join(context.root, options.layout)
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
    throw new TypeError('src must be a file path.');
  }

  // source must be a string
  if (!util.string(source)) {
    throw new TypeError('source must be a string or buffer.');
  }

  // context
  var context = this;
  // default options
  var defaults = {
    root: CWD,
    layout: null,
    delimiter: {
      data: ['{{', '}}'],
      directive: ['<!--', '-->']
    },
    data: {
      dirname: function (){
        var context = this;
        var dirname = util.normalize(path.relative(context.root, context.dirname));

        return dirname ? dirname + '/' : dirname;
      },
      filename: function (){
        return this.filename;
      },
      extname: function (){
        return this.extname;
      }
    }
  };

  // property
  context.index = 0;
  context.slot = null;
  context.slotted = '';
  context.parent = null;
  context.layout = null;
  context.isMaster = true;
  context.source = source;
  context.isLayout = false;
  context.finished = false;
  context.defaults = defaults;
  context.options = options = util.extend(true, {}, defaults, options);

  // path
  context.src = path.resolve(CWD, src);
  context.dirname = path.dirname(context.src);
  context.extname = path.extname(context.src);
  context.filename = path.basename(context.src, context.extname);
  context.root = path.resolve(CWD, util.string(options.root) ? options.root : CWD);

  // transform
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

  // main file init delimiter and data
  if (context.isMaster) {
    assert.delimiter(context);
    assert.data(context);
  }

  // delimiter and directive
  var dataDelimiter = options.delimiter.data;
  var directiveDelimiter = options.delimiter.directive;
  var dataDirective = Object.keys(options.data).map(function (directive){
    return util.str4regex(directive);
  }).join('|');

  // splitter regexp
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
      + directiveDelimiter[1],
      'im'
    ),
    nonlayout: new RegExp(
      directiveDelimiter[0]
      + '\\s*'
      + util.str4regex(DIRECTIVE.NONLAYOUT)
      + '\\s*'
      + directiveDelimiter[1],
      'im'
    )
  };
};

/**
 * set layout
 * @param command
 */
Transform.prototype.setLayout = function (command){
  var context = this;
  var options = context.options;

  // read layout
  fs.readFile(options.layout, function (error, source){
    if (error) {
      context.io(context, command);

      return context.skipLayout();
    }

    // read layout
    var layout = context.thread(options.layout, source);

    // set context layout
    context.layout = layout;

    // set layout slot
    layout.slot = context;
    // set is layout file
    layout.isLayout = true;

    // data event
    layout.on(EVENTS.DATA, function (data){
      context.write(data, 'layout');
    });

    // circle event
    layout.on(EVENTS.ERROR, function (type, file, message){
      context.error(type, file, message);
    });

    // end event
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
  var options = context.options;

  process.nextTick(function (){
    context.splitter();

    // main file init layout
    if (context.isMaster) {
      assert.layout(context);
    }

    // layout
    var layout = context.regexp.layout.exec(context.source);
    var nonlayout = context.regexp.nonlayout.exec(context.source);

    // nonlayout
    if (nonlayout && (layout ? nonlayout.index > layout.index : true)) {
      context.skipLayout();
    } else {
      var parent = context.parent;
      var command = layout ? layout[0] : null;

      // set layout
      options.layout = layout ? context.resolve(layout[1]) : options.layout;

      if (options.layout && options.layout !== context.src
        && (parent ? options.layout !== parent.src : true)) {
        context.setLayout(command);
      } else {
        command && context.circle(context, command);
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
  var options = context.options;
  var match = context.regexp.transform.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var type = match[1] ? 'directive' : 'data';
  var command = type === 'directive' ? match[1] : match[3];
  var data = type === 'directive' ? match[2] : match[3];

  match = match[0];
  command = command.toLowerCase();

  context.write(context.source.substring(context.index, index));

  context.index = index + match.length;

  if (type === 'directive') {
    switch (command) {
      case DIRECTIVE.SLOT:
        if (context.isLayout && context.slot) {
          if (context.slot.finished) {
            context.write(context.slotted);
            context.next();
          } else {
            context.slot.next();
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
            context.circle(context, match);
            context.write(match);
            context.next();

            return true;
          }

          var parent = context.parent;

          while (parent) {
            if (src === parent.src) {
              context.circle(context, match);
              context.write(match);
              context.next();

              return true;
            }

            parent = parent.parent;
          }

          fs.readFile(src, function (error, source){
            if (error) {
              context.io(context, match);
              context.write(match);

              return context.next();
            }

            // read include
            var include = context.thread(src, source);

            // set parent
            include.parent = context;

            // data event
            include.on(EVENTS.DATA, function (data){
              context.write(data, 'include');
            });

            // circle event
            include.on(EVENTS.ERROR, function (type, file, message){
              context.error(type, file, message);
            });

            // end event
            include.once(EVENTS.END, function (){
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
    data = options.data.hasOwnProperty(data)
      ? options.data[data]
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
  var context = this;

  // data type
  type = type || 'context';

  // cache slotted
  if (context.layout && type !== 'layout') {
    context.layout.slotted += data;
  }

  // emit data event
  context.emit(EVENTS.DATA, data, type);

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

  // delete prop
  context.slot = null;
  context.slotted = '';
  context.layout = null;
  context.parent = null;

  // emit end event
  context.emit(EVENTS.END);

  return data;
};

/**
 * next
 */
Transform.prototype.next = function (){
  var context = this;

  // last match
  if (!context.exec()) {
    // cache slotted
    if (context.layout) {
      context.layout.slotted += context.slotted;
    }

    // write end data
    context.write(context.source.substring(context.index));

    // finished
    context.finished = true;

    // call layout next or context end
    if (context.layout) {
      context.layout.next();
    } else {
      context.end();
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

  // reset layout
  options.layout = null;

  var thread = new Transform(src, source, options);

  // not main file
  thread.isMaster = false;

  return thread;
};

/**
 * error
 * @param type
 * @param context
 * @param message
 */
Transform.prototype.error = function (type, context, message){
  this.emit(EVENTS.ERROR, type, context, message);
};

/**
 * io error
 * @param context
 * @param message
 */
Transform.prototype.io = function (context, message){
  this.error('io', context, message);
};

/**
 * circle error
 * @param context
 * @param message
 */
Transform.prototype.circle = function (context, message){
  this.error('circle', context, message);
};

// exports
module.exports = Transform;
