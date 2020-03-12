FROM node:10-alpine3.9
RUN mkdir /screeps
WORKDIR /screeps
RUN apk add --no-cache python build-base && \
    python -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip install --upgrade pip setuptools && \
    rm -r /root/.cache

