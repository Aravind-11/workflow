"""
nventr Warehouse Teleop System — Full Rebuild

"""

import time
import uuid
import logging
import threading
from enum import Enum

logger = logging.getLogger("teleop")


#  EXCEPTIONS


class TeleopError(Exception):
    pass

class DuplicateError(TeleopError):
    pass

class NotFoundError(TeleopError):
    pass

class ValidationError(TeleopError):
    pass

class AuthorizationError(TeleopError):
    pass

class SafetyError(TeleopError):
    pass

class StaleDataError(TeleopError):
    pass

class DegradedModeError(TeleopError):
    pass


#  ENUMS

class RobotStatus(Enum):
    IDLE = "idle"
    AUTONOMOUS = "autonomous"
    TELEOP = "teleop"
    CHARGING = "charging"
    FAULT = "fault"
    INACTIVE = "inactive"
    EMERGENCY_STOP = "emergency_stop"


class EventType(Enum):
    COMMAND_SENT = "command_sent"
    EMERGENCY_STOP = "emergency_stop"
    FAULT_ROBOT = "fault_robot"
    FAULTY_CAMERA = "faulty_camera"
    TELEOP_BEHAVIOUR_ALERT = "teleop_behaviour_alert"
    TICKET_RAISED = "ticket_raised"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    AUTH_FAILURE = "auth_failure"
    POLICY_VIOLATION = "policy_violation"
    DEGRADED_MODE = "degraded_mode"
    JOYSTICK_LOST = "joystick_lost"
    CAMERA_STALE = "camera_stale"
    AUTO_STOP = "auto_stop"


class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class Permission(Enum):
    TELEOP_VIEW = "teleop_view"
    TELEOP_DRIVE = "teleop_drive"
    TELEOP_ADMIN = "teleop_admin"
    EMERGENCY_STOP = "emergency_stop"


class DegradedAction(Enum):
    STOP_ROBOT = "stop_robot"
    REDUCE_SPEED = "reduce_speed"
    QUEUE_RETRY = "queue_retry"
    ALERT_OPERATOR = "alert_operator"
    BLOCK_COMMAND = "block_command"


#  WAREHOUSE

class Warehouse:

    def __init__(self, warehouse_id, warehouse_location, workers,
                 deliveries, schedule, retrieval):
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")
        if not warehouse_location:
            raise ValidationError("warehouse_location is required")

        self.warehouse_id = warehouse_id
        self.warehouse_location = warehouse_location
        self.workers = workers
        self.deliveries = deliveries
        self.schedule = schedule
        self.retrieval = retrieval


#  [F1/F2] ROBOT — state machine with INACTIVE birth + universal e-stop

class Robot:

    VALID_TRANSITIONS = {
        RobotStatus.IDLE: {
            RobotStatus.AUTONOMOUS, RobotStatus.TELEOP,
            RobotStatus.CHARGING, RobotStatus.INACTIVE,
            RobotStatus.EMERGENCY_STOP,
        },
        RobotStatus.AUTONOMOUS: {
            RobotStatus.IDLE, RobotStatus.FAULT,
            RobotStatus.EMERGENCY_STOP,
        },
        RobotStatus.TELEOP: {
            RobotStatus.IDLE, RobotStatus.FAULT,
            RobotStatus.EMERGENCY_STOP,
        },
        RobotStatus.CHARGING: {
            RobotStatus.IDLE, RobotStatus.FAULT,
            RobotStatus.EMERGENCY_STOP,
        },
        RobotStatus.FAULT: {
            RobotStatus.IDLE, RobotStatus.INACTIVE,
            RobotStatus.EMERGENCY_STOP,
        },
        RobotStatus.INACTIVE: {
            RobotStatus.IDLE,
        },
        RobotStatus.EMERGENCY_STOP: {
            RobotStatus.IDLE, RobotStatus.INACTIVE,
        },
    }

    def __init__(self, robot_id, robot_type, battery_level,
                 warehouse_id):
        if not robot_id:
            raise ValidationError("robot_id is required")
        if not robot_type:
            raise ValidationError("robot_type is required")
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.robot_id = robot_id
        self.robot_type = robot_type
        self.battery_level = battery_level
        self.warehouse_id = warehouse_id
        self.robot_status = RobotStatus.INACTIVE
        self.position = {}
        self.last_health_check = None
        self.last_command_time = None

    def _transition(self, new_status):
        allowed = self.VALID_TRANSITIONS.get(self.robot_status, set())
        if new_status not in allowed:
            raise ValidationError(
                f"robot {self.robot_id}: cannot transition "
                f"{self.robot_status.value} → {new_status.value}"
            )
        old = self.robot_status
        self.robot_status = new_status
        logger.info(
            f"robot {self.robot_id}: {old.value} → {new_status.value}"
        )

    def start(self):
        self._transition(RobotStatus.IDLE)

    def stop(self):
        self._transition(RobotStatus.EMERGENCY_STOP)

    def enter_teleop(self):
        self._transition(RobotStatus.TELEOP)

    def exit_teleop(self):
        self._transition(RobotStatus.IDLE)

    def enter_autonomous(self):
        self._transition(RobotStatus.AUTONOMOUS)

    def enter_charging(self):
        self._transition(RobotStatus.CHARGING)

    def set_fault(self):
        self._transition(RobotStatus.FAULT)

    def set_inactive(self):
        self._transition(RobotStatus.INACTIVE)

    def update_battery(self, battery_level):
        self.battery_level = battery_level

    def update_position(self, position_data):
        self.position = position_data

    def health_check(self):
        self.last_health_check = time.time()
        return {
            "robot_id": self.robot_id,
            "robot_status": self.robot_status.value,
            "battery_level": self.battery_level,
            "position": self.position,
            "checked_at": self.last_health_check,
        }


