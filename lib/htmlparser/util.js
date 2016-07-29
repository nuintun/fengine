/*!
 * viewport
 * Version: 0.0.1
 * Date: 2016/7/29
 * https://github.com/Nuintun/fengine
 *
 * Original Author: http://www.jsbug.com/lab/samples/viewport/
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/Nuintun/fengine/blob/master/LICENSE
 */

'use strict';

// object to sting
var toString = Object.prototype.toString;

module.exports = {
  /**
   * merge
   * @param target
   * @param source
   */
  merge: function merge(target, source){
    for (var name in source) {
      if (!source.hasOwnProperty(name)) continue;

      var value = source[name];

      if (target[name] && typeof value === 'object' && value instanceof RegExp === false) {
        merge(target[name], value);
      } else {
        target[name] = value;
      }
    }
  },
  type: function (value){
    // get real type
    var type = toString.call(value).toLowerCase();

    type = type.replace(/\[object (.+)\]/, '$1').toLowerCase();

    // nan and infinity
    if (type === 'number') {
      // nan
      if (value !== value) {
        return 'nan';
      }

      // infinity
      if (value === Infinity || value === -Infinity) {
        return 'infinity';
      }
    }

    // return type
    return type;
  }
};
