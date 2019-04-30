# apt-lock
A wrapper around `apt` and `apt-get` that enforces package install determinism. Inspired by `package-lock.json` from npm.
<p align="center">
  <img src="https://trevorsundberg.github.io/apt-lock.gif">
</p>

# usage
`apt-lock apt-get install yourpackage`

>The first run will produce `apt-lock.json` which contains all the installed packages (including dependencies) and their versions and hashes. Subsequent runs will load `apt-lock.json` and append the version string to each package, e.g. `yourpackage:amd64=1.2.3`. Post installation, apt-lock will gather all the dependencies of the installed packages and verify their hash against the first run installation.

`--silent`:

>Suppress output specifically from apt-lock.

`--lock=./apt-lock.json`:

>If you run installs over multiple commands, then you should produce a separate lock file for each:
>
>`apt-lock --lock=./apt-lock-net.json apt-get install net-tools wget curl`
>
>`apt-lock --lock=./apt-lock-script.json apt-get install python lua5.3`

Any extra arguments will be transparently passed through, such as `--yes`, `--no-install-recommends`, etc.

# usage with docker
```dockerfile
FROM ubuntu:bionic-20190424

# Alternatively install wget or curl to download it or include it in the docker build context.
ADD https://github.com/TrevorSundberg/apt-lock/releases/download/v1.0.0/apt-lock-x64 /usr/local/bin/apt-lock
RUN chmod +x /usr/local/bin/apt-lock

# We need the apt-lock.json from our build context.
COPY apt-lock.json .

RUN apt-get update && \
    apt-lock apt-get install -y --no-install-recommends \
    g++ \
    gcc \
    libc6-dev \
    make && \
    rm -rf /var/lib/apt/lists/*

RUN rm /usr/local/bin/apt-lock
```

If the `apt-lock.json` does not exist yet, then the docker `COPY` will fail. In that case we create an empty file:

`touch apt-lock.json`

When we build our image, make sure that `apt-lock.json` in the build directory (the docker build context):

`docker build -t yourimage .`

To ensure that the `apt-lock.json` file persists between runs if anything changes, we need to copy it out of the container after building. To do this we create a temporary container and utilize `cat` as our entrypoint:

`docker run --rm --entrypoint cat yourimage /apt-lock.json > ./apt-lock.json`

Now if you run build the image again:

`docker build -t yourimage .`

You should see apt-lock installing specific deterministic versions that it read from the last install:

`apt-lock: Installing package 'g++:amd64=4:7.3.0-3ubuntu2.1'`

Note that running `apt-get update` no longer breaks determinism because the `apt-lock.json` will be preserved between runs. If you delete `apt-lock.json`, it will be as if you did a brand new updated installation.

# limitations
- Currently skips checking for packages whose version or architecture were manually specified.
- Many command line parameters that affect the installations are not tested (e.g. `-s`, `--print-uris`).
- Written in Node.js and packaged into an executable with nexe, so it's huge. Sorry it's not written in C.

# future work
- Get it working with alpine's `apk` so we can use it in alpine docker images.
- Rewrite in C or C++ to make it considerably smaller.
