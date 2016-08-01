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
var util = require('./util');
var Events = require('./events');

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

  this.index = 0;
  this.source = source;
  this.options = util.mix({
    src: '',
    root: '',
    base: '',
    data: {
      dirname: '',
      filename: ''
    }
  }, options);
}

/**
 * extend
 * @type {EventEmitter}
 */
Transform.prototype = Object.create(Events.prototype, {
  constructor: { value: Transform }
});

Transform.prototype.next = function (){

};

// exports
module.exports = Transform;
