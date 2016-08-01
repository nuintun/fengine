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

var util = require('./util');
var Events = require('./events');

function Transform(source){
  this.index = 0;
  this.source = String(source || '');
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
