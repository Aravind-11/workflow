#EVENTS, TICKETS AND LOGGING

class Events:
    def __init__(self):
        self.robot_repair_events = []
        self.camera_feed_loss_events = []
        self.emergency_stop_events = []
        self.teleops_behavior_events = []

    def report_robot_repair(self, details):
        self.robot_repair_events.append(details)

    def camera_feed_loss_event(self, details):
        self.camera_feed_loss_events.append(details)

    def emergency_stop_event(self, details):
        self.emergency_stop_events.append(details)

    def teleop_behavior_event(self, risk_engine: "RiskEngine",
                              command, robot_id, warehouse_id,
                              teleoperator, camera_feed, threshold=0.5):
        score = risk_engine.teleoperator_risk(
            command, robot_id, warehouse_id, teleoperator, camera_feed
        )
        if score["score"] > threshold:
            self.teleops_behavior_events.append({
                "type": "teleoperator_risk",
                **score,
            })
            return True
        return False