#  DRIVER

class Driver:

    def __init__(self, driver_name, driver_location, identity_id,
                 driver_id):
        if not driver_id:
            raise ValidationError("driver_id is required")
        if not identity_id:
            raise ValidationError("identity_id is required")

        self.driver_name = driver_name
        self.driver_location = driver_location
        self.identity_id = identity_id
        self.driver_id = driver_id

    def get_driver_details(self):
        return {
            "driver_name": self.driver_name,
            "driver_location": self.driver_location,
            "identity_id": self.identity_id,
            "driver_id": self.driver_id,
        }


#  CAMERA — infrastructure with lifecycle + feed TTL

class Camera:

    FEED_TTL_SECONDS = 30

    def __init__(self, camera_id, camera_location, camera_type,
                 warehouse_id, zone_id=None):
        if not camera_id:
            raise ValidationError("camera_id is required")
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.camera_id = camera_id
        self.camera_location = camera_location
        self.camera_type = camera_type
        self.warehouse_id = warehouse_id
        self.zone_id = zone_id
        self.status = "offline"
        self.feed_url = None
        self.feed_refreshed_at = None
        self.last_health_check = None

    def start(self):
        self.status = "online"
        self.feed_url = f"rtsp://warehouse-cams/{self.camera_id}/live"
        self.feed_refreshed_at = time.time()

    def stop(self):
        self.status = "offline"
        self.feed_url = None
        self.feed_refreshed_at = None

    def health_check(self):
        self.last_health_check = time.time()
        return {
            "camera_id": self.camera_id,
            "status": self.status,
            "feed_fresh": self.is_feed_fresh(),
            "checked_at": self.last_health_check,
        }

    def is_feed_fresh(self):
        if not self.feed_refreshed_at:
            return False
        return (time.time() - self.feed_refreshed_at) < self.FEED_TTL_SECONDS

    def refresh_feed(self):
        self.feed_refreshed_at = time.time()

    def attach(self, zone_id):
        if not zone_id:
            raise ValidationError("zone_id required")
        self.zone_id = zone_id

    def detach(self):
        self.zone_id = None

    def change_zone(self, from_zone, to_zone):
        if self.zone_id != from_zone:
            raise ValidationError(
                f"camera {self.camera_id} in zone {self.zone_id}, not {from_zone}"
            )
        self.zone_id = to_zone


#  JOYSTICK — infrastructure with heartbeat

