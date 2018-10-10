#!/bin/sh

if [ -z "${2}" ]; then
    NODE_ARGS=""
else
    NODE_ARGS=${@:2}
fi

echo "Arguments passed to npm script: ${NODE_ARGS}"
cd ../${1} && npm run start -- ${NODE_ARGS}