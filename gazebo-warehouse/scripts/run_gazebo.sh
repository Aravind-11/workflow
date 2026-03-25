#!/usr/bin/env bash
set -eo pipefail

WORLD_FILE="${WORLD_FILE:-/workspace/worlds/warehouse.world}"
HEADLESS="${HEADLESS:-false}"
HEADLESS_NORMALIZED="$(echo "${HEADLESS}" | tr '[:upper:]' '[:lower:]')"

source /opt/ros/humble/setup.bash

if [[ "${HEADLESS_NORMALIZED}" == "true" || "${HEADLESS_NORMALIZED}" == "1" || "${HEADLESS_NORMALIZED}" == "yes" ]]; then
  echo "Starting Gazebo in headless mode with world: ${WORLD_FILE} (HEADLESS=${HEADLESS})"
  exec gzserver --verbose "${WORLD_FILE}"
else
  echo "Starting Gazebo GUI mode with world: ${WORLD_FILE} (HEADLESS=${HEADLESS})"
  exec gazebo --verbose "${WORLD_FILE}"
fi

