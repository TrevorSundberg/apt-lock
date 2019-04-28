const { log, error, execute } = require('./utility.js');

module.exports.validate = async (proc, args, installIndex, dependencies, visited) => {
  const installPackages = [];

  // Add package versions if we have them in the lock file.
  for (let i = installIndex + 1; i < args.length; ++i) {
    const arg = args[i];
    // We currently skip packages with specific =versions or :architectures.
    if (!arg.startsWith('-') && !arg.includes('=') && !arg.includes(':')) {
      const packageName = arg;

      installPackages.push(packageName);
      const packageObject = dependencies[packageName];
      if (packageObject) {
        if (packageObject.architecture) {
          args[i] += `:${packageObject.architecture}`;
        }
        if (packageObject.version) {
          args[i] += `=${packageObject.version}`;
        }
        log(`Installing package '${args[i]}'`);
      }
    }
  }

  await execute(proc, args, {
    stdio: 'inherit'
  });

  let validate = null;
  const validateList = async(packages) => {
    //for (const packageName of packages) {
    //  await validate(packageName);
    //}
    await Promise.all(packages.map(packageName => validate(packageName)));
  };

  validate = async(packageName) => {
    if (visited[packageName]) {
      return;
    }
    visited[packageName] = true;

    log(`Validating package '${packageName}'`);
    const packageObject = dependencies[packageName] = dependencies[packageName] || {};
    const policy = await execute('apt-cache', ['policy', packageName]);

    const start = `${packageName}:`;
    if (!policy.stdout.startsWith(start)) {
      error(`Expected '${policy.cmd}' to start with '${start}', instead got '${policy.stdout}'`);
    }

    //  Installed: 2.8.22-1
    const match = /^ {2}Installed: (.*)$/m.exec(policy.stdout);
    if (!match) {
      error(`Could not get installed version for package '${packageName}'`);
    }

    const checkAgainstLock = (packageObjectName, value) => {
      if (value !== undefined) {
        if (packageObject[packageObjectName]) {
          if (value !== packageObject[packageObjectName]) {
            error(`Incorrect installed ${packageObjectName} for package '${packageName}': ` +
            `expected '${packageObject[packageObjectName]}', but the installed was '${value}'`);
          }
        } else {
          packageObject[packageObjectName] = value;
        }
      }
    };

    const version = match[1];
    checkAgainstLock('version', version);
    if (version === '(none)') {
      delete dependencies[packageName];
      return;
    }

    const show = await execute('apt-cache', ['show', `${packageName}=${version}`]);
    const showObject = {};

    //Architecture: amd64
    const showRegex = /^([^ :]+): (.*)$/gm;
    let showMatch;
    while ((showMatch = showRegex.exec(show.stdout))) {
      showObject[showMatch[1]] = showMatch[2];
    }

    const verify = (showName, expectedValue) => {
      if (showObject[showName] !== expectedValue) {
        error(`Expected '${expectedValue}' in ${show.cmd} but got '${showObject[showName]}'`);
      }
    };
    verify('Package', packageName);
    verify('Version', version);

    const pickIntegrity = (name, value) => {
      return value ? `${name}-${Buffer.from(value, 'hex').toString('base64')}` : undefined;
    };

    const integrity =
        pickIntegrity('sha256', showObject.SHA256) ||
        pickIntegrity('sha1', showObject.SHA1) ||
        pickIntegrity('md5', showObject.MD5sum) ||
        pickIntegrity('size', showObject.Size) ||
        pickIntegrity('installsize', showObject['Installed-Size']);

    checkAgainstLock('integrity', integrity);
    checkAgainstLock('architecture', showObject.Architecture);

    const dependsString = [...([showObject['Pre-Depends']] || []), ...([showObject.Depends] || [])].join(', ');
    //libpython-stdlib:any (= 2.7.15~rc1-1)
    const dependsRegex = /([^ ,():|]+)(?::[^ ]+)?(?: \([^)]+\))?/gm;

    let dependsMatch;
    const depends = [];
    while ((dependsMatch = dependsRegex.exec(dependsString))) {
      depends.push(dependsMatch[1]);
    }

    await validateList(depends);
  };

  await validateList(installPackages);
};
