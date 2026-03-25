# MuJoCo Warehouse Demo

This folder contains a local, macOS-friendly warehouse simulation starter using MuJoCo.

## What is simulated

- 3-DOF robotic arm station
- AGV proxy (mobile cart)
- Forklift proxy (mobile base + lift joint)
- Pallet zone with box loads

## Run

1. Create and activate a virtual environment (recommended):

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start simulation:

   ```bash
   mjpython warehouse_sim.py
   ```

## Notes

- This is a starter scene intended for workflow validation and behavior logic.
- You can replace proxy robots with your own MuJoCo XML models later.
