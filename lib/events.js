/*!
 * events
 * Version: 0.0.1
 * Date: 2016/8/1
 * https://github.com/Nuintun/fengine
 *
 * Original Author: https://github.com/aralejs/events
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// events
// -----------------
// thanks to:
//  - https://github.com/documentcloud/backbone/blob/master/backbone.js
//  - https://github.com/joyent/node/blob/master/lib/events.js

// Regular expression used to split event strings
var eventSplitter = /\s+/;

// helpers
/**
 * object keys
 * @param object
 * @returns {Array}
 */
var keys = Object.keys ? Object.keys : function (object){
  var result = [];

  for (var name in object) {
    if (object.hasOwnProperty(name)) {
      result.push(name);
    }
  }

  return result;
};

/**
 * execute callbacks
 * @param list
 * @param args
 * @param context
 * @returns {boolean}
 */
function triggerEvents(list, args, context){
  var pass = true;

  if (list) {
    var i = 0;
    var a1 = args[0];
    var a2 = args[1];
    var a3 = args[2];
    var l = list.length;

    // call is faster than apply, optimize less than 3 argu
    // http://blog.csdn.net/zhengyinhui100/article/details/7837127
    switch (args.length) {
      case 0:
        for (; i < l; i += 2) {
          pass = list[i].call(list[i + 1] || context) !== false && pass;
        }
        break;
      case 1:
        for (; i < l; i += 2) {
          pass = list[i].call(list[i + 1] || context, a1) !== false && pass;
        }
        break;
      case 2:
        for (; i < l; i += 2) {
          pass = list[i].call(list[i + 1] || context, a1, a2) !== false && pass;
        }
        break;
      case 3:
        for (; i < l; i += 2) {
          pass = list[i].call(list[i + 1] || context, a1, a2, a3) !== false && pass;
        }
        break;
      default:
        for (; i < l; i += 2) {
          pass = list[i].apply(list[i + 1] || context, args) !== false && pass;
        }
        break;
    }
  }

  // trigger will return false if one of the callbacks return false
  return pass;
}

/**
 * a module that can be mixed in to *any object* in order to provide it
 * with custom events. You may bind with `on` or remove with `off` callback
 * functions to an event; `trigger`-ing an event fires all callbacks in
 * succession.
 *   var object = new Events();
 *   object.on('expand', function(){ alert('expanded'); });
 *   object.trigger('expand');
 * @constructor
 */
function Events(){
  // constructor
}

/**
 * bind one or more space separated events, `events`, to a `callback`
 * function. Passing `"all"` will bind the callback to all events fired.
 * @param events
 * @param callback
 * @param context
 * @returns {Events}
 */
Events.prototype.on = function (events, callback, context){
  var that = this;
  var cache, event, list;

  if (!callback) return that;

  events = events.split(eventSplitter);
  cache = that.__events || (that.__events = {});

  while (event = events.shift()) {
    list = cache[event] || (cache[event] = []);

    list.push(callback, context);
  }

  return that;
};

/**
 * bind a event only emit once
 * @param events
 * @param callback
 * @param context
 */
Events.prototype.once = function (events, callback, context){
  var that = this;

  var cb = function (){
    that.off(events, cb);
    callback.apply(context || that, arguments);
  };

  return that.on(events, cb, context);
};

/**
 * remove one or many callbacks. If `context` is null, removes all callbacks
 * with that function. If `callback` is null, removes all callbacks for the
 * event. If `events` is null, removes all bound callbacks for all events.
 * @param events
 * @param callback
 * @param context
 * @returns {Events}
 */
Events.prototype.off = function (events, callback, context){
  var that = this;
  var cache, event, list, i;

  // no events, or removing *all* events.
  if (!(cache = that.__events)) return that;

  // remove all events
  if (!(events || callback || context)) {
    delete that.__events;

    return that;
  }

  events = events ? events.split(eventSplitter) : keys(cache);

  // loop through the callback list, splicing where appropriate.
  while (event = events.shift()) {
    list = cache[event];

    if (!list) continue;

    if (!(callback || context)) {
      delete cache[event];
      continue;
    }

    for (i = list.length - 2; i >= 0; i -= 2) {
      if (!(callback && list[i] !== callback ||
        context && list[i + 1] !== context)) {
        list.splice(i, 2);
      }
    }
  }

  return that;
};

/**
 * emit one or many events, firing all bound callbacks. Callbacks are
 * passed the same arguments as `trigger` is, apart from the event name
 * (unless you're listening on `"all"`, which will cause your callback to
 * receive the true name of the event as the first argument).
 * @param events
 * @returns {*}
 */
Events.prototype.emit = function (events){
  var rest = [];
  var that = this;
  var returned = true;
  var cache, event, all, list, i, len;

  if (!(cache = that.__events)) return that;

  events = events.split(eventSplitter);

  // fill up `rest` with the callback arguments.  Since we're only copying
  // the tail of `arguments`, a loop is much faster than Array#slice.
  for (i = 1, len = arguments.length; i < len; i++) {
    rest[i - 1] = arguments[i];
  }

  // for each event, walk through the list of callbacks twice, first to
  // trigger the event, then to trigger any `"all"` callbacks.
  while (event = events.shift()) {
    // copy callback lists to prevent modification.
    if (all = cache.all) all = all.slice();

    if (list = cache[event]) list = list.slice();

    // execute event callbacks except one named "all"
    if (event !== 'all') {
      returned = triggerEvents(list, rest, that) && returned;
    }

    // execute "all" callbacks.
    returned = triggerEvents(all, [event].concat(rest), that) && returned;
  }

  return returned;
};

// exports
module.exports = Events;
