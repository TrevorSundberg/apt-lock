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

