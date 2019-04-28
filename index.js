const fs = require('fs');
const { log, error, sortKeys } = require('./utility.js');
const aptValidate = require('./apt.js').validate;

const main = async () => {
  const proc = process.argv[2];
  const args = process.argv.slice(3);

  if (!proc || proc === '-h' || proc === '-help' || proc === '--help' || proc === '/?') {
    error('Usage: apt-lock <apt|apt-get> [--lock=./apt-lock.json] [options] install {packages}');
  }

  let lockFilePath = './apt-lock.json';
  const lockFileSwitch = '--lock=';
  const lockFileArg = args.find(arg => arg.startsWith(lockFileSwitch));
  if (lockFileArg) {
    lockFilePath = lockFileArg.slice(lockFileSwitch.length);
  }

  let lockFile = {};
  if (fs.existsSync(lockFilePath)) {
    const lockJson = fs.readFileSync(lockFilePath, 'utf8');
    try {
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
