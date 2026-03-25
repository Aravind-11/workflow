#SURVEILLANCE SYSTEM DEFINTION

class Surveillance:
    def __init__(self, cameras: Cameras):
        self.cameras = cameras

    def get_camera_feed(self, cam_id, location):
        return self.cameras.get_camera_feed(cam_id, location)

    def human_behavior_verification(self, human_behavior_score, threshold=0.5):
        return human_behavior_score >= threshold

    def teleop_manager_behavior(self, manager_behavior_score, threshold=0.5):
        return manager_behavior_score >= threshold



class TeleoperatorBehaviorMonitor:
    """Monitors teleoperator behaviour by combining camera feeds,
    command history, and operator profile."""

    def get_move(self, cam_feed, robot_id, warehouse_id, operator_history):
        """
        Analyse feeds + commands and return a risk score between 0 and 1.
        0 = safe, 1 = dangerous.
        Placeholder — real implementation would use ML pipeline.
        """
        # cam_feed: { cam_laptop, cam_robot, cam_warehouse }
        # commands: robot(id).get_command()
        # history:  teleop.get_history(name, location, age)
        # process move (0-1)
        move = 0.0  # placeholder
        return move


class RiskEngine:
    def __init__(self, teleoperator_behavior_monitor: TeleoperatorBehaviorMonitor):
        self.teleoperator_behavior = teleoperator_behavior_monitor

    def teleoperator_risk(self, command, robot_id, warehouse_id,
                          teleoperator, camera_feed):
        move = self.teleoperator_behavior.get_move(
            camera_feed, robot_id, warehouse_id, teleoperator
        )
        score = move  # in practice, combine with other signals
        return {
            "score": score,
            "operator_name": teleoperator,
            "location": None,
            "warehouse_id": warehouse_id,
        }

    def operational_risk(self, commands, camera_feed):
        """Evaluate risk of robot hitting someone using commands & camera."""
        move = self.teleoperator_behavior.get_move(
            camera_feed, None, None, None
        )
        return max(0.0, 1.0 - move)  # operational risk score

    @staticmethod
    def get_risk_level(risk_score):
        if risk_score > 0.8:
            return "High System Alert"
        elif risk_score > 0.4:
            return "Medium System Alert"
        else:
            return "Low System Alert"


# Injury / Detection

def detection_system(camera_feed_robot, camera_feed_warehouse,
                     teleop_raise_injury, risk_engine: RiskEngine):
    """Returns True if an injury event is confirmed."""
    if teleop_raise_injury:
        score = risk_engine.operational_risk(
            None, [camera_feed_robot, camera_feed_warehouse]
        )
        if score <= 1.0 and score > 0.7:
            return True
    return False


def get_injury_events(detection_result, camera_feed_recording):
    """Return camera recording if detection system flagged an event."""
    if detection_result:
        return {"camera_feed_recording": camera_feed_recording}
    return False


def policy_enforcement(teleop_path, policy_path, teleop_raise_injury,
                       risk_engine: RiskEngine,
                       camera_feed_robot, camera_feed_warehouse):
    if teleop_path != policy_path:
        return False
    if teleop_raise_injury:
        score = risk_engine.operational_risk(
            None, [camera_feed_robot, camera_feed_warehouse]
        )
        if score <= 1.0 and score > 0.7:
            return True
    return False