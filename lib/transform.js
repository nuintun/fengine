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
  SKIP: 'skip',
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
// default options
var DEFAULTOPTIONS = {
  root: CWD,
  layout: null,
  tags: {
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

/**
 * assert
 * @type {{
 *   tags: assert.tags,
 *   data: assert.data
 *   layout: assert.layout
 * }}
 */
var assert = {
  /**
   * tags
   * @param context
   */
  tags: function (context){
    var options = context.options;

    function assert(key){
      var def = DEFAULTOPTIONS.tags[key];
      var tags = options.tags[key];

      if (!util.array(tags)) {
        options.tags[key] = def.map(function (tag){
          return util.str4regex(tag);
        });
      } else {
        if (!util.string(tags[0])) {
          tags[0] = util.str4regex(def[0]);
        }

        if (!util.string(tags[1])) {
          tags[1] = util.str4regex(def[1]);
        }
      }
    }

    if (util.type(options.tags) === 'object') {
      assert('data');
      assert('directive');
    } else {
      options.tags = util.extend(true, {}, DEFAULTOPTIONS.tags);
    }
  },
  /**
   * data
   * @param context
   */
  data: function (context){
    var options = context.options;

    if (util.type(options.data) === 'object') {
      Object.keys(options.data).forEach(function (key){
        var def = DEFAULTOPTIONS.data[key];
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
      options.data = util.extend(true, {}, DEFAULTOPTIONS.data);
    }
  },
  /**
   * layout
   * @param context
   */
  layout: function (context){
    var options = context.options;

    options.layout = util.fn(options.layout)
      ? options.layout.call(context, context.src)
      : options.layout;

    options.layout = util.string(options.layout)
      ? path.join(context.root, options.layout)
      : DEFAULTOPTIONS.layout;
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

  // property
  context.index = 0;
  context.slot = null;
  context.slotted = '';
  context.parent = null;
  context.layout = null;
  context.isMaster = true;
  context.source = source;
  context.finished = false;
  context.options = options = util.extend(true, {}, DEFAULTOPTIONS, options);

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
 * is same tags
 * @returns {boolean}
 */
Transform.prototype.isSameTags = function (){
  var tags = this.options.tags;
  var data = tags.data;
  var directive = tags.directive;

  return data[0] === directive[0] && data[1] === directive[1];
};

/**
 * create separator
 */
Transform.prototype.createSeparator = function (){
  var context = this;
  var options = context.options;

  // main file init tags and data
  if (context.isMaster) {
    assert.tags(context);
    assert.data(context);
  }

  // tags and directive
  var unique = {};
  var dataDirective = [];
  var dataTags = options.tags.data;
  var directiveTags = options.tags.directive;
  var isSameTags = context.isSameTags();

  // create data directive
  for (var data in options.data) {
    if (options.data.hasOwnProperty(data)) {
      data = data.toLowerCase();

      if (!unique[data]) {
        unique[data] = true;

        // trim data
        var trimmed = data.trim();

        if (isSameTags
          && (trimmed === DIRECTIVE.SKIP
          || trimmed === DIRECTIVE.SLOT
          || trimmed === DIRECTIVE.LAYOUT
          || trimmed === DIRECTIVE.INCLUDE
          || trimmed === DIRECTIVE.NONLAYOUT)) {
          continue;
        }

        dataDirective.push(util.str4regex(data));
      }
    }
  }

  // separator regexp
  context.separator = {
    transform: new RegExp(
      directiveTags[0]
      + '\\s*('
      + util.str4regex(DIRECTIVE.INCLUDE)
      + '\\s*\\(\\s*(.+?)\\s*\\)|'
      + util.str4regex(DIRECTIVE.SLOT)
      + ')\\s*'
      + directiveTags[1]
      + '|'
      + dataTags[0]
      + '\\s*('
      + dataDirective.join('|')
      + ')\\s*'
      + dataTags[1],
      'gim'
    ),
    layout: new RegExp(
      directiveTags[0]
      + '\\s*(?:'
      + util.str4regex(DIRECTIVE.LAYOUT)
      + '\\s*\\(\\s*(.+?)\\s*\\)|'
      + util.str4regex(DIRECTIVE.NONLAYOUT)
      + ')\\s*'
      + directiveTags[1],
      'gim'
    ),
    skip: new RegExp(
      directiveTags[0]
      + '\\s*'
      + util.str4regex(DIRECTIVE.SKIP)
      + '\\s*'
      + directiveTags[1],
      'gim'
    )
  };
};

/**
 * resolve
 * @param url
 * @returns {string}
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
 * @param [type]
 * @returns {data}
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
 * @param [type]
 * @returns {*}
 */
Transform.prototype.end = function (data, type){
  var context = this;

  // write data
  if (arguments.length) {
    context.write(data, type);
  }

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
 * @param data
 * @param [type]
 */
Transform.prototype.next = function (data, type){
  var context = this;

  // write data
  if (arguments.length) {
    context.write(data, type);
  }

  // last match
  if (!context.exec()) {
    // cache slotted
    if (context.isLayout() && context.layout) {
      context.layout.slotted += context.slotted;
    }

    // write end data
    context.write(context.source.substring(context.index));

    // set index to end
    context.index = context.source.length;

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

/**
 * is skip
 * @returns {boolean}
 */
Transform.prototype.isSkip = function (){
  var context = this;
  var separator = context.separator;

  return !!context.source.match(separator.skip);
};

/**
 * is layout
 * @returns {boolean}
 */
Transform.prototype.isLayout = function (){
  return !!this.slot;
};

/**
 * is cyclic layout
 * @param layout
 * @returns {boolean}
 */
Transform.prototype.isCyclicLayout = function (layout){
  var context = this;

  // layout is null
  if (!layout) return false;

  if (layout === context.src) {
    return true;
  }

  var slot = context.slot;

  // loop
  while (slot) {
    if (layout === slot.src) {
      return true;
    }

    slot = slot.slot;
  }

  return false;
};

/**
 * is cyclic include
 * @param src
 * @returns {boolean}
 */
Transform.prototype.isCyclicInclude = function (src){
  var context = this;

  // src is null
  if (!src) return false;

  if (src === context.src) {
    return true;
  }

  var parent = context.parent;

  // loop
  while (parent) {
    if (src === parent.src) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
};

/**
 * match layout
 * @returns {{
 *   src: *,
 *   command: *
 * }}
 */
Transform.prototype.matchLayout = function (){
  var src = null;
  var command = null;
  var context = this;
  var separator = context.separator;
  var match = separator.layout.exec(context.source);

  if (match) {
    while (match) {
      if (match) {
        src = match[1];
        command = match[0];

        if (src) {
          src = context.resolve(src);
        }
      }

      match = separator.layout.exec(context.source);
    }
  } else {
    src = context.options.layout;
  }

  return {
    src: src,
    command: command
  };
};

/**
 * set layout
 * @param command
 * @param src
 * @returns {src}
 */
Transform.prototype.setLayout = function (command, src){
  // read layout
  fs.readFile(src, function (error, source){
    var context = this;

    if (error) {
      context.io(context, command);

      return context.skipLayout();
    }

    // read layout
    var layout = context.thread(src, source);

    // set context layout
    context.layout = layout;

    // set layout slot
    layout.slot = context;

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
  }.bind(this));

  return src;
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
 * include file
 * @param command
 * @param src
 * @returns {src}
 */
Transform.prototype.include = function (command, src){
  // read include
  fs.readFile(src, function (error, source){
    var context = this;

    if (error) {
      context.io(context, command);
      context.write(command);

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
  }.bind(this));

  return src;
};

/**
 * print data
 * @param command
 * @param data
 * @returns {data}
 */
Transform.prototype.print = function (command, data){
  var context = this;
  var options = context.options;

  data = options.data.hasOwnProperty(data)
    ? options.data[data]
    : command;

  context.next(data);

  return data;
};

/**
 * exec
 * @returns {boolean}
 */
Transform.prototype.exec = function (){
  var context = this;
  var separator = context.separator;
  var match = separator.transform.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var type = match[1] ? 'directive' : 'data';
  var command = type === 'directive' ? match[1] : match[3];
  var data = type === 'directive' ? match[2] : match[3];

  // matched string
  match = match[0];

  // write source before match
  context.write(context.source.substring(context.index, index));

  // set index
  context.index = index + match.length;

  // switch type
  switch (type) {
    case 'data':
      context.print(match, data);
      break;
    case 'directive':
      // ignore case
      var commandIgnoreCase = command.toLowerCase();

      // command switch
      switch (commandIgnoreCase) {
        case DIRECTIVE.SLOT:
          if (context.isLayout()) {
            if (context.slot.finished) {
              context.next(context.slotted);
            } else {
              context.slot.next();
            }
          } else {
            context.next(match);
          }
          break;
        default:
          if (data && commandIgnoreCase.startsWith(DIRECTIVE.INCLUDE)) {
            var src = context.resolve(data);

            // cyclic include
            if (context.isCyclicInclude(src)) {
              context.circle(context, match);
              context.next(match);

              return true;
            }

            // include
            context.include(match, src);
          } else {
            context.next(match);
          }
          break;
      }
      break;
    default:
      context.next(match);
      break;
  }

  return true;
};

/**
 * transform
 */
Transform.prototype.transform = function (){
  // start transform in next tick
  process.nextTick(function (){
    var context = this;

    // create separator
    context.createSeparator();

    // has skip command
    if (context.isSkip()) {
      context.write(context.source);

      // set index to end
      context.index = context.source.length;

      return context.end();
    }

    // main file init layout
    if (context.isMaster) {
      assert.layout(context);
    }

    // match layout
    var layout = context.matchLayout();
    var src = layout.src;
    var command = layout.command;

    if (src && !context.isCyclicLayout(src)) {
      context.setLayout(command, src);
    } else {
      if (command && src) {
        context.circle(context, command);
      }

      // skip layout
      context.skipLayout();
    }
  }.bind(this));
};

// exports
module.exports = Transform;