class Joystick:

    HEARTBEAT_TIMEOUT = 5

    def __init__(self, joystick_id, warehouse_id):
        if not joystick_id:
            raise ValidationError("joystick_id is required")
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.joystick_id = joystick_id
        self.warehouse_id = warehouse_id
        self.connected = False
        self.last_heartbeat = None

    def connect(self):
        self.connected = True
        self.last_heartbeat = time.time()

    def disconnect(self):
        self.connected = False

    def heartbeat(self):
        self.last_heartbeat = time.time()

    def is_alive(self):
        if not self.connected or not self.last_heartbeat:
            return False
        return (time.time() - self.last_heartbeat) < self.HEARTBEAT_TIMEOUT

    def health_check(self):
        return {
            "joystick_id": self.joystick_id,
            "connected": self.connected,
            "alive": self.is_alive(),
            "last_heartbeat": self.last_heartbeat,
        }

    def send_command(self, command):
        if not self.is_alive():
            raise SafetyError(f"joystick {self.joystick_id} not alive")
        return command


#  ROUTE

class Route:

    def __init__(self, warehouse_id, zone_id, route_path,
                 delivery_route, retrieval_route):
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")
        if not zone_id:
            raise ValidationError("zone_id is required")

        self.warehouse_id = warehouse_id
        self.zone_id = zone_id
        self.route_path = route_path
        self.delivery_route = delivery_route
        self.retrieval_route = retrieval_route


#  GEOFENCE

class Geofence:

    def __init__(self, safe_paths, zone_id, warehouse_id):
        if not zone_id:
            raise ValidationError("zone_id is required")
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.safe_paths = set(safe_paths) if isinstance(safe_paths, list) else safe_paths
        self.zone_id = zone_id
        self.warehouse_id = warehouse_id
        self.active = False

    def activate(self):
        self.active = True

    def deactivate(self):
        self.active = False

    def update_boundary(self, new_safe_paths):
        self.safe_paths = set(new_safe_paths)

    def is_safe_path(self, command):
        if not self.active:
            raise SafetyError(f"geofence zone={self.zone_id} not active")
        return command in self.safe_paths


#  TYPED EVENT MODEL


class TeleopEvent:

    def __init__(self, event_type, severity, source, payload=None,
                 correlation_id=None):
        if not isinstance(event_type, EventType):
            raise ValidationError("event_type must be EventType enum")
        if not isinstance(severity, Severity):
            raise ValidationError("severity must be Severity enum")
        if not source:
            raise ValidationError("source is required")

        self.event_id = str(uuid.uuid4())
        self.event_type = event_type
        self.severity = severity
        self.source = source
        self.payload = payload or {}
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.timestamp = time.time()
        self.ack_state = False

    def acknowledge(self):
        self.ack_state = True


class EventService:

    def __init__(self):
        self._events = []
        self._by_id = {}

    def emit(self, event_type, severity, source, payload=None,
             correlation_id=None):
        ev = TeleopEvent(event_type, severity, source, payload,
                         correlation_id)
        self._events.append(ev)
        self._by_id[ev.event_id] = ev
        logger.info(
            f"EVENT [{ev.severity.value}] {ev.event_type.value} "
            f"from {ev.source}: {ev.payload}"
        )
        return ev

    def get(self, event_id):
        ev = self._by_id.get(event_id)
        if not ev:
            raise NotFoundError(f"event {event_id} not found")
        return ev


#  [T4] DUAL INDEX STORE — base class for atomic add/remove

class DualIndexStore:

    def __init__(self):
        self._lock = threading.Lock()
        self._by_id = {}
        self._by_group = {}

    def _get_primary_key(self, entity):
        raise NotImplementedError

    def _get_group_key(self, entity):
        raise NotImplementedError

    def _add(self, entity):
        pk = self._get_primary_key(entity)
        gk = self._get_group_key(entity)
        with self._lock:
            if pk in self._by_id:
                raise DuplicateError(f"{pk} already exists")
            self._by_id[pk] = entity
            try:
                if gk not in self._by_group:
                    self._by_group[gk] = set()
                self._by_group[gk].add(pk)
            except Exception:
                del self._by_id[pk]
                raise

    def _remove(self, pk):
        with self._lock:
            entity = self._by_id.get(pk)
            if not entity:
                raise NotFoundError(f"{pk} not found")
            gk = self._get_group_key(entity)
            backup_entity = self._by_id.pop(pk)
            try:
                self._by_group.get(gk, set()).discard(pk)
            except Exception:
                self._by_id[pk] = backup_entity
                raise

    def _get(self, pk):
        entity = self._by_id.get(pk)
        if not entity:
            raise NotFoundError(f"{pk} not found")
        return entity

    def _get_by_group(self, gk):
        pks = self._by_group.get(gk, set())
        return [self._by_id[pk] for pk in pks if pk in self._by_id]


