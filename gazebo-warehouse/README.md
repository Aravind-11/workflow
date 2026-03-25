# Gazebo Warehouse Starter (macOS + Docker)

This starter gives you a warehouse simulation baseline on a MacBook using Docker.

## What this includes

- `docker-compose.yml` to run Gazebo in a container
- A starter warehouse world at `worlds/warehouse.world`
- A launcher script with GUI/headless modes

## Prerequisites

- Docker Desktop
- XQuartz (only if you want Gazebo GUI on macOS)

## Quick start (headless, default)

```bash
cd gazebo-warehouse
docker compose up --build
```

This validates physics/server startup without GUI forwarding issues.
In headless mode, you may still see harmless ALSA/OpenAL warnings about audio devices inside Docker.

## GUI mode on macOS

1. Open XQuartz and allow network clients.
2. In a macOS terminal:

   ```bash
   xhost + 127.0.0.1
   ```

3. Run:

   ```bash
   cd gazebo-warehouse
   DISPLAY=host.docker.internal:0 docker compose --profile gui up --build gazebo-gui
   ```

## Stop

```bash
docker compose down
```

## Notes

- This uses Gazebo Classic in ROS 2 Humble for compatibility and easier setup in Docker.
- Once this is running, the next step is replacing placeholders with real URDF/SDF robot models (AGV, forklift, robotic arm) and adding controllers/navigation.

