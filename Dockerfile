FROM ubuntu:bionic-20190424

# Alternatively install wget or curl to download it or include it in the docker build context.
ADD https://github.com/TrevorSundberg/apt-lock/releases/download/v1.0.1/apt-lock-linux-x64 /usr/local/bin/apt-lock
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