/*!
 * transform
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/nuintun/fengine
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// Import lib
var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var Events = require('./events');

// Variable declaration
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
// Default options
var DEFAULTOPTIONS = {
  root: CWD,
  layout: null,
  tags: {
    data: ['{{', '}}'],
    directive: ['<!--', '-->']
  },
  data: {
    dirname: function() {
      var context = this;
      var dirname = utils.normalize(path.relative(context.root, context.dirname));

      return dirname ? dirname + '/' : dirname;
    },
    filename: function() {
      return this.filename;
    },
    extname: function() {
      return this.extname;
    }
  }
};

/**
 * assert
 *
 * @type {{
 *   tags: assert.tags,
 *   data: assert.data,
 *   layout: assert.layout
 * }}
 */
var assert = {
  /**
   * tags
   *
   * @param {Transform} context
   * @returns {void}
   */
  tags: function(context) {
    var options = context.options;

    function assert(key) {
      var def = DEFAULTOPTIONS.tags[key];
      var tags = options.tags[key];

      if (!utils.array(tags)) {
        options.tags[key] = def.map(function(tag) {
          return utils.str4regex(tag);
        });
      } else {
        if (!utils.string(tags[0])) {
          tags[0] = utils.str4regex(def[0]);
        }

        if (!utils.string(tags[1])) {
          tags[1] = utils.str4regex(def[1]);
        }
      }
    }

    if (utils.typeOf(options.tags) === 'object') {
      assert('data');
      assert('directive');
    } else {
      options.tags = utils.extend(true, {}, DEFAULTOPTIONS.tags);
    }
  },
  /**
   * data
   *
   * @param {Transform} context
   * @returns {void}
   */
  data: function(context) {
    var options = context.options;

    if (utils.typeOf(options.data) === 'object') {
      Object.keys(options.data).forEach(function(key) {
        var def = DEFAULTOPTIONS.data[key];
        var data = options.data[key];

        if (utils.fn(data)) {
          data = data.call(context, context.src);
        }

        if (!utils.string(data)) {
          if (utils.string(def)) {
            options.data[key] = def;
          } else {
            options.data[key] = String(data);
          }
        } else {
          options.data[key] = data;
        }
      });
    } else {
      options.data = utils.extend(true, {}, DEFAULTOPTIONS.data);
    }
  },
  /**
   * layout
   *
   * @param {Transform} context
   * @returns {void}
   */
  layout: function(context) {
    var options = context.options;

    options.layout = utils.fn(options.layout)
      ? options.layout.call(context, context.src)
      : options.layout;

    options.layout = utils.string(options.layout)
      ? path.join(context.root, options.layout)
      : DEFAULTOPTIONS.layout;
  }
};

/**
 * Transform
 *
 * @param {String} src
 * @param {Buffer|String} source
 * @param {Object} options
 * @constructor
 */
function Transform(src, source, options) {
  // Buffer
  if (Buffer.isBuffer(source)) {
    source = source.toString();
  }

  // Src must be a string
  if (!utils.string(src)) {
    throw new TypeError('src must be a file path.');
  }

  // Source must be a string
  if (!utils.string(source)) {
    throw new TypeError('source must be a string or buffer.');
  }

  // Context
  var context = this;

  // Property
  context.index = 0;
  context.slot = null;
  context.slotted = '';
  context.parent = null;
  context.layout = null;
  context.isMaster = true;
  context.source = source;
  context.finished = false;
  context.options = options = utils.extend(true, {}, DEFAULTOPTIONS, options);

  // Path
  context.src = path.resolve(CWD, src);
  context.dirname = path.dirname(context.src);
  context.extname = path.extname(context.src);
  context.filename = path.basename(context.src, context.extname);
  context.root = path.resolve(CWD, utils.string(options.root) ? options.root : CWD);

  // Transform start
  context.transform();
}

/**
 * extend
 *
 * @type {Events}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

/**
 * Is same tags
 *
 * @returns {Boolean}
 */
Transform.prototype.isSameTags = function() {
  var tags = this.options.tags;
  var data = tags.data;
  var directive = tags.directive;

  return data[0] === directive[0] && data[1] === directive[1];
};

/**
 * Create separator
 */
