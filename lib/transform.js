/**
 * @module transform
 * @license MIT
 * @version 2017/11/14
 */

'use strict';

// Import lib
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const Events = require('./events');

// Variable declaration
const DIRECTIVE = {
  SKIP: 'skip',
  SLOT: 'slot',
  LAYOUT: 'layout',
  INCLUDE: 'include',
  NONLAYOUT: '!layout'
};
const EVENTS = {
  END: 'end',
  DATA: 'data',
  ERROR: 'error'
};
const CWD = process.cwd();
// Default options
const DEFAULTOPTIONS = {
  root: CWD,
  layout: null,
  tags: {
    data: ['{{', '}}'],
    directive: ['<!--', '-->']
  },
  data: {
    dirname() {
      const dirname = utils.normalize(path.relative(this.root, this.dirname));

      return dirname ? dirname + '/' : dirname;
    },
    filename() {
      return this.filename;
    },
    extname() {
      return this.extname;
    }
  }
};

/**
 * @namespace assert
 */
const assert = {
  /**
   * @method tags
   * @param {Transform} context
   */
  tags(context) {
    const options = context.options;

    const assert = (key) => {
      const def = DEFAULTOPTIONS.tags[key];
      const tags = options.tags[key];

      if (!Array.isArray(tags)) {
        options.tags[key] = def.map((tag) => {
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
   * @method data
   * @param {Transform} context
   */
  data(context) {
    const options = context.options;

    if (utils.typeOf(options.data) === 'object') {
      Object.keys(options.data).forEach((key) => {
        let data = options.data[key];
        const def = DEFAULTOPTIONS.data[key];

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
   * @method layout
   * @param {Transform} context
   */
  layout(context) {
    const options = context.options;

    options.layout = utils.fn(options.layout)
      ? options.layout.call(context, context.src)
      : options.layout;

    options.layout = utils.string(options.layout)
      ? path.join(context.root, options.layout)
      : DEFAULTOPTIONS.layout;
  }
};

/**
 * @class Transform
 * @extends Events
 */
class Transform extends Events {
  /**
   * @constructor
   * @param {string} src
   * @param {Buffer|string} source
   * @param {Object} options
   * @returns {Transform}
   */
  constructor(src, source, options) {
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

    super();

    // Property
    this.index = 0;
    this.slot = null;
    this.slotted = '';
    this.parent = null;
    this.layout = null;
    this.isMaster = true;
    this.source = source;
    this.finished = false;
    this.options = options = utils.extend(true, {}, DEFAULTOPTIONS, options);

    // Path
    this.src = path.resolve(CWD, src);
    this.dirname = path.dirname(this.src);
    this.extname = path.extname(this.src);
    this.filename = path.basename(this.src, this.extname);
    this.root = path.resolve(CWD, utils.string(options.root) ? options.root : CWD);

    // Transform start
    this.transform();
  }

  /**
   * @method isSameTags
   * @description Is same tags
   * @returns {boolean}
   */
  isSameTags() {
    const tags = this.options.tags;
    const data = tags.data;
    const directive = tags.directive;

    return data[0] === directive[0] && data[1] === directive[1];
  }

  /**
   * @method createSeparator
   * @description Create separator
   */
  createSeparator() {
    const options = this.options;

    // Main file init tags and data
    if (this.isMaster) {
      assert.tags(this);
      assert.data(this);
    }

    // The tags and directive
    const unique = {};
    const dataDirective = [];
    const dataTags = options.tags.data;
    const directiveTags = options.tags.directive;
    const isSameTags = this.isSameTags();

    // Create data directive
    for (let data in options.data) {
      if (options.data.hasOwnProperty(data)) {
        data = data.toLowerCase();

        if (!unique[data]) {
          unique[data] = true;

          // Trim data
          const trimmed = data.trim();

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
    this.separator = {
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
  }

  /**
   * @method resolve
   * @param {string} url
   * @returns {string}
   */
  resolve(url) {
    if (/^[\\/]/.test(url)) {
      return path.join(this.root, url);
    } else {
      return path.join(this.dirname, url);
    }
  }

  /**
   * @method write
   * @param {string} data
   * @param {string} [type]
   * @returns {string}
   */
  write(data, type) {
    // Data type
    type = type || 'context';

    // Cache slotted
    if (this.layout && type !== 'layout') {
      this.layout.slotted += data;
    }

    // Emit data event
    this.emit(EVENTS.DATA, data, type);

    return data;
  }

  /**
   * @method end
   * @param {string} data
   * @param {string} [type]
   * @returns {string}
   */
  end(data, type) {
    // Write data
    if (arguments.length) {
      this.write(data, type);
    }

    // Delete prop
    this.slot = null;
    this.slotted = '';
    this.layout = null;
    this.parent = null;

    // Emit end event
    this.emit(EVENTS.END);

    return data;
  }

  /**
   * @method next
   * @param {string} data
   * @param {string} [type]
   */
  next(data, type) {
    // Write data
    if (arguments.length) {
      this.write(data, type);
    }

    // Last match
    if (!this.exec()) {
      // Cache slotted
      if (this.isLayout() && this.layout) {
        this.layout.slotted += this.slotted;
      }

      // Write end data
      this.write(this.source.substring(this.index));

      // Set index to end
      this.index = this.source.length;

      // Finished
      this.finished = true;

      // Call layout next or context end
      if (this.layout) {
        this.layout.next();
      } else {
        this.end();
      }
    }
  }

  /**
   * @method thread
   * @param {string} src
   * @param {Buffer|string} source
   * @returns {Transform}
   */
  thread(src, source) {
    const options = utils.extend(true, {}, this.options);

    // Reset layout
    options.layout = null;

    const thread = new Transform(src, source, options);

    // Not main file
    thread.isMaster = false;

    return thread;
  }

  /**
   * @method error
   * @param {string} type
   * @param {Transform} context
   * @param {string} message
   */
  error(type, context, message) {
    this.emit(EVENTS.ERROR, type, context, message);
  }

  /**
   * @method io
   * @description io error
   * @param {Transform} context
   * @param {string} message
   */
  io(context, message) {
    this.error('io', context, message);
  }

  /**
   * @method circle
   * @description circle error
   * @param {Transform} context
   * @param {string} message
   */
  circle(context, message) {
    this.error('circle', context, message);
  }

  /**
   * @method isSkip
   * @returns {boolean}
   */
  isSkip() {
    const separator = this.separator;

    return !!this.source.match(separator.skip);
  }

  /**
   * @method isLayout
   * @returns {boolean}
   */
  isLayout() {
    return !!this.slot;
  }

  /**
   * @method isCyclicLayout
   * @param {string|null} layout
   * @returns {boolean}
   */
  isCyclicLayout(layout) {
    // Layout is null
    if (!layout) return false;

    if (layout === this.src) {
      return true;
    }

    let slot = this.slot;

    // Loop
    while (slot) {
      if (layout === slot.src) {
        return true;
      }

      slot = slot.slot;
    }

    return false;
  }

  /**
   * @method isCyclicInclude
   * @param {string} src
   * @returns {boolean}
   */
  isCyclicInclude(src) {
    // Src is null
    if (!src) return false;

    if (src === this.src) {
      return true;
    }

    let parent = this.parent;

    // Loop
    while (parent) {
      if (src === parent.src) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  }

  /**
   * @method matchLayout
   * @returns {{
   *   src: {string},
   *   command: {string}
   * }}
   */
  matchLayout() {
    let src = null;
    let command = null;
    const separator = this.separator;
    let match = separator.layout.exec(this.source);

    if (match) {
      while (match) {
        if (match) {
          src = match[1];
          command = match[0];

          if (src) {
            src = this.resolve(src);
          }
        }

        match = separator.layout.exec(this.source);
      }
    } else {
      src = this.options.layout;
    }

    return {
      src: src,
      command: command
    };
  }

  /**
   * @method setLayout
   * @param {string} command
   * @param {string} src
   * @returns {string}
   */
  setLayout(command, src) {
    // Read layout
    fs.readFile(src, (error, source) => {
      if (error) {
        this.io(this, command);

        return this.skipLayout();
      }

      // Read layout
      const layout = this.thread(src, source);

      // Set context layout
      this.layout = layout;

      // Set layout slot
      layout.slot = this;

      // Data event
      layout.on(EVENTS.DATA, (data) => {
        this.write(data, 'layout');
      });

      // Circle event
      layout.on(EVENTS.ERROR, (type, file, message) => {
        this.error(type, file, message);
      });

      // End event
      layout.once(EVENTS.END, () => {
        this.end();
      });
    });

    return src;
  }

  /**
   * @method skipLayout
   */
  skipLayout() {
    this.layout = null;

    this.next();
  }

  /**
   * @method include
   * @param {string} command
   * @param {string} src
   * @returns {string}
   */
  include(command, src) {
    // Read include
    fs.readFile(src, (error, source) => {
      if (error) {
        this.io(this, command);
        this.write(command);

        return this.next();
      }

      // Read include
      const include = this.thread(src, source);

      // Set parent
      include.parent = this;

      // Data event
      include.on(EVENTS.DATA, (data) => {
        this.write(data, 'include');
      });

      // Circle event
      include.on(EVENTS.ERROR, (type, file, message) => {
        this.error(type, file, message);
      });

      // End event
      include.once(EVENTS.END, () => {
        this.next();
      });
    });

    return src;
  }

  /**
   * @method print
   * @param {string} command
   * @param {string} data
   * @returns {string}
   */
  print(command, data) {
    const options = this.options;

    data = options.data.hasOwnProperty(data)
      ? options.data[data]
      : command;

    this.next(data);

    return data;
  }

  /**
   * @method exec
   * @returns {boolean}
   */
  exec() {
    const separator = this.separator;
    let match = separator.transform.exec(this.source);

    if (!match) return false;

    const index = match.index;
    const type = match[1] ? 'directive' : 'data';
    const command = type === 'directive' ? match[1] : match[3];
    const data = type === 'directive' ? match[2] : match[3];

    // Matched string
    match = match[0];

    // Write source before match
    this.write(this.source.substring(this.index, index));

    // Set index
    this.index = index + match.length;

    // Switch type
    switch (type) {
      case 'data':
        this.print(match, data);
        break;
      case 'directive':
        // Ignore case
        const commandIgnoreCase = command.toLowerCase();

        // Command switch
        switch (commandIgnoreCase) {
          case DIRECTIVE.SLOT:
            if (this.isLayout()) {
              if (this.slot.finished) {
                this.next(this.slotted);
              } else {
                this.slot.next();
              }
            } else {
              this.next(match);
            }
            break;
          default:
            if (data && commandIgnoreCase.indexOf(DIRECTIVE.INCLUDE) === 0) {
              const src = this.resolve(data);

              // Cyclic include
              if (this.isCyclicInclude(src)) {
                this.circle(this, match);
                this.next(match);

                return true;
              }

              // Include
              this.include(match, src);
            } else {
              this.next(match);
            }
            break;
        }
        break;
      default:
        this.next(match);
        break;
    }

    return true;
  }

  /**
   * @method transform
   */
  transform() {
    // Start transform in next tick
    process.nextTick(() => {
      // Create separator
      this.createSeparator();

      // Has skip command
      if (this.isSkip()) {
        this.write(this.source);

        // Set index to end
        this.index = this.source.length;

        return this.end();
      }

      // Main file init layout
      if (this.isMaster) {
        assert.layout(this);
      }

      // Match layout
      const layout = this.matchLayout();
      const src = layout.src;
      const command = layout.command;

      if (src && !this.isCyclicLayout(src)) {
        this.setLayout(command, src);
      } else {
        if (command && src) {
          this.circle(this, command);
        }

        // Skip layout
        this.skipLayout();
      }
    });
  }
}

// Exports
module.exports = Transform;