#  REGISTRIES

class CameraRegistry(DualIndexStore):

    def _get_primary_key(self, entity):
        return entity.camera_id

    def _get_group_key(self, entity):
        return entity.warehouse_id

    def add(self, cam):
        if not isinstance(cam, Camera):
            raise ValidationError("expected Camera instance")
        self._add(cam)

    def remove(self, camera_id):
        self._remove(camera_id)

    def get(self, camera_id):
        return self._get(camera_id)

    def get_by_warehouse(self, warehouse_id):
        return self._get_by_group(warehouse_id)


class JoystickRegistry:

    def __init__(self):
        self._by_id = {}

    def add(self, js):
        if not isinstance(js, Joystick):
            raise ValidationError("expected Joystick instance")
        if js.joystick_id in self._by_id:
            raise DuplicateError(f"joystick {js.joystick_id} already exists")
        self._by_id[js.joystick_id] = js

    def remove(self, joystick_id):
        if joystick_id not in self._by_id:
            raise NotFoundError(f"joystick {joystick_id} not found")
        del self._by_id[joystick_id]

    def get(self, joystick_id):
        js = self._by_id.get(joystick_id)
        if not js:
            raise NotFoundError(f"joystick {joystick_id} not found")
        return js


class DriverRegistry(DualIndexStore):

    def _get_primary_key(self, entity):
        return entity["driver_id"]

    def _get_group_key(self, entity):
        return entity["warehouse_id"]

    def add(self, drv, wh):
        if not isinstance(drv, Driver):
            raise ValidationError("expected Driver instance")
        if not isinstance(wh, Warehouse):
            raise ValidationError("expected Warehouse instance")
        entry = {
            "driver_id": drv.driver_id,
            "warehouse_id": wh.warehouse_id,
            "driver": drv,
            "warehouse": wh,
        }
        self._add(entry)

    def remove(self, driver_id):
        self._remove(driver_id)

    def get(self, driver_id):
        return self._get(driver_id)["driver"]

    def get_by_warehouse(self, warehouse_id):
        entries = self._get_by_group(warehouse_id)
        return [e["driver"] for e in entries]


class RouteRegistry:

    def __init__(self):
        self._by_key = {}

    def add(self, rt):
        if not isinstance(rt, Route):
            raise ValidationError("expected Route instance")
        key = (rt.warehouse_id, rt.zone_id)
        if key in self._by_key:
            raise DuplicateError(f"route already exists for {key}")
        self._by_key[key] = rt

    def get(self, warehouse_id, zone_id):
        rt = self._by_key.get((warehouse_id, zone_id))
        if not rt:
            raise NotFoundError(f"no route for {warehouse_id}/{zone_id}")
        return rt

    def remove(self, warehouse_id, zone_id):
        key = (warehouse_id, zone_id)
        if key not in self._by_key:
            raise NotFoundError(f"no route for {key}")
        del self._by_key[key]


#  FMS — holds Robot objects

class FMS:

    def __init__(self):
        self._robots = {}

    def register_robot(self, robot):
        if not isinstance(robot, Robot):
            raise ValidationError("expected Robot instance")
        if robot.robot_id in self._robots:
            raise DuplicateError(f"robot {robot.robot_id} already registered")
        self._robots[robot.robot_id] = robot

    def get_robots(self):
        return list(self._robots.values())

    def get_robot(self, robot_id):
        robot = self._robots.get(robot_id)
        if not robot:
            raise NotFoundError(f"robot {robot_id} not found")
        return robot

    def get_telemetry(self, robot_id):
        return self.get_robot(robot_id).health_check()

    def stop(self, robot_id):
        self.get_robot(robot_id).stop()


#  AUTH SERVICE

