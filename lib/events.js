/**
 * @module events
 * @license MIT
 * @author nuintun
 */

'use strict';

// Array slice
const slice = Array.prototype.slice;

/**
 * @function apply
 * @description Faster apply, call is faster than apply, optimize less than 6 args
 * @param  {Function} fn
 * @param  {any} context
 * @param  {Array} args
 * @see https://github.com/micro-js/apply
 * @see http://blog.csdn.net/zhengyinhui100/article/details/7837127
 */
function apply(fn, context, args) {
  switch (args.length) {
    // Faster
    case 0:
      return fn.call(context);
    case 1:
      return fn.call(context, args[0]);
    case 2:
      return fn.call(context, args[0], args[1]);
    case 3:
      return fn.call(context, args[0], args[1], args[2]);
    default:
      // Slower
      return fn.apply(context, args);
  }
}

/**
 * @class Events
 */
class Events {
  /**
   * @method on
   * @description Bind event
   * @param {string} name
   * @param {Function} listener
   * @param {any} context
   * @returns {Events}
   */
  on(name, listener, context) {
    const events = this._events || (this._events = {});

    context = arguments.length < 3 ? this : context;

    // [...[listener, context]]
    (events[name] || (events[name] = [])).push([listener, context]);

    return this;
  }

  /**
   * @method once
   * @description Bind event only emit once
   * @param {string} name
   * @param {Function} listener
   * @param {any} context
   * @returns {Events}
   */
  once(name, listener, context) {
    context = arguments.length < 3 ? this : context;

    const feedback = () => {
      this.off(name, feedback, context);
      apply(listener, context, arguments);
    };

    return this.on(name, feedback, context);
  }

  /**
   * @method emit
   * @description Emit event
   * @param {string} name
   * @param {any} [...param]
   * @returns {Events}
   */
  emit(name) {
    let pass = true;
    const data = slice.call(arguments, 1);
    const events = this._events || (this._events = {});
    const listeners = events[name] || [];

    // Emit events
    for (let item of listeners) {
      let listener = item[0];
      let context = item[1];

      pass = apply(listener, context, data) !== false && pass;
    }

    // Emit will return false if one of the callbacks return false
    return pass;
  }

  /**
   * @method off
   * @description Remove event
   * @param {string} name
   * @param {Function} listener
   * @param {any} context
   * @returns {Events}
   */
  off(name, listener, context) {
    const length = arguments.length;
    const events = this._events || (this._events = {});

    switch (length) {
      case 0:
        this._events = {};
        break;
      case 1:
        delete events[name];
        break;
      default:
        const listeners = events[name];

        if (listeners) {
          context = length < 3 ? this : context;

          for (let i = 0, len = listeners.length; i < len; i++) {
            let monitor = listeners[i];

            if (monitor[0] === listener && monitor[1] === context) {
              listeners.splice(i, 1);
              break;
            }
          }

          // Remove event from queue to prevent memory leak
          if (!listeners.length) {
            delete events[name];
          }
        }
        break;
    }

    return this;
  }
}

module.exports = Events;
