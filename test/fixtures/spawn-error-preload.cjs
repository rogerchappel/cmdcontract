const cp = require('node:child_process');
const original = cp.spawn;
cp.spawn = function (...args) {
  if (typeof args[0] === 'string' && args[1]?.shell === true) {
    const { EventEmitter } = require('node:events');
    const child = new EventEmitter();
    child.stdout = null;
    child.stderr = null;
    child.pid = undefined;
    process.nextTick(() => child.emit('error', Object.assign(new Error('controlled spawn failure'), { code: 'ENOENT' })));
    return child;
  }
  return original.apply(this, args);
};
