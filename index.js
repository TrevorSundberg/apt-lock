const fs = require('fs');
const {
  log, error, sortKeys, options
} = require('./utility.js');
const aptValidate = require('./apt.js').validate;

const main = async () => {
  const args = process.argv.slice(2);

  const findAndRemoveArg = (name, defaultValue) => {
    const switchName = `--${name}`;
    const index = args.findIndex(arg => arg.startsWith(switchName));
    if (index !== -1) {
      const arg = args.splice(index, 1)[0];
      return arg.split('=').pop();
    }
    return defaultValue;
  };

  options.silent = findAndRemoveArg('silent', false);
  const lockFilePath = findAndRemoveArg('lock', './apt-lock.json');

  const proc = args.shift();

  if (!proc || proc === '-h' || proc === '-help' || proc === '--help' || proc === '/?') {
    error('Usage: apt-lock [--lock=./apt-lock.json] [--silent] <apt|apt-get> [options] install {packages}');
  }

  let lockFile = {};
  if (fs.existsSync(lockFilePath)) {
    log(`Reading lock file '${lockFilePath}'`);
    try {
      const lockJson = fs.readFileSync(lockFilePath, 'utf8');
      lockFile = JSON.parse(lockJson);
    } catch (err) {
      error(`Unable to read lock file '${lockFilePath}': ${err.message}`);
    }
  }

  const managers = {
    'apt': aptValidate,
    'apt-get': aptValidate,
  };

  if (!managers[proc]) {
    error('The first argument must be a supported package manager: apt, apt-get.');
  }

  const installIndex = args.findIndex(arg => arg === 'install');
  if (installIndex === -1) {
    error('Must be used with the `install` command.');
  }

  const dependencies = lockFile.dependencies = lockFile.dependencies || {};

  const visited = {};
  await managers[proc](proc, args, installIndex, dependencies, visited);

  // Clean out unused entries.
  for (const packageName of Object.keys(dependencies)) {
    if (!visited[packageName]) {
      delete dependencies[packageName];
    }
  }

  sortKeys(dependencies);

  log(`Writing package lock file '${lockFilePath}'`);
  fs.writeFileSync(lockFilePath, JSON.stringify(lockFile, null, 2), 'utf8');
};
main();
