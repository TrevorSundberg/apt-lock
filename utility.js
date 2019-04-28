const { spawn } = require('child_process');

module.exports.error = message => {
  console.error(`apt-lock: ${message}`);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
};

module.exports.log = message => {
  console.log(`apt-lock: ${message}`);
};

module.exports.sortKeys = unordered => {
  Object.keys(unordered).sort().forEach(key => {
    const value = unordered[key];
    delete unordered[key];
    unordered[key] = value;
  });
};

module.exports.execute = (command, args, options) => {
  return new Promise((resolve, reject) => {
    options = options || {};
    options.stdio = options.stdio || 'pipe';
    const child = spawn(command, args, options);

    const readStream = (stream, chunks) => {
      if (stream) {
        stream.on('data', chunk => chunks.push(chunk));
      }
    };
    const stdoutChunks = [];
    const stderrChunks = [];
    readStream(child.stdout, stdoutChunks);
    readStream(child.stderr, stderrChunks);
    child.on('error', reject);
    child.on('close', e => {
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const stderrBuffer = Buffer.concat(stderrChunks);
      resolve({
        ...e,
        stdout: stdoutBuffer.toString(),
        stderr: stderrBuffer.toString(),
        stdoutBuffer,
        stderrBuffer,
        cmd: `${command} ${args.join(' ')}`
      });
    });
  });
};