Transform.prototype.createSeparator = function() {
  var context = this;
  var options = context.options;

  // Main file init tags and data
  if (context.isMaster) {
    assert.tags(context);
    assert.data(context);
  }

  // The tags and directive
  var unique = {};
  var dataDirective = [];
  var dataTags = options.tags.data;
  var directiveTags = options.tags.directive;
  var isSameTags = context.isSameTags();

  // Create data directive
  for (var data in options.data) {
    if (options.data.hasOwnProperty(data)) {
      data = data.toLowerCase();

      if (!unique[data]) {
        unique[data] = true;

        // Trim data
        var trimmed = data.trim();

        if (isSameTags
          && (trimmed === DIRECTIVE.SKIP
            || trimmed === DIRECTIVE.SLOT
            || trimmed === DIRECTIVE.LAYOUT
            || trimmed === DIRECTIVE.INCLUDE
            || trimmed === DIRECTIVE.NONLAYOUT)) {
          continue;
        }

        dataDirective.push(utils.str4regex(data));
      }
    }
  }

  // Separator regexp
  context.separator = {
    transform: new RegExp(
      directiveTags[0]
      + '\\s*('
      + utils.str4regex(DIRECTIVE.INCLUDE)
      + '\\s*\\(\\s*(.+?)\\s*\\)|'
      + utils.str4regex(DIRECTIVE.SLOT)
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
      + utils.str4regex(DIRECTIVE.LAYOUT)
      + '\\s*\\(\\s*(.+?)\\s*\\)|'
      + utils.str4regex(DIRECTIVE.NONLAYOUT)
      + ')\\s*'
      + directiveTags[1],
      'gim'
    ),
    skip: new RegExp(
      directiveTags[0]
      + '\\s*'
      + utils.str4regex(DIRECTIVE.SKIP)
      + '\\s*'
      + directiveTags[1],
      'gim'
    )
  };
};

/**
 * resolve
 *
 * @param {String} url
 * @returns {String}
 */
Transform.prototype.resolve = function(url) {
  var context = this;

  if (/^[\\/]/.test(url)) {
    return path.join(context.root, url);
  } else {
    return path.join(context.dirname, url);
  }
};

/**
 * write
 *
 * @param {String} data
 * @param {String} [type]
 * @returns {String}
 */
Transform.prototype.write = function(data, type) {
  var context = this;

  // Data type
  type = type || 'context';

  // Cache slotted
  if (context.layout && type !== 'layout') {
    context.layout.slotted += data;
  }

  // Emit data event
  context.emit(EVENTS.DATA, data, type);

  return data;
};

/**
 * end
 *
 * @param {String} data
 * @param {String} [type]
 * @returns {String}
 */
Transform.prototype.end = function(data, type) {
  var context = this;

  // Write data
  if (arguments.length) {
    context.write(data, type);
  }

  // Delete prop
  context.slot = null;
  context.slotted = '';
  context.layout = null;
  context.parent = null;

  // Emit end event
  context.emit(EVENTS.END);

  return data;
};

/**
 * next
 *
 * @param {String} data
 * @param {String} [type]
 * @returns {void}
 */
Transform.prototype.next = function(data, type) {
  var context = this;

  // Write data
  if (arguments.length) {
    context.write(data, type);
  }

  // Last match
  if (!context.exec()) {
    // Cache slotted
    if (context.isLayout() && context.layout) {
      context.layout.slotted += context.slotted;
    }

    // Write end data
    context.write(context.source.substring(context.index));

    // Set index to end
    context.index = context.source.length;

    // Finished
    context.finished = true;

    // Call layout next or context end
    if (context.layout) {
      context.layout.next();
    } else {
      context.end();
    }
  }
};

/**
 * thread
 *
 * @param {String} src
 * @param {Buffer|String} source
 * @returns {Transform}
 */
Transform.prototype.thread = function(src, source) {
  var context = this;
  var options = utils.extend(true, {}, context.options);

  // Reset layout
  options.layout = null;

  var thread = new Transform(src, source, options);

  // Not main file
  thread.isMaster = false;

  return thread;
};

/**
 * error
 *
 * @param {String} type
 * @param {Transform} context
 * @param {String} message
 */
Transform.prototype.error = function(type, context, message) {
  this.emit(EVENTS.ERROR, type, context, message);
};

/**
 * io error
 *
 * @param {Transform} context
 * @param {String} message
 */
Transform.prototype.io = function(context, message) {
  this.error('io', context, message);
};

/**
 * circle error
 *
 * @param {Transform} context
 * @param {String} message
 */
Transform.prototype.circle = function(context, message) {
  this.error('circle', context, message);
};

/**
 * Is skip
 *
 * @returns {Boolean}
 */
Transform.prototype.isSkip = function() {
  var context = this;
  var separator = context.separator;

  return !!context.source.match(separator.skip);
};

/**
 * Is layout
 *
 * @returns {Boolean}
 */
Transform.prototype.isLayout = function() {
  return !!this.slot;
};