class AuthService:

    def __init__(self):
        self._permissions = {}
        self._sessions = {}

    def register_worker(self, worker_id, permissions):
        perms = set()
        for p in permissions:
            if not isinstance(p, Permission):
                raise ValidationError(f"invalid permission: {p}")
            perms.add(p)
        self._permissions[worker_id] = perms

    def authenticate(self, worker_id, credential):
        if not worker_id or not credential:
            raise AuthorizationError("invalid credentials")
        if worker_id not in self._permissions:
            raise AuthorizationError(f"worker {worker_id} not registered")
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = worker_id
        return session_id

    def authorize(self, session_id, required_permission):
        worker_id = self._sessions.get(session_id)
        if not worker_id:
            raise AuthorizationError("invalid or expired session")
        perms = self._permissions.get(worker_id, set())
        if required_permission not in perms:
            raise AuthorizationError(
                f"worker {worker_id} lacks {required_permission.value}"
            )
        return worker_id

    def end_session(self, session_id):
        self._sessions.pop(session_id, None)


#  RISK ENGINE — single source of truth for all risk math

class RiskEngine:

    SAFE_THRESHOLD = 0.3
    BEHAVIOUR_ALERT_THRESHOLD = 0.7

    def __init__(self, teleoperator_behaviour_monitor):
        if teleoperator_behaviour_monitor is None:
            raise ValidationError("teleoperator_behaviour_monitor required")
        self.teleoperator_behaviour = teleoperator_behaviour_monitor

    def assess_command_risk(self, camera_feeds, robot_id, warehouse_id):
        return self.teleoperator_behaviour.get_score(
            camera_feeds, robot_id, warehouse_id
        )

    def is_command_safe(self, camera_feeds, robot_id, warehouse_id):
        score = self.assess_command_risk(camera_feeds, robot_id, warehouse_id)
        return score <= self.SAFE_THRESHOLD, score

    def is_behaviour_alert(self, camera_feeds, robot_id, warehouse_id):
        score = self.assess_command_risk(camera_feeds, robot_id, warehouse_id)
        return score > self.BEHAVIOUR_ALERT_THRESHOLD, score


#  POLICY ENGINE — delegates risk math to RiskEngine

class PolicyEngine:

    def __init__(self, risk_engine, geofence):
        if not isinstance(risk_engine, RiskEngine):
            raise ValidationError("expected RiskEngine instance")
        self.risk_engine = risk_engine
        self.geofence = geofence

    def evaluate_command(self, camera_feeds, robot_id, warehouse_id,
                         zone_id, command_path, precomputed_score=None):
        """
        [F4] Accepts optional precomputed_score to avoid duplicate
        risk engine calls when DegradedModePolicy already scored.
        """
        try:
            path_safe = self.geofence.is_safe_path(command_path)
        except SafetyError as e:
            return False, str(e), 1.0

        if not path_safe:
            return False, "path outside geofence safe zone", 1.0

        if precomputed_score is not None:
            score = precomputed_score
            safe = score <= self.risk_engine.SAFE_THRESHOLD
        else:
            safe, score = self.risk_engine.is_command_safe(
                camera_feeds, robot_id, warehouse_id
            )

        if not safe:
            return False, f"risk score {score} exceeds threshold", score

        return True, "approved", score

    def evaluate_teleop_path(self, teleop_path, policy_path,
                              camera_feeds_robot, camera_feeds_warehouse,
                              robot_id, warehouse_id):
        if teleop_path != policy_path:
            return False, "teleop path deviates from policy path"

        alert, score = self.risk_engine.is_behaviour_alert(
            camera_feeds_robot + camera_feeds_warehouse,
            robot_id, warehouse_id
        )
        if alert:
            return True, f"path compliant but high risk score {score}"
        return True, "path compliant and safe"


#  [T5/F4] DEGRADED MODE POLICY — returns risk score for downstream

