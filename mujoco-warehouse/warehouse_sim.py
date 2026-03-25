"""
Minimal MuJoCo warehouse simulation for macOS.

This demo includes:
- A 3-DOF robotic arm that picks over a pallet zone.
- An AGV proxy moving between waypoints.
- A forklift proxy (mobile base + lift slide) moving between waypoints.
- Pallet boxes laid out in a staging area.

Run:
    mjpython warehouse_sim.py
"""

from __future__ import annotations

import math
import sys
import time

import mujoco
import mujoco.viewer
import numpy as np


WAREHOUSE_XML = """
<mujoco model="warehouse_demo">
  <compiler angle="degree" coordinate="local"/>
  <option timestep="0.005" gravity="0 0 -9.81"/>

  <asset>
    <texture name="ground_tex" type="2d" builtin="checker" rgb1="0.23 0.23 0.23" rgb2="0.17 0.17 0.17" width="256" height="256"/>
    <material name="ground_mat" texture="ground_tex" texrepeat="16 16" reflectance="0.02"/>
    <material name="agv_mat" rgba="0.10 0.52 0.95 1"/>
    <material name="forklift_mat" rgba="1.00 0.62 0.10 1"/>
    <material name="arm_mat" rgba="0.85 0.85 0.88 1"/>
    <material name="pallet_mat" rgba="0.55 0.32 0.20 1"/>
  </asset>

  <worldbody>
    <light pos="0 0 8" dir="0 0 -1"/>
    <geom name="ground" type="plane" size="12 12 0.1" material="ground_mat"/>

    <!-- Racking boundaries -->
    <geom type="box" pos="-4.5 0 0.6" size="0.1 5.5 0.6" rgba="0.35 0.35 0.35 1"/>
    <geom type="box" pos="4.5 0 0.6" size="0.1 5.5 0.6" rgba="0.35 0.35 0.35 1"/>
    <geom type="box" pos="0 -5.5 0.6" size="4.5 0.1 0.6" rgba="0.35 0.35 0.35 1"/>
    <geom type="box" pos="0 5.5 0.6" size="4.5 0.1 0.6" rgba="0.35 0.35 0.35 1"/>

    <!-- Arm station -->
    <body name="arm_station" pos="-2.8 -1.6 0">
      <geom type="cylinder" size="0.30 0.25" pos="0 0 0.25" material="arm_mat"/>
      <body name="arm_link1" pos="0 0 0.5">
        <joint name="arm_j1" type="hinge" axis="0 0 1" range="-170 170" damping="2"/>
        <geom type="capsule" fromto="0 0 0 0.65 0 0" size="0.055" material="arm_mat"/>
        <body name="arm_link2" pos="0.65 0 0">
          <joint name="arm_j2" type="hinge" axis="0 1 0" range="-90 90" damping="2"/>
          <geom type="capsule" fromto="0 0 0 0.55 0 0" size="0.045" material="arm_mat"/>
          <body name="arm_link3" pos="0.55 0 0">
            <joint name="arm_j3" type="hinge" axis="0 1 0" range="-90 90" damping="1.5"/>
            <geom type="capsule" fromto="0 0 0 0.40 0 0" size="0.035" material="arm_mat"/>
            <site name="arm_tool" pos="0.42 0 0" size="0.02" rgba="1 0 0 1"/>
          </body>
        </body>
      </body>
    </body>

    <!-- AGV proxy -->
    <body name="agv" pos="-1.0 2.4 0.18">
      <joint name="agv_x" type="slide" axis="1 0 0" range="-3.8 3.8" damping="8"/>
      <joint name="agv_y" type="slide" axis="0 1 0" range="-4.8 4.8" damping="8"/>
      <joint name="agv_yaw" type="hinge" axis="0 0 1" range="-180 180" damping="2"/>
      <geom type="box" size="0.45 0.30 0.12" material="agv_mat"/>
      <geom type="cylinder" pos="0.28 0.22 -0.08" size="0.07 0.04" rgba="0.05 0.05 0.05 1"/>
      <geom type="cylinder" pos="0.28 -0.22 -0.08" size="0.07 0.04" rgba="0.05 0.05 0.05 1"/>
      <geom type="cylinder" pos="-0.28 0.22 -0.08" size="0.07 0.04" rgba="0.05 0.05 0.05 1"/>
      <geom type="cylinder" pos="-0.28 -0.22 -0.08" size="0.07 0.04" rgba="0.05 0.05 0.05 1"/>
    </body>

    <!-- Forklift proxy -->
    <body name="forklift" pos="1.8 -2.7 0.22">
      <joint name="fork_x" type="slide" axis="1 0 0" range="-3.8 3.8" damping="10"/>
      <joint name="fork_y" type="slide" axis="0 1 0" range="-4.8 4.8" damping="10"/>
      <joint name="fork_yaw" type="hinge" axis="0 0 1" range="-180 180" damping="3"/>
      <geom type="box" size="0.50 0.34 0.14" material="forklift_mat"/>
      <body name="lift_carriage" pos="0.45 0 0.10">
        <joint name="fork_lift" type="slide" axis="0 0 1" range="0 0.90" damping="6"/>
        <geom type="box" size="0.06 0.30 0.35" pos="0 0 0.35" rgba="0.25 0.25 0.25 1"/>
        <geom type="box" size="0.38 0.06 0.02" pos="0.22 0.15 0.02" rgba="0.2 0.2 0.2 1"/>
        <geom type="box" size="0.38 0.06 0.02" pos="0.22 -0.15 0.02" rgba="0.2 0.2 0.2 1"/>
      </body>
    </body>

    <!-- Pallet zone -->
    <geom type="box" pos="-2.0 -3.8 0.03" size="1.2 0.9 0.03" rgba="0.25 0.25 0.25 1"/>
    <body name="pallet_1" pos="-2.5 -3.7 0.08">
      <geom type="box" size="0.24 0.18 0.08" material="pallet_mat"/>
    </body>
    <body name="pallet_2" pos="-1.7 -3.7 0.08">
      <geom type="box" size="0.24 0.18 0.08" material="pallet_mat"/>
    </body>
    <body name="pallet_3" pos="-2.1 -3.2 0.08">
      <geom type="box" size="0.24 0.18 0.08" material="pallet_mat"/>
    </body>
  </worldbody>

  <actuator>
    <!-- Arm -->
    <position name="arm_a1" joint="arm_j1" kp="80"/>
    <position name="arm_a2" joint="arm_j2" kp="60"/>
    <position name="arm_a3" joint="arm_j3" kp="45"/>

    <!-- AGV -->
    <position name="agv_ax" joint="agv_x" kp="140"/>
    <position name="agv_ay" joint="agv_y" kp="140"/>
    <position name="agv_ayaw" joint="agv_yaw" kp="70"/>

    <!-- Forklift -->
    <position name="fork_ax" joint="fork_x" kp="160"/>
    <position name="fork_ay" joint="fork_y" kp="160"/>
    <position name="fork_ayaw" joint="fork_yaw" kp="80"/>
    <position name="fork_alift" joint="fork_lift" kp="120"/>
  </actuator>
</mujoco>
"""