/**
 * Is cyclic layout
 *
 * @param {String|null} layout
 * @returns {Boolean}
 */
Transform.prototype.isCyclicLayout = function(layout) {
  var context = this;

  // Layout is null
  if (!layout) return false;

  if (layout === context.src) {
    return true;
  }

  var slot = context.slot;

  // Loop
  while (slot) {
    if (layout === slot.src) {
      return true;
    }

    slot = slot.slot;
  }

  return false;
};

/**
 * Is cyclic include
 *
 * @param {String} src
 * @returns {Boolean}
 */
Transform.prototype.isCyclicInclude = function(src) {
  var context = this;

  // Src is null
  if (!src) return false;

  if (src === context.src) {
    return true;
  }

  var parent = context.parent;

  // Loop
  while (parent) {
    if (src === parent.src) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
};

/**
 * Match layout
 *
 * @returns {{
 *   src: {String},
 *   command: {String}
 * }}
 */
Transform.prototype.matchLayout = function() {
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
 * Set layout
 *
 * @param {String} command
 * @param {String} src
 * @returns {String}
 */
Transform.prototype.setLayout = function(command, src) {
  // Read layout
  fs.readFile(src, function(error, source) {
    var context = this;

    if (error) {
      context.io(context, command);

      return context.skipLayout();
    }

    // Read layout
    var layout = context.thread(src, source);

    // Set context layout
    context.layout = layout;

    // Set layout slot
    layout.slot = context;

    // Data event
    layout.on(EVENTS.DATA, function(data) {
      context.write(data, 'layout');
    });

    // Circle event
    layout.on(EVENTS.ERROR, function(type, file, message) {
      context.error(type, file, message);
    });

    // End event
    layout.once(EVENTS.END, function() {
      context.end();
    });
  }.bind(this));

  return src;
};

/**
 * Skip layout
 */
Transform.prototype.skipLayout = function() {
  var context = this;

  context.layout = null;

  context.next();
};

/**
 * Include file
 *
 * @param {String} command
 * @param {String} src
 * @returns {String}
 */
Transform.prototype.include = function(command, src) {
  // Read include
  fs.readFile(src, function(error, source) {
    var context = this;

    if (error) {
      context.io(context, command);
      context.write(command);

      return context.next();
    }

    // Read include
    var include = context.thread(src, source);

    // Set parent
    include.parent = context;

    // Data event
    include.on(EVENTS.DATA, function(data) {
      context.write(data, 'include');
    });

    // Circle event
    include.on(EVENTS.ERROR, function(type, file, message) {
      context.error(type, file, message);
    });

    // End event
    include.once(EVENTS.END, function() {
      context.next();
    });
  }.bind(this));

  return src;
};

/**
 * Print data
 *
 * @param {String} command
 * @param {String} data
 * @returns {String}
 */
Transform.prototype.print = function(command, data) {
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
 *
 * @returns {Boolean}
 */
Transform.prototype.exec = function() {
  var context = this;
  var separator = context.separator;
  var match = separator.transform.exec(context.source);

  if (!match) return false;

  var index = match.index;
  var type = match[1] ? 'directive' : 'data';
  var command = type === 'directive' ? match[1] : match[3];
  var data = type === 'directive' ? match[2] : match[3];

  // Matched string
  match = match[0];

  // Write source before match
  context.write(context.source.substring(context.index, index));

  // Set index
  context.index = index + match.length;

  // Switch type
  switch (type) {
    case 'data':
      context.print(match, data);
      break;
    case 'directive':
      // Ignore case
      var commandIgnoreCase = command.toLowerCase();

      // Command switch
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
          if (data && commandIgnoreCase.indexOf(DIRECTIVE.INCLUDE) === 0) {
            var src = context.resolve(data);

            // Cyclic include
            if (context.isCyclicInclude(src)) {
              context.circle(context, match);
              context.next(match);

              return true;
            }

            // Include
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
Transform.prototype.transform = function() {
  // Start transform in next tick
  process.nextTick(function() {
    var context = this;

    // Create separator
    context.createSeparator();

    // Has skip command
    if (context.isSkip()) {
      context.write(context.source);

      // Set index to end
      context.index = context.source.length;

      return context.end();
    }

    // Main file init layout
    if (context.isMaster) {
      assert.layout(context);
    }

    // Match layout
    var layout = context.matchLayout();
    var src = layout.src;
    var command = layout.command;

    if (src && !context.isCyclicLayout(src)) {
      context.setLayout(command, src);
    } else {
      if (command && src) {
        context.circle(context, command);
      }

      // Skip layout
      context.skipLayout();
    }
  }.bind(this));
};

// Exports
module.exports = Transform;