class DegradedModePolicy:

    def __init__(self, fms, event_service):
        self.fms = fms
        self.events = event_service

    def assess_camera(self, camera):
        if not camera.is_feed_fresh():
            self.events.emit(
                EventType.CAMERA_STALE, Severity.WARNING,
                source="DegradedModePolicy",
                payload={"camera_id": camera.camera_id},
            )
            return DegradedAction.BLOCK_COMMAND
        return None

    def assess_joystick(self, joystick, robot_id):
        if not joystick.is_alive():
            self.events.emit(
                EventType.JOYSTICK_LOST, Severity.CRITICAL,
                source="DegradedModePolicy",
                payload={
                    "joystick_id": joystick.joystick_id,
                    "robot_id": robot_id,
                },
            )
            try:
                self.fms.stop(robot_id)
                self.events.emit(
                    EventType.AUTO_STOP, Severity.EMERGENCY,
                    source="DegradedModePolicy",
                    payload={"robot_id": robot_id,
                             "reason": "joystick lost"},
                )
            except Exception:
                pass
            return DegradedAction.STOP_ROBOT
        return None

    def assess_risk_engine(self, risk_engine, camera_feeds,
                            robot_id, warehouse_id):
        """
        [F4] Returns (action_or_none, risk_score). The score is passed
        downstream to PolicyEngine so it doesn't re-run risk math.
        """
        try:
            score = risk_engine.assess_command_risk(
                camera_feeds, robot_id, warehouse_id
            )
            return None, score
        except Exception:
            self.events.emit(
                EventType.DEGRADED_MODE, Severity.EMERGENCY,
                source="DegradedModePolicy",
                payload={"robot_id": robot_id,
                         "reason": "risk engine unreachable"},
            )
            try:
                self.fms.stop(robot_id)
            except Exception:
                pass
            return DegradedAction.STOP_ROBOT, None


#  [T3] COMMAND REQUEST — value object replaces 7 primitives


class CommandRequest:

    def __init__(self, joystick_id, robot_id, warehouse_id, zone_id,
                 camera_ids, command_path, session_id,
                 command_id=None):
        if not joystick_id:
            raise ValidationError("joystick_id is required")
        if not robot_id:
            raise ValidationError("robot_id is required")
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")
        if not zone_id:
            raise ValidationError("zone_id is required")
        if not camera_ids or len(camera_ids) == 0:
            raise ValidationError("at least one camera_id is required")
        if not command_path:
            raise ValidationError("command_path is required")
        if not session_id:
            raise ValidationError("session_id is required")

        self.command_id = command_id or str(uuid.uuid4())
        self.joystick_id = joystick_id
        self.robot_id = robot_id
        self.warehouse_id = warehouse_id
        self.zone_id = zone_id
        self.camera_ids = camera_ids
        self.command_path = command_path
        self.session_id = session_id
        self.created_at = time.time()


#  COMMAND SERVICE — [T6] auth, [T5/F3/F4] degraded + warehouse guard

class CommandService:

    def __init__(self, joystick_registry, camera_registry,
                 policy_engine, fms, event_service, auth_service,
                 degraded_policy, command_log):
        self.joysticks = joystick_registry
        self.cameras = camera_registry
        self.policy = policy_engine
        self.fms = fms
        self.events = event_service
        self.auth = auth_service
        self.degraded = degraded_policy
        self._command_log = command_log

    def send_command(self, request):
        if not isinstance(request, CommandRequest):
            raise ValidationError("expected CommandRequest instance")

        self.auth.authorize(request.session_id, Permission.TELEOP_DRIVE)

        if request.command_id in self._command_log:
            return self._command_log[request.command_id]

        # [T5] degraded mode — joystick
        js = self.joysticks.get(request.joystick_id)
        js_action = self.degraded.assess_joystick(js, request.robot_id)
        if js_action:
            raise DegradedModeError(
                f"joystick degraded: action={js_action.value}"
            )

        # [F3] cross-warehouse consistency
        if js.warehouse_id != request.warehouse_id:
            raise ValidationError(
                f"joystick {js.joystick_id} belongs to warehouse "
                f"{js.warehouse_id}, not {request.warehouse_id}"
            )

        # [T5] degraded mode — cameras + [F3] warehouse guard
        cam_feeds = []
        for cid in request.camera_ids:
            cam = self.cameras.get(cid)
            if cam.warehouse_id != request.warehouse_id:
                raise ValidationError(
                    f"camera {cid} belongs to warehouse "
                    f"{cam.warehouse_id}, not {request.warehouse_id}"
                )
            cam_action = self.degraded.assess_camera(cam)
            if cam_action:
                raise DegradedModeError(
                    f"camera {cid} degraded: action={cam_action.value}"
                )
            cam_feeds.append(cam)

        # [F4] single risk call — degraded policy scores, passes to policy
        risk_action, risk_score = self.degraded.assess_risk_engine(
            self.policy.risk_engine, cam_feeds,
            request.robot_id, request.warehouse_id
        )
        if risk_action:
            raise DegradedModeError(
                f"risk engine degraded: action={risk_action.value}"
            )

        # policy check with precomputed score (no duplicate risk call)
        allowed, reason, score = self.policy.evaluate_command(
            cam_feeds, request.robot_id, request.warehouse_id,
            request.zone_id, request.command_path,
            precomputed_score=risk_score,
        )
        if not allowed:
            self.events.emit(
                EventType.POLICY_VIOLATION, Severity.WARNING,
                source="CommandService",
                payload={
                    "command_id": request.command_id,
                    "robot_id": request.robot_id,
                    "reason": reason,
                    "risk_score": score,
                },
            )
            raise SafetyError(f"command blocked: {reason}")

        cmd_result = {
            "command_id": request.command_id,
            "robot_id": request.robot_id,
            "joystick_id": request.joystick_id,
            "zone_id": request.zone_id,
            "risk_score": score,
            "timestamp": time.time(),
        }
        result = js.send_command(cmd_result)
        self._command_log[request.command_id] = result

        self.events.emit(
            EventType.COMMAND_SENT, Severity.INFO,
            source="CommandService",
            payload=cmd_result,
        )
        return result


