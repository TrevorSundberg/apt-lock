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