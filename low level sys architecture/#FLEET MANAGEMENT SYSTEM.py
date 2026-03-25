#FLEET MANAGEMENT SYSTEM

class FMS:

    def __init__(self):
        self.robots: dict[str, dict] = {}

    def add_robot(self, robot_id, status="active"):
        self.robots[robot_id] = {"id": robot_id, "status": status, "telemetry": {}}

    def get_robots(self):
        return list(self.robots.values())

    def get_telemetry(self, robot_id):
        robot = self.robots.get(robot_id)
        return robot["telemetry"] if robot else None

    def robot_inactive(self, robot_id):
        if robot_id in self.robots:
            self.robots[robot_id]["status"] = "inactive"

    def stop_robot(self, robot_id):
        if robot_id in self.robots:
            self.robots[robot_id]["status"] = "stopped"