def wrap_angle(angle: float) -> float:
    """Normalize angle to [-pi, pi]."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


class WaypointFollower:
    """Very small helper to move planar robots through XY waypoints."""

    def __init__(self, waypoints: list[tuple[float, float]], tolerance: float = 0.12):
        self._waypoints = waypoints
        self._idx = 0
        self._tol = tolerance

    def target(self) -> tuple[float, float]:
        return self._waypoints[self._idx]

    def advance_if_reached(self, x: float, y: float) -> None:
        tx, ty = self.target()
        if math.hypot(tx - x, ty - y) < self._tol:
            self._idx = (self._idx + 1) % len(self._waypoints)


def main() -> None:
    model = mujoco.MjModel.from_xml_string(WAREHOUSE_XML)
    data = mujoco.MjData(model)

    # Actuator IDs
    aid = {
        "arm1": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "arm_a1"),
        "arm2": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "arm_a2"),
        "arm3": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "arm_a3"),
        "agv_x": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "agv_ax"),
        "agv_y": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "agv_ay"),
        "agv_yaw": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "agv_ayaw"),
        "fork_x": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "fork_ax"),
        "fork_y": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "fork_ay"),
        "fork_yaw": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "fork_ayaw"),
        "fork_lift": mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, "fork_alift"),
    }

    # Joint addresses for reading qpos
    qadr = {
        "agv_x": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "agv_x")],
        "agv_y": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "agv_y")],
        "agv_yaw": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "agv_yaw")],
        "fork_x": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "fork_x")],
        "fork_y": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "fork_y")],
        "fork_yaw": model.jnt_qposadr[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, "fork_yaw")],
    }

    agv_path = WaypointFollower(
        waypoints=[(-1.0, 2.4), (1.8, 2.4), (1.8, 0.8), (-1.0, 0.8)],
        tolerance=0.15,
    )
    forklift_path = WaypointFollower(
        waypoints=[(1.8, -2.7), (-0.3, -2.7), (-0.3, -3.6), (1.8, -3.6)],
        tolerance=0.15,
    )

    t0 = time.time()
    try:
        viewer_ctx = mujoco.viewer.launch_passive(model, data)
    except RuntimeError as exc:
        if "mjpython" in str(exc):
            raise SystemExit(
                "MuJoCo viewer on macOS must be started with mjpython.\n"
                "Try:\n"
                "  source .venv/bin/activate\n"
                "  mjpython warehouse_sim.py\n"
                f"(Current interpreter: {sys.executable})"
            ) from exc
        raise

    with viewer_ctx as viewer:
        viewer.cam.azimuth = 120
        viewer.cam.elevation = -24
        viewer.cam.distance = 9.5
        viewer.cam.lookat[:] = np.array([0.0, -0.4, 0.8])

        while viewer.is_running():
            sim_t = data.time

            # Arm looping pick/place pattern
            data.ctrl[aid["arm1"]] = 0.75 * math.sin(sim_t * 0.55)
            data.ctrl[aid["arm2"]] = -0.85 + 0.45 * math.sin(sim_t * 0.85)
            data.ctrl[aid["arm3"]] = 0.70 + 0.35 * math.cos(sim_t * 1.10)

            # AGV planar tracking
            agv_x = float(data.qpos[qadr["agv_x"]])
            agv_y = float(data.qpos[qadr["agv_y"]])
            agv_yaw = float(data.qpos[qadr["agv_yaw"]])
            agv_path.advance_if_reached(agv_x, agv_y)
            agv_tx, agv_ty = agv_path.target()
            desired_heading = math.atan2(agv_ty - agv_y, agv_tx - agv_x)
            data.ctrl[aid["agv_x"]] = agv_tx
            data.ctrl[aid["agv_y"]] = agv_ty
            data.ctrl[aid["agv_yaw"]] = agv_yaw + 0.55 * wrap_angle(desired_heading - agv_yaw)

            # Forklift planar tracking + lift cycle near pallet zone
            fork_x = float(data.qpos[qadr["fork_x"]])
            fork_y = float(data.qpos[qadr["fork_y"]])
            fork_yaw = float(data.qpos[qadr["fork_yaw"]])
            forklift_path.advance_if_reached(fork_x, fork_y)
            fork_tx, fork_ty = forklift_path.target()
            fork_heading = math.atan2(fork_ty - fork_y, fork_tx - fork_x)
            data.ctrl[aid["fork_x"]] = fork_tx
            data.ctrl[aid["fork_y"]] = fork_ty
            data.ctrl[aid["fork_yaw"]] = fork_yaw + 0.6 * wrap_angle(fork_heading - fork_yaw)

            near_pallet_zone = math.hypot(fork_x + 0.3, fork_y + 3.6) < 0.5
            data.ctrl[aid["fork_lift"]] = 0.62 if near_pallet_zone else 0.10

            # Simulate in small internal steps for smooth real-time rendering.
            for _ in range(4):
                mujoco.mj_step(model, data)

            viewer.sync()

            # Keep near real-time wall-clock speed.
            expected = data.time
            elapsed = time.time() - t0
            if expected > elapsed:
                time.sleep(expected - elapsed)


if __name__ == "__main__":
    main()
