/*!
 * worker
 *
 * Date: 2017/10/19
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/fengine/blob/master/LICENSE
 */

'use strict';

var Fengine = require('./fengine');

// Bootstrap
process.once('message', function(options) {
  new Fengine(options);
});
