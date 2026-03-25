FROM osrf/ros:humble-desktop

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    gazebo \
    gazebo-common \
    gazebo-plugin-base \
    ros-humble-gazebo-ros-pkgs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

