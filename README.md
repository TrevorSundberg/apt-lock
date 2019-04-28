# apt-lock
A wrapper around `apt` and `apt-get` that enforces package install determinism. Inspired by `package-lock.json` from npm.

# usage
`apt-lock apt-get install yourpackage`

The first run will produce `apt-lock.json` which contains all the installed packages (including dependencies) and their versions and hashes. Subsequent runs will load `apt-lock.json` and append the version string to each package, e.g. `yourpackage:amd64=1.2.3`. Post installation, apt-lock will gather all the dependencies of the installed packages and verify their hash against the first run installation.

Any extra arguments will be transparently passed through, such as `--yes`, `--no-install-recommends`, etc.

If you run installs over multiple commands, then you should produce a separate lock file for each:

`apt-lock --lock=./apt-lock-net.json apt-get install net-tools wget curl`

`apt-lock --lock=./apt-lock-script.json apt-get install python lua5.3`

# usage with docker
*This documentation is tentative and is awaiting the 1.0.0 release.*

To ensure that the `apt-lock.json` file persists between runs, you must mount it with:

`docker run -v /path/to/apt-lock.json:/home/apt-lock.json yourimage`

```dockerfile
FROM ubuntu:bionic-20190424

RUN wget -O /usr/local/bin/apt-lock https://github.com/TrevorSundberg/apt-lock/releases/download/v1.0.0/apt-lock_1.0.0_amd64
RUN chmod +x /usr/local/bin/apt-lock

RUN apt-get update && \
    apt-lock apt-get install -y --no-install-recommends \
    g++ \
    gcc \
    libc6-dev \
    make && \
    rm -rf /var/lib/apt/lists/*

RUN rm /usr/local/bin/apt-lock
```

Note that running `apt-get update` no longer breaks determinism because the `apt-lock.json` will be preserved between runs. If you delete `apt-lock.json`, it will be as if you did a brand new updated installation.

# limitations
- Currently skips checking for packages whose version or architecture were manually specified.
- Many command line parameters that affect the installations are not tested (e.g. `-s`, `--print-uris`).
