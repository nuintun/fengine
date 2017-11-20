/**
 * @module worker
 * @license MIT
 * @version 2017/11/14
 */

'use strict';

const Fengine = require('./fengine');

// Bootstrap
process.once('message', options => {
  new Fengine(options);
});
