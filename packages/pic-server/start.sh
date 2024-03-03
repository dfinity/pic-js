#!/usr/bin/env bash

./build.sh

OUTPUT_DIR=dist
OUTPUT_JSON=$OUTPUT_DIR/api.json

sudo docker run --rm \
  -v ${PWD}:/local \
  -e SWAGGER_JSON=/local/$OUTPUT_JSON \
  -p 8000:8080 \
  swaggerapi/swagger-ui