#  [F7] CAMERA SERVICE — EventService injected directly

class CameraService:

    def __init__(self, camera_registry, event_service):
        self.cameras = camera_registry
        self.events = event_service

    def get_feeds(self, warehouse_id):
        return self.cameras.get_by_warehouse(warehouse_id)

    def get_feed(self, camera_id):
        return self.cameras.get(camera_id)

    def change_zone(self, camera_id, from_zone, to_zone, session_id,
                     auth_service):
        auth_service.authorize(session_id, Permission.TELEOP_DRIVE)
        cam = self.cameras.get(camera_id)
        cam.change_zone(from_zone, to_zone)

    def report_faulty(self, camera_id):
        self.cameras.get(camera_id)
        self.events.emit(
            EventType.FAULTY_CAMERA, Severity.CRITICAL,
            source="CameraService",
            payload={"camera_id": camera_id},
        )


#  [T1] TICKET SERVICE — private to TeleopDashboard


class _TicketService:

    def __init__(self, fms, event_service, auth_service):
        self.fms = fms
        self.events = event_service
        self.auth = auth_service
        self._tickets = {}

    def raise_ticket(self, session_id, details=None):
        self.auth.authorize(session_id, Permission.TELEOP_VIEW)
        ticket = {
            "ticket_id": str(uuid.uuid4()),
            "details": details or {},
            "timestamp": time.time(),
            "status": "open",
        }
        self._tickets[ticket["ticket_id"]] = ticket
        self.events.emit(
            EventType.TICKET_RAISED, Severity.INFO,
            source="TicketService",
            payload=ticket,
        )
        return ticket

    def fault_robot_report(self, session_id, robot_id):
        self.auth.authorize(session_id, Permission.TELEOP_ADMIN)
        robot = self.fms.get_robot(robot_id)
        robot.set_fault()
        self.events.emit(
            EventType.FAULT_ROBOT, Severity.CRITICAL,
            source="TicketService",
            payload={"robot_id": robot_id},
        )
        return self.raise_ticket(
            session_id,
            {"type": "fault_robot", "robot_id": robot_id},
        )


#  [T1] TELEOP DASHBOARD — thin orchestrator


class TeleopDashboard:

    def __init__(self, warehouse_id, session_id, command_service,
                 camera_service, fms, auth_service, event_service):
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.warehouse_id = warehouse_id
        self.session_id = session_id
        self.commands = command_service
        self.camera = camera_service
        self.fms = fms
        self.auth = auth_service
        self.events = event_service
        self._tickets = _TicketService(fms, event_service, auth_service)

    def send_command(self, joystick_id, robot_id, zone_id,
                     camera_ids, command_path, command_id=None):
        request = CommandRequest(
            joystick_id=joystick_id,
            robot_id=robot_id,
            warehouse_id=self.warehouse_id,
            zone_id=zone_id,
            camera_ids=camera_ids,
            command_path=command_path,
            session_id=self.session_id,
            command_id=command_id,
        )
        return self.commands.send_command(request)

    def get_camera_feeds(self):
        return self.camera.get_feeds(self.warehouse_id)

    def get_camera_feed(self, camera_id):
        return self.camera.get_feed(camera_id)

    def change_camera_zone(self, camera_id, from_zone, to_zone):
        self.camera.change_zone(
            camera_id, from_zone, to_zone,
            self.session_id, self.auth,
        )

    def get_telemetry(self, robot_id):
        return self.fms.get_telemetry(robot_id)

    def raise_ticket(self, details=None):
        return self._tickets.raise_ticket(self.session_id, details)

    def fault_robot_report(self, robot_id):
        return self._tickets.fault_robot_report(self.session_id, robot_id)

    def report_faulty_camera(self, camera_id):
        self.camera.report_faulty(camera_id)


