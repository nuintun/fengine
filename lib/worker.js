/**
 * @module worker
 * @license MIT
 * @author nuintun
 */

'use strict';

const Fengine = require('./fengine');

// Bootstrap
process.once('message', options => {
  new Fengine(options);
});
