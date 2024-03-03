#!/usr/bin/env bash

OUTPUT_DIR=dist
OUTPUT_JSON=$OUTPUT_DIR/api.json
PIC_PORT=8000

rm -rf $OUTPUT_DIR
mkdir -p $OUTPUT_DIR

../pic/pocket-ic --ttl 10 -p $PIC_PORT &
PIC_PID=$!

sleep 1
wget http://127.0.0.1:$PIC_PORT/api.json -O $OUTPUT_JSON

kill $PIC_PID

sudo docker run --rm \
  -v ${PWD}:/local \
  swaggerapi/swagger-codegen-cli-v3 generate \
  -c /local/config.json \
  -i /local/$OUTPUT_JSON \
  -l typescript-fetch \
  -o /local/$OUTPUT_DIR

sudo chown -R $USER:$USER $OUTPUT_DIR