#  [T2/F5/F6] TELEOPERATION — top-level entry point
#  PolicyEngine injected, shared command log, session teardown

class Teleoperation:

    def __init__(self, warehouse_id, fms, driver_registry,
                 event_service, camera_registry, joystick_registry,
                 policy_engine, auth_service, degraded_policy):
        if not warehouse_id:
            raise ValidationError("warehouse_id is required")

        self.warehouse_id = warehouse_id
        self.fms = fms
        self.drivers = driver_registry
        self.events = event_service
        self.cameras = camera_registry
        self.joysticks = joystick_registry
        self.policy = policy_engine
        self.auth = auth_service
        self.degraded = degraded_policy
        self.teleop_robots = set()
        self.dashboard = None
        self._active_session_id = None
        self._shared_command_log = {}

    def allocate_teleops_robot(self):
        robot_list = self.fms.get_robots()
        driver_list = self.drivers.get_by_warehouse(self.warehouse_id)
        allocation = []
        for i, drv in enumerate(driver_list):
            if i < len(robot_list):
                allocation.append({"driver": drv, "robot": robot_list[i]})
        return allocation

    def display_teleops_dashboard(self, session_id):
        worker_id = self.auth.authorize(
            session_id, Permission.TELEOP_VIEW
        )
        self.events.emit(
            EventType.SESSION_START, Severity.INFO,
            source="Teleoperation",
            payload={"worker_id": worker_id,
                     "warehouse_id": self.warehouse_id},
        )
        self._active_session_id = session_id

        command_svc = CommandService(
            self.joysticks, self.cameras, self.policy,
            self.fms, self.events, self.auth, self.degraded,
            self._shared_command_log,
        )
        camera_svc = CameraService(self.cameras, self.events)

        self.dashboard = TeleopDashboard(
            warehouse_id=self.warehouse_id,
            session_id=session_id,
            command_service=command_svc,
            camera_service=camera_svc,
            fms=self.fms,
            auth_service=self.auth,
            event_service=self.events,
        )
        return self.dashboard

    def close_dashboard(self, session_id):
        """[F6] Emit SESSION_END and tear down the auth session."""
        worker_id = self.auth.authorize(
            session_id, Permission.TELEOP_VIEW
        )
        self.events.emit(
            EventType.SESSION_END, Severity.INFO,
            source="Teleoperation",
            payload={"worker_id": worker_id,
                     "warehouse_id": self.warehouse_id},
        )
        self.auth.end_session(session_id)
        self._active_session_id = None
        self.dashboard = None

    def update_teleop_robot(self, robot_id, session_id, action="add"):
        self.auth.authorize(session_id, Permission.TELEOP_ADMIN)
        self.fms.get_robot(robot_id)
        if action == "add":
            if robot_id in self.teleop_robots:
                raise DuplicateError(f"robot {robot_id} already in pool")
            self.teleop_robots.add(robot_id)
        elif action == "remove":
            if robot_id not in self.teleop_robots:
                raise NotFoundError(f"robot {robot_id} not in pool")
            self.teleop_robots.discard(robot_id)
        else:
            raise ValidationError(f"unknown action: {action}")

    def get_drivers_list(self):
        return self.drivers.get_by_warehouse(self.warehouse_id)

    def emergency_stop(self, robot_id, session_id):
        self.auth.authorize(session_id, Permission.EMERGENCY_STOP)
        self.fms.stop(robot_id)
        self.events.emit(
            EventType.EMERGENCY_STOP, Severity.EMERGENCY,
            source="Teleoperation",
            payload={"robot_id": robot_id,
                     "warehouse_id": self.warehouse_id},
        )

