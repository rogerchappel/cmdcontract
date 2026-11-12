const childProcess = require('node:child_process');
const originalSpawn = childProcess.spawn;
let injected = false;
childProcess.spawn = function (...args) {
  if (!injected) {
    injected = true;
    throw new Error('controlled synchronous setup failure');
  }
  return originalSpawn.apply(this, args);
};
