"""
Test suite for nventr Warehouse Teleop System.

"""

import time
import pytest

from teleop import (
    Robot, RobotStatus, Driver, Camera, Joystick, Route, Warehouse,
    Geofence, TeleopEvent, EventType, Severity, Permission,
    DegradedAction, EventService, CameraRegistry, JoystickRegistry,
    DriverRegistry, RouteRegistry, FMS, AuthService, RiskEngine,
    PolicyEngine, DegradedModePolicy, CommandRequest, CommandService,
    CameraService, TeleopDashboard, Teleoperation,
    TeleopError, DuplicateError, NotFoundError, ValidationError,
    AuthorizationError, SafetyError, StaleDataError, DegradedModeError,
    _TicketService,
)


# ═══════════════════════════════════════════════════════════════════
#  STUBS
# ═══════════════════════════════════════════════════════════════════

class StubBehaviourMonitor:
    def __init__(self, score=0.1):
        self._score = score
        self.call_count = 0

    def get_score(self, cam_feeds, robot_id, warehouse_id):
        self.call_count += 1
        return self._score


class FailingBehaviourMonitor:
    def get_score(self, cam_feeds, robot_id, warehouse_id):
        raise RuntimeError("monitor unavailable")


# ═══════════════════════════════════════════════════════════════════
#  FIXTURES
# ═══════════════════════════════════════════════════════════════════

@pytest.fixture
def warehouse():
    return Warehouse("WH-01", "London", ["w1"], ["d1"], {}, [])


@pytest.fixture
def robot():
    r = Robot("R-01", "AGV", 100, "WH-01")
    r.start()
    return r


@pytest.fixture
def camera():
    c = Camera("C-01", "dock-a", "wide", "WH-01", "zone-1")
    c.start()
    return c


@pytest.fixture
def joystick():
    js = Joystick("J-01", "WH-01")
    js.connect()
    return js


@pytest.fixture
def events():
    return EventService()


@pytest.fixture
def auth():
    a = AuthService()
    a.register_worker("op1", [
        Permission.TELEOP_VIEW,
        Permission.TELEOP_DRIVE,
        Permission.TELEOP_ADMIN,
        Permission.EMERGENCY_STOP,
    ])
    return a


@pytest.fixture
def session(auth):
    return auth.authenticate("op1", "pass123")


@pytest.fixture
def monitor():
    return StubBehaviourMonitor(0.1)


@pytest.fixture
def risk_engine(monitor):
    return RiskEngine(monitor)


@pytest.fixture
def geofence():
    g = Geofence(["forward", "backward", "left", "right"], "zone-1", "WH-01")
    g.activate()
    return g


@pytest.fixture
def policy_engine(risk_engine, geofence):
    return PolicyEngine(risk_engine, geofence)


@pytest.fixture
def fms(robot):
    f = FMS()
    f.register_robot(robot)
    return f


@pytest.fixture
def degraded(fms, events):
    return DegradedModePolicy(fms, events)


@pytest.fixture
def cam_registry(camera):
    reg = CameraRegistry()
    reg.add(camera)
    return reg


@pytest.fixture
def js_registry(joystick):
    reg = JoystickRegistry()
    reg.add(joystick)
    return reg


@pytest.fixture
def command_service(js_registry, cam_registry, policy_engine, fms,
                    events, auth, degraded):
    log = {}
    return CommandService(
        js_registry, cam_registry, policy_engine, fms,
        events, auth, degraded, log,
    )


#  ROBOT — state machine


class TestRobot:

    def test_born_inactive(self):
        """F1: fresh robot is INACTIVE."""
        r = Robot("R-X", "AGV", 100, "WH-01")
        assert r.robot_status == RobotStatus.INACTIVE

    def test_start_transitions_to_idle(self):
        """F1: start() moves INACTIVE → IDLE."""
        r = Robot("R-X", "AGV", 100, "WH-01")
        r.start()
        assert r.robot_status == RobotStatus.IDLE

    def test_missing_id_raises(self):
        with pytest.raises(ValidationError):
            Robot("", "AGV", 100, "WH-01")

    def test_missing_type_raises(self):
        with pytest.raises(ValidationError):
            Robot("R-X", "", 100, "WH-01")

    def test_missing_warehouse_raises(self):
        with pytest.raises(ValidationError):
            Robot("R-X", "AGV", 100, "")

    @pytest.mark.parametrize("setup,label", [
        (lambda r: None, "IDLE"),
        (lambda r: r.enter_teleop(), "TELEOP"),
        (lambda r: r.enter_autonomous(), "AUTONOMOUS"),
        (lambda r: r.enter_charging(), "CHARGING"),
        (lambda r: (r.enter_teleop(), r.set_fault()), "FAULT"),
    ])
    def test_emergency_stop_from_all_states(self, setup, label):
        """F2: EMERGENCY_STOP reachable from every operational state."""
        r = Robot(f"R-{label}", "AGV", 100, "WH-01")
        r.start()
        setup(r)
        r.stop()
        assert r.robot_status == RobotStatus.EMERGENCY_STOP

    def test_emergency_stop_not_from_inactive(self):
        r = Robot("R-X", "AGV", 100, "WH-01")
        with pytest.raises(ValidationError):
            r.stop()

    def test_invalid_transition_raises(self):
        r = Robot("R-X", "AGV", 100, "WH-01")
        r.start()
        r.enter_teleop()
        with pytest.raises(ValidationError):
            r.enter_charging()

    def test_full_lifecycle(self):
        r = Robot("R-X", "AGV", 100, "WH-01")
        r.start()
        assert r.robot_status == RobotStatus.IDLE
        r.enter_teleop()
        assert r.robot_status == RobotStatus.TELEOP
        r.exit_teleop()
        assert r.robot_status == RobotStatus.IDLE
        r.enter_charging()
        assert r.robot_status == RobotStatus.CHARGING
        r.start()
        assert r.robot_status == RobotStatus.IDLE
        r.set_inactive()
        assert r.robot_status == RobotStatus.INACTIVE

    def test_recovery_from_emergency_stop(self):
        r = Robot("R-X", "AGV", 100, "WH-01")
        r.start()
        r.stop()
        assert r.robot_status == RobotStatus.EMERGENCY_STOP
        r.start()
        assert r.robot_status == RobotStatus.IDLE

    def test_recovery_from_fault(self):
        r = Robot("R-X", "AGV", 100, "WH-01")
        r.start()
        r.enter_teleop()
        r.set_fault()
        assert r.robot_status == RobotStatus.FAULT
        r.start()
        assert r.robot_status == RobotStatus.IDLE

    def test_update_battery(self, robot):
        robot.update_battery(42)
        assert robot.battery_level == 42

    def test_update_position(self, robot):
        robot.update_position({"x": 1, "y": 2})
        assert robot.position == {"x": 1, "y": 2}

    def test_health_check(self, robot):
        hc = robot.health_check()
        assert hc["robot_id"] == "R-01"
        assert hc["robot_status"] == "idle"
        assert hc["checked_at"] is not None


#  DRIVER

class TestDriver:

    def test_creation(self):
        d = Driver("Alice", "HQ", "ID-001", "DL-001")
        assert d.driver_name == "Alice"

    def test_missing_id(self):
        with pytest.raises(ValidationError):
            Driver("Alice", "HQ", "ID-001", "")

    def test_missing_identity(self):
        with pytest.raises(ValidationError):
            Driver("Alice", "HQ", "", "DL-001")

    def test_get_details(self):
        d = Driver("Alice", "HQ", "ID-001", "DL-001")
        details = d.get_driver_details()
        assert details["driver_name"] == "Alice"
        assert details["driver_id"] == "DL-001"


#  CAMERA

class TestCamera:

    def test_starts_offline(self):
        c = Camera("C-X", "dock", "wide", "WH-01")
        assert c.status == "offline"
        assert c.is_feed_fresh() is False

    def test_start_makes_online(self, camera):
        assert camera.status == "online"
        assert camera.feed_url is not None
        assert camera.is_feed_fresh() is True

    def test_stop_makes_offline(self, camera):
        camera.stop()
        assert camera.status == "offline"
        assert camera.feed_url is None
        assert camera.is_feed_fresh() is False

    def test_feed_ttl(self):
        c = Camera("C-X", "dock", "wide", "WH-01")
        c.start()
        c.feed_refreshed_at = time.time() - 60
        assert c.is_feed_fresh() is False

    def test_refresh_feed(self, camera):
        camera.feed_refreshed_at = time.time() - 60
        assert camera.is_feed_fresh() is False
        camera.refresh_feed()
        assert camera.is_feed_fresh() is True

    def test_attach_detach(self):
        c = Camera("C-X", "dock", "wide", "WH-01")
        c.attach("zone-2")
        assert c.zone_id == "zone-2"
        c.detach()
        assert c.zone_id is None

    def test_attach_no_zone_raises(self):
        c = Camera("C-X", "dock", "wide", "WH-01")
        with pytest.raises(ValidationError):
            c.attach("")

    def test_change_zone(self, camera):
        camera.change_zone("zone-1", "zone-2")
        assert camera.zone_id == "zone-2"

    def test_change_zone_wrong_source(self, camera):
        with pytest.raises(ValidationError):
            camera.change_zone("zone-wrong", "zone-2")

    def test_health_check(self, camera):
        hc = camera.health_check()
        assert hc["camera_id"] == "C-01"
        assert hc["status"] == "online"

    def test_missing_id_raises(self):
        with pytest.raises(ValidationError):
            Camera("", "dock", "wide", "WH-01")

    def test_missing_warehouse_raises(self):
        with pytest.raises(ValidationError):
            Camera("C-X", "dock", "wide", "")


#  JOYSTICK

class TestJoystick:

    def test_starts_disconnected(self):
        js = Joystick("J-X", "WH-01")
        assert js.connected is False
        assert js.is_alive() is False

    def test_connect(self, joystick):
        assert joystick.connected is True
        assert joystick.is_alive() is True

    def test_disconnect(self, joystick):
        joystick.disconnect()
        assert joystick.connected is False
        assert joystick.is_alive() is False

    def test_heartbeat_timeout(self):
        js = Joystick("J-X", "WH-01")
        js.connect()
        js.last_heartbeat = time.time() - 10
        assert js.is_alive() is False

    def test_heartbeat_refresh(self):
        js = Joystick("J-X", "WH-01")
        js.connect()
        js.last_heartbeat = time.time() - 10
        js.heartbeat()
        assert js.is_alive() is True

    def test_send_command_alive(self, joystick):
        result = joystick.send_command({"action": "forward"})
        assert result == {"action": "forward"}

    def test_send_command_dead_raises(self):
        js = Joystick("J-X", "WH-01")
        with pytest.raises(SafetyError):
            js.send_command({"action": "forward"})

    def test_health_check(self, joystick):
        hc = joystick.health_check()
        assert hc["joystick_id"] == "J-01"
        assert hc["alive"] is True

    def test_missing_id_raises(self):
        with pytest.raises(ValidationError):
            Joystick("", "WH-01")


#  ROUTE

class TestRoute:

    def test_creation(self):
        r = Route("WH-01", "zone-1", "/path", "/del", "/ret")
        assert r.warehouse_id == "WH-01"
        assert r.zone_id == "zone-1"

    def test_missing_warehouse_raises(self):
        with pytest.raises(ValidationError):
            Route("", "zone-1", "/p", "/d", "/r")

    def test_missing_zone_raises(self):
        with pytest.raises(ValidationError):
            Route("WH-01", "", "/p", "/d", "/r")


#  WAREHOUSE

class TestWarehouse:

    def test_creation(self, warehouse):
        assert warehouse.warehouse_id == "WH-01"

    def test_missing_id_raises(self):
        with pytest.raises(ValidationError):
            Warehouse("", "London", [], [], {}, [])

    def test_missing_location_raises(self):
        with pytest.raises(ValidationError):
            Warehouse("WH-01", "", [], [], {}, [])


#  GEOFENCE

class TestGeofence:

    def test_inactive_raises_safety(self):
        g = Geofence(["forward"], "zone-1", "WH-01")
        with pytest.raises(SafetyError):
            g.is_safe_path("forward")

    def test_safe_path(self, geofence):
        assert geofence.is_safe_path("forward") is True

    def test_unsafe_path(self, geofence):
        assert geofence.is_safe_path("fly") is False

    def test_activate_deactivate(self):
        g = Geofence(["forward"], "zone-1", "WH-01")
        g.activate()
        assert g.active is True
        g.deactivate()
        assert g.active is False

    def test_update_boundary(self, geofence):
        geofence.update_boundary(["up", "down"])
        assert geofence.is_safe_path("up") is True
        assert geofence.is_safe_path("forward") is False

    def test_list_converted_to_set(self):
        g = Geofence(["a", "b", "a"], "zone-1", "WH-01")
        assert len(g.safe_paths) == 2


#  EVENT SERVICE / TELEOP EVENT

class TestEventService:

    def test_emit_and_get(self, events):
        ev = events.emit(EventType.COMMAND_SENT, Severity.INFO,
                         source="test", payload={"k": "v"})
        assert ev.event_type == EventType.COMMAND_SENT
        assert ev.ack_state is False
        retrieved = events.get(ev.event_id)
        assert retrieved is ev

    def test_get_missing_raises(self, events):
        with pytest.raises(NotFoundError):
            events.get("nonexistent")

    def test_acknowledge(self, events):
        ev = events.emit(EventType.TICKET_RAISED, Severity.INFO,
                         source="test")
        ev.acknowledge()
        assert ev.ack_state is True

    def test_invalid_event_type_raises(self):
        with pytest.raises(ValidationError):
            TeleopEvent("not_an_enum", Severity.INFO, "test")

    def test_invalid_severity_raises(self):
        with pytest.raises(ValidationError):
            TeleopEvent(EventType.COMMAND_SENT, "bad", "test")

    def test_missing_source_raises(self):
        with pytest.raises(ValidationError):
            TeleopEvent(EventType.COMMAND_SENT, Severity.INFO, "")

    def test_correlation_id_auto_generated(self, events):
        ev = events.emit(EventType.COMMAND_SENT, Severity.INFO, "test")
        assert ev.correlation_id is not None

    def test_correlation_id_explicit(self, events):
        ev = events.emit(EventType.COMMAND_SENT, Severity.INFO, "test",
                         correlation_id="corr-123")
        assert ev.correlation_id == "corr-123"



#  REGISTRIES — T4 DualIndexStore

class TestCameraRegistry:

    def test_add_and_get(self, camera):
        reg = CameraRegistry()
        reg.add(camera)
        assert reg.get("C-01") is camera

    def test_get_by_warehouse(self, camera):
        reg = CameraRegistry()
        reg.add(camera)
        cams = reg.get_by_warehouse("WH-01")
        assert len(cams) == 1
        assert cams[0] is camera

    def test_get_by_warehouse_empty(self):
        reg = CameraRegistry()
        assert reg.get_by_warehouse("WH-XX") == []

    def test_duplicate_raises(self, camera):
        reg = CameraRegistry()
        reg.add(camera)
        with pytest.raises(DuplicateError):
            reg.add(camera)

    def test_remove(self, camera):
        reg = CameraRegistry()
        reg.add(camera)
        reg.remove("C-01")
        with pytest.raises(NotFoundError):
            reg.get("C-01")

    def test_remove_missing_raises(self):
        reg = CameraRegistry()
        with pytest.raises(NotFoundError):
            reg.remove("C-XX")

    def test_type_validation(self):
        reg = CameraRegistry()
        with pytest.raises(ValidationError):
            reg.add("not a camera")


class TestJoystickRegistry:

    def test_add_and_get(self, joystick):
        reg = JoystickRegistry()
        reg.add(joystick)
        assert reg.get("J-01") is joystick

    def test_duplicate_raises(self, joystick):
        reg = JoystickRegistry()
        reg.add(joystick)
        with pytest.raises(DuplicateError):
            reg.add(joystick)

    def test_remove(self, joystick):
        reg = JoystickRegistry()
        reg.add(joystick)
        reg.remove("J-01")
        with pytest.raises(NotFoundError):
            reg.get("J-01")

    def test_remove_missing_raises(self):
        reg = JoystickRegistry()
        with pytest.raises(NotFoundError):
            reg.remove("J-XX")


class TestDriverRegistry:

    def test_add_and_get(self, warehouse):
        reg = DriverRegistry()
        drv = Driver("Alice", "HQ", "ID-001", "DL-001")
        reg.add(drv, warehouse)
        assert reg.get("DL-001") is drv

    def test_get_by_warehouse(self, warehouse):
        reg = DriverRegistry()
        d1 = Driver("Alice", "HQ", "ID-001", "DL-001")
        d2 = Driver("Bob", "HQ", "ID-002", "DL-002")
        reg.add(d1, warehouse)
        reg.add(d2, warehouse)
        drivers = reg.get_by_warehouse("WH-01")
        assert len(drivers) == 2

    def test_duplicate_raises(self, warehouse):
        reg = DriverRegistry()
        drv = Driver("Alice", "HQ", "ID-001", "DL-001")
        reg.add(drv, warehouse)
        with pytest.raises(DuplicateError):
            reg.add(drv, warehouse)

    def test_remove(self, warehouse):
        reg = DriverRegistry()
        drv = Driver("Alice", "HQ", "ID-001", "DL-001")
        reg.add(drv, warehouse)
        reg.remove("DL-001")
        with pytest.raises(NotFoundError):
            reg.get("DL-001")


class TestRouteRegistry:

    def test_add_and_get(self):
        reg = RouteRegistry()
        rt = Route("WH-01", "zone-1", "/p", "/d", "/r")
        reg.add(rt)
        assert reg.get("WH-01", "zone-1") is rt

    def test_duplicate_raises(self):
        reg = RouteRegistry()
        rt = Route("WH-01", "zone-1", "/p", "/d", "/r")
        reg.add(rt)
        with pytest.raises(DuplicateError):
            reg.add(rt)

    def test_remove(self):
        reg = RouteRegistry()
        rt = Route("WH-01", "zone-1", "/p", "/d", "/r")
        reg.add(rt)
        reg.remove("WH-01", "zone-1")
        with pytest.raises(NotFoundError):
            reg.get("WH-01", "zone-1")

    def test_type_validation(self):
        reg = RouteRegistry()
        with pytest.raises(ValidationError):
            reg.add("not a route")


#  FMS

class TestFMS:

    def test_register_and_get(self, robot):
        f = FMS()
        f.register_robot(robot)
        assert f.get_robot("R-01") is robot

    def test_get_robots(self, robot):
        f = FMS()
        f.register_robot(robot)
        assert len(f.get_robots()) == 1

    def test_duplicate_raises(self, robot):
        f = FMS()
        f.register_robot(robot)
        with pytest.raises(DuplicateError):
            f.register_robot(robot)

    def test_get_missing_raises(self):
        f = FMS()
        with pytest.raises(NotFoundError):
            f.get_robot("R-XX")

    def test_telemetry(self, fms):
        t = fms.get_telemetry("R-01")
        assert t["robot_id"] == "R-01"

    def test_stop(self, fms):
        fms.stop("R-01")
        assert fms.get_robot("R-01").robot_status == RobotStatus.EMERGENCY_STOP

    def test_type_validation(self):
        f = FMS()
        with pytest.raises(ValidationError):
            f.register_robot("not a robot")


#  AUTH SERVICE — T6

class TestAuthService:

    def test_authenticate_returns_session(self, auth):
        sid = auth.authenticate("op1", "pass")
        assert isinstance(sid, str)

    def test_authenticate_unknown_worker(self, auth):
        with pytest.raises(AuthorizationError):
            auth.authenticate("nobody", "pass")

    def test_authenticate_empty_creds(self, auth):
        with pytest.raises(AuthorizationError):
            auth.authenticate("", "")

    def test_authorize_valid(self, auth, session):
        worker = auth.authorize(session, Permission.TELEOP_VIEW)
        assert worker == "op1"

    def test_authorize_invalid_session(self, auth):
        with pytest.raises(AuthorizationError):
            auth.authorize("bad-session", Permission.TELEOP_VIEW)

    def test_authorize_missing_permission(self):
        a = AuthService()
        a.register_worker("viewer", [Permission.TELEOP_VIEW])
        sid = a.authenticate("viewer", "pass")
        with pytest.raises(AuthorizationError):
            a.authorize(sid, Permission.EMERGENCY_STOP)

    def test_end_session(self, auth, session):
        auth.end_session(session)
        with pytest.raises(AuthorizationError):
            auth.authorize(session, Permission.TELEOP_VIEW)

    def test_end_session_idempotent(self, auth, session):
        auth.end_session(session)
        auth.end_session(session)

    def test_register_invalid_permission(self, auth):
        with pytest.raises(ValidationError):
            auth.register_worker("bad", ["not_a_perm"])


#  RISK ENGINE

class TestRiskEngine:

    def test_safe_score(self, risk_engine):
        safe, score = risk_engine.is_command_safe([], "R-01", "WH-01")
        assert safe is True
        assert score == 0.1

    def test_unsafe_score(self):
        m = StubBehaviourMonitor(0.8)
        re = RiskEngine(m)
        safe, score = re.is_command_safe([], "R-01", "WH-01")
        assert safe is False
        assert score == 0.8

    def test_behaviour_alert(self):
        m = StubBehaviourMonitor(0.9)
        re = RiskEngine(m)
        alert, score = re.is_behaviour_alert([], "R-01", "WH-01")
        assert alert is True

    def test_no_behaviour_alert(self, risk_engine):
        alert, score = risk_engine.is_behaviour_alert([], "R-01", "WH-01")
        assert alert is False

    def test_none_monitor_raises(self):
        with pytest.raises(ValidationError):
            RiskEngine(None)


#  POLICY ENGINE

class TestPolicyEngine:

    def test_approved_command(self, policy_engine):
        ok, reason, score = policy_engine.evaluate_command(
            [], "R-01", "WH-01", "zone-1", "forward"
        )
        assert ok is True
        assert reason == "approved"

    def test_blocked_by_geofence(self, policy_engine):
        ok, reason, score = policy_engine.evaluate_command(
            [], "R-01", "WH-01", "zone-1", "fly"
        )
        assert ok is False
        assert "geofence" in reason

    def test_blocked_by_risk(self):
        m = StubBehaviourMonitor(0.9)
        re = RiskEngine(m)
        g = Geofence(["forward"], "zone-1", "WH-01")
        g.activate()
        pe = PolicyEngine(re, g)
        ok, reason, score = pe.evaluate_command(
            [], "R-01", "WH-01", "zone-1", "forward"
        )
        assert ok is False
        assert "risk score" in reason

    def test_precomputed_score(self, policy_engine, monitor):
        monitor.call_count = 0
        ok, reason, score = policy_engine.evaluate_command(
            [], "R-01", "WH-01", "zone-1", "forward",
            precomputed_score=0.05,
        )
        assert ok is True
        assert monitor.call_count == 0

    def test_inactive_geofence(self):
        m = StubBehaviourMonitor(0.1)
        re = RiskEngine(m)
        g = Geofence(["forward"], "zone-1", "WH-01")
        pe = PolicyEngine(re, g)
        ok, reason, score = pe.evaluate_command(
            [], "R-01", "WH-01", "zone-1", "forward"
        )
        assert ok is False
        assert "not active" in reason

    def test_teleop_path_compliant(self, policy_engine):
        ok, msg = policy_engine.evaluate_teleop_path(
            "/a", "/a", [], [], "R-01", "WH-01"
        )
        assert ok is True

    def test_teleop_path_deviation(self, policy_engine):
        ok, msg = policy_engine.evaluate_teleop_path(
            "/a", "/b", [], [], "R-01", "WH-01"
        )
        assert ok is False
        assert "deviates" in msg

    def test_type_validation(self, geofence):
        with pytest.raises(ValidationError):
            PolicyEngine("not_risk_engine", geofence)


#  DEGRADED MODE POLICY — T5, F4

class TestDegradedModePolicy:

    def test_camera_fresh_passes(self, degraded, camera):
        assert degraded.assess_camera(camera) is None

    def test_camera_stale_blocks(self, degraded, events):
        c = Camera("C-X", "dock", "wide", "WH-01")
        c.start()
        c.feed_refreshed_at = time.time() - 60
        action = degraded.assess_camera(c)
        assert action == DegradedAction.BLOCK_COMMAND
        stale_events = [e for e in events._events
                        if e.event_type == EventType.CAMERA_STALE]
        assert len(stale_events) == 1

    def test_joystick_alive_passes(self, degraded, joystick):
        assert degraded.assess_joystick(joystick, "R-01") is None

    def test_joystick_dead_stops_robot(self, degraded, events, fms):
        js = Joystick("J-X", "WH-01")
        action = degraded.assess_joystick(js, "R-01")
        assert action == DegradedAction.STOP_ROBOT
        lost_events = [e for e in events._events
                       if e.event_type == EventType.JOYSTICK_LOST]
        assert len(lost_events) == 1

    def test_risk_engine_healthy_returns_score(self, degraded, risk_engine):
        action, score = degraded.assess_risk_engine(
            risk_engine, [], "R-01", "WH-01"
        )
        assert action is None
        assert score == 0.1

    def test_risk_engine_failure_stops_robot(self, degraded, events):
        bad_re = RiskEngine(FailingBehaviourMonitor())
        action, score = degraded.assess_risk_engine(
            bad_re, [], "R-01", "WH-01"
        )
        assert action == DegradedAction.STOP_ROBOT
        assert score is None
        deg_events = [e for e in events._events
                      if e.event_type == EventType.DEGRADED_MODE]
        assert len(deg_events) == 1


#  COMMAND REQUEST — T3

class TestCommandRequest:

    def test_valid_creation(self):
        cr = CommandRequest("J-01", "R-01", "WH-01", "zone-1",
                            ["C-01"], "forward", "sess-1")
        assert cr.command_id is not None
        assert cr.joystick_id == "J-01"

    def test_explicit_command_id(self):
        cr = CommandRequest("J-01", "R-01", "WH-01", "zone-1",
                            ["C-01"], "forward", "sess-1",
                            command_id="CMD-42")
        assert cr.command_id == "CMD-42"

    @pytest.mark.parametrize("field,args", [
        ("joystick_id", ("", "R", "WH", "z", ["C"], "f", "s")),
        ("robot_id", ("J", "", "WH", "z", ["C"], "f", "s")),
        ("warehouse_id", ("J", "R", "", "z", ["C"], "f", "s")),
        ("zone_id", ("J", "R", "WH", "", ["C"], "f", "s")),
        ("camera_ids", ("J", "R", "WH", "z", [], "f", "s")),
        ("command_path", ("J", "R", "WH", "z", ["C"], "", "s")),
        ("session_id", ("J", "R", "WH", "z", ["C"], "f", "")),
    ])
    def test_missing_field_raises(self, field, args):
        with pytest.raises(ValidationError):
            CommandRequest(*args)


#  COMMAND SERVICE — F3, F4, F5, T6

class TestCommandService:

    def _make_request(self, session, **overrides):
        defaults = {
            "joystick_id": "J-01",
            "robot_id": "R-01",
            "warehouse_id": "WH-01",
            "zone_id": "zone-1",
            "camera_ids": ["C-01"],
            "command_path": "forward",
            "session_id": session,
        }
        defaults.update(overrides)
        return CommandRequest(**defaults)

    def test_send_command_happy_path(self, command_service, session, robot):
        robot.enter_teleop()
        req = self._make_request(session)
        result = command_service.send_command(req)
        assert result["robot_id"] == "R-01"
        assert result["command_id"] == req.command_id

    def test_auth_required(self, command_service):
        req = self._make_request("bad-session")
        with pytest.raises(AuthorizationError):
            command_service.send_command(req)

    def test_view_only_cannot_drive(self, js_registry, cam_registry,
                                     policy_engine, fms, events, degraded):
        a = AuthService()
        a.register_worker("viewer", [Permission.TELEOP_VIEW])
        sid = a.authenticate("viewer", "pass")
        svc = CommandService(
            js_registry, cam_registry, policy_engine, fms,
            events, a, degraded, {},
        )
        req = self._make_request(sid)
        with pytest.raises(AuthorizationError):
            svc.send_command(req)

    def test_cross_warehouse_joystick_rejected(self, cam_registry,
                                                policy_engine, fms,
                                                events, auth, session,
                                                degraded):
        """F3: joystick from different warehouse is rejected."""
        js_other = Joystick("J-OTHER", "WH-OTHER")
        js_other.connect()
        js_reg = JoystickRegistry()
        js_reg.add(js_other)
        svc = CommandService(
            js_reg, cam_registry, policy_engine, fms,
            events, auth, degraded, {},
        )
        req = self._make_request(session, joystick_id="J-OTHER")
        with pytest.raises(ValidationError, match="WH-OTHER"):
            svc.send_command(req)

    def test_cross_warehouse_camera_rejected(self, js_registry,
                                              policy_engine, fms,
                                              events, auth, session,
                                              degraded):
        """F3: camera from different warehouse is rejected."""
        cam_other = Camera("C-OTHER", "dock", "wide", "WH-OTHER", "zone-1")
        cam_other.start()
        cam_reg = CameraRegistry()
        cam_reg.add(cam_other)
        svc = CommandService(
            js_registry, cam_reg, policy_engine, fms,
            events, auth, degraded, {},
        )
        req = self._make_request(session, camera_ids=["C-OTHER"])
        with pytest.raises(ValidationError, match="WH-OTHER"):
            svc.send_command(req)

    def test_single_risk_call(self, command_service, session, robot,
                               monitor):
        """F4: risk engine called exactly once per command."""
        robot.enter_teleop()
        monitor.call_count = 0
        req = self._make_request(session)
        command_service.send_command(req)
        assert monitor.call_count == 1

    def test_idempotency(self, command_service, session, robot):
        """F5: same command_id returns cached result."""
        robot.enter_teleop()
        req1 = self._make_request(session, command_id="CMD-IDEM")
        req2 = self._make_request(session, command_id="CMD-IDEM")
        r1 = command_service.send_command(req1)
        r2 = command_service.send_command(req2)
        assert r1 is r2

    def test_stale_camera_raises_degraded(self, js_registry, policy_engine,
                                           fms, events, auth, session,
                                           degraded):
        stale_cam = Camera("C-STALE", "dock", "wide", "WH-01", "zone-1")
        stale_cam.start()
        stale_cam.feed_refreshed_at = time.time() - 60
        cam_reg = CameraRegistry()
        cam_reg.add(stale_cam)
        svc = CommandService(
            js_registry, cam_reg, policy_engine, fms,
            events, auth, degraded, {},
        )
        req = self._make_request(session, camera_ids=["C-STALE"])
        with pytest.raises(DegradedModeError):
            svc.send_command(req)

    def test_dead_joystick_raises_degraded(self, cam_registry, policy_engine,
                                            fms, events, auth, session,
                                            degraded):
        dead_js = Joystick("J-DEAD", "WH-01")
        js_reg = JoystickRegistry()
        js_reg.add(dead_js)
        svc = CommandService(
            js_reg, cam_registry, policy_engine, fms,
            events, auth, degraded, {},
        )
        req = self._make_request(session, joystick_id="J-DEAD")
        with pytest.raises(DegradedModeError):
            svc.send_command(req)

    def test_unsafe_path_raises_safety(self, command_service, session):
        req = self._make_request(session, command_path="fly")
        with pytest.raises(SafetyError, match="blocked"):
            command_service.send_command(req)

    def test_policy_violation_emits_event(self, command_service, session,
                                          events):
        req = self._make_request(session, command_path="fly")
        try:
            command_service.send_command(req)
        except SafetyError:
            pass
        violations = [e for e in events._events
                      if e.event_type == EventType.POLICY_VIOLATION]
        assert len(violations) == 1

    def test_type_validation(self, command_service):
        with pytest.raises(ValidationError):
            command_service.send_command("not a request")


#  CAMERA SERVICE — F7

class TestCameraService:

    def test_get_feeds(self, cam_registry, events):
        svc = CameraService(cam_registry, events)
        feeds = svc.get_feeds("WH-01")
        assert len(feeds) == 1

    def test_get_feed(self, cam_registry, events):
        svc = CameraService(cam_registry, events)
        cam = svc.get_feed("C-01")
        assert cam.camera_id == "C-01"

    def test_change_zone(self, cam_registry, events, auth, session):
        svc = CameraService(cam_registry, events)
        svc.change_zone("C-01", "zone-1", "zone-2", session, auth)
        assert cam_registry.get("C-01").zone_id == "zone-2"

    def test_change_zone_requires_auth(self, cam_registry, events):
        svc = CameraService(cam_registry, events)
        a = AuthService()
        a.register_worker("v", [Permission.TELEOP_VIEW])
        sid = a.authenticate("v", "p")
        with pytest.raises(AuthorizationError):
            svc.change_zone("C-01", "zone-1", "zone-2", sid, a)

    def test_report_faulty(self, cam_registry, events):
        """F7: EventService injected directly, report_faulty works."""
        svc = CameraService(cam_registry, events)
        svc.report_faulty("C-01")
        faulty = [e for e in events._events
                  if e.event_type == EventType.FAULTY_CAMERA]
        assert len(faulty) == 1

    def test_report_faulty_missing_camera(self, events):
        svc = CameraService(CameraRegistry(), events)
        with pytest.raises(NotFoundError):
            svc.report_faulty("C-XX")


#  TICKET SERVICE — T1

class TestTicketService:

    def test_raise_ticket(self, fms, events, auth, session):
        ts = _TicketService(fms, events, auth)
        ticket = ts.raise_ticket(session, {"info": "test"})
        assert ticket["status"] == "open"
        assert ticket["details"]["info"] == "test"
        raised = [e for e in events._events
                  if e.event_type == EventType.TICKET_RAISED]
        assert len(raised) == 1

    def test_raise_ticket_requires_auth(self, fms, events, auth):
        ts = _TicketService(fms, events, auth)
        with pytest.raises(AuthorizationError):
            ts.raise_ticket("bad-session")

    def test_fault_robot_report(self, fms, events, auth, session, robot):
        robot.enter_teleop()
        ts = _TicketService(fms, events, auth)
        ticket = ts.fault_robot_report(session, "R-01")
        assert robot.robot_status == RobotStatus.FAULT
        assert ticket["details"]["type"] == "fault_robot"
        fault_events = [e for e in events._events
                        if e.event_type == EventType.FAULT_ROBOT]
        assert len(fault_events) == 1

    def test_fault_robot_requires_admin(self, fms, events):
        a = AuthService()
        a.register_worker("viewer", [Permission.TELEOP_VIEW])
        sid = a.authenticate("viewer", "pass")
        ts = _TicketService(fms, events, a)
        with pytest.raises(AuthorizationError):
            ts.fault_robot_report(sid, "R-01")


#  TELEOP DASHBOARD — P1 thin orchestrator

class TestTeleopDashboard:

    @pytest.fixture
    def dashboard(self, command_service, cam_registry, fms, auth,
                  events, session):
        cam_svc = CameraService(cam_registry, events)
        return TeleopDashboard(
            "WH-01", session, command_service, cam_svc,
            fms, auth, events,
        )

    def test_send_command(self, dashboard, robot):
        robot.enter_teleop()
        result = dashboard.send_command(
            "J-01", "R-01", "zone-1", ["C-01"], "forward"
        )
        assert result["robot_id"] == "R-01"

    def test_get_camera_feeds(self, dashboard):
        feeds = dashboard.get_camera_feeds()
        assert len(feeds) == 1

    def test_get_camera_feed(self, dashboard):
        cam = dashboard.get_camera_feed("C-01")
        assert cam.camera_id == "C-01"

    def test_get_telemetry(self, dashboard):
        t = dashboard.get_telemetry("R-01")
        assert t["robot_id"] == "R-01"

    def test_raise_ticket(self, dashboard):
        ticket = dashboard.raise_ticket({"issue": "test"})
        assert ticket["status"] == "open"

    def test_fault_robot_report(self, dashboard, robot):
        robot.enter_teleop()
        ticket = dashboard.fault_robot_report("R-01")
        assert robot.robot_status == RobotStatus.FAULT
        assert ticket["details"]["type"] == "fault_robot"

    def test_report_faulty_camera(self, dashboard, events):
        dashboard.report_faulty_camera("C-01")
        faulty = [e for e in events._events
                  if e.event_type == EventType.FAULTY_CAMERA]
        assert len(faulty) == 1

    def test_change_camera_zone(self, dashboard, cam_registry):
        dashboard.change_camera_zone("C-01", "zone-1", "zone-3")
        assert cam_registry.get("C-01").zone_id == "zone-3"

    def test_missing_warehouse_raises(self, command_service, cam_registry,
                                       fms, auth, events, session):
        cam_svc = CameraService(cam_registry, events)
        with pytest.raises(ValidationError):
            TeleopDashboard(
                "", session, command_service, cam_svc,
                fms, auth, events,
            )


#  TELEOPERATION — T2, F5, F6


class TestTeleoperation:

    @pytest.fixture
    def teleop_system(self, fms, events, cam_registry, js_registry,
                      policy_engine, auth, degraded, warehouse):
        drv_reg = DriverRegistry()
        d1 = Driver("Alice", "HQ", "ID-001", "DL-001")
        d2 = Driver("Bob", "HQ", "ID-002", "DL-002")
        drv_reg.add(d1, warehouse)
        drv_reg.add(d2, warehouse)
        return Teleoperation(
            "WH-01", fms, drv_reg, events, cam_registry,
            js_registry, policy_engine, auth, degraded,
        )

    def test_display_dashboard(self, teleop_system, session, events):
        dash = teleop_system.display_teleops_dashboard(session)
        assert dash is not None
        assert teleop_system.dashboard is dash
        starts = [e for e in events._events
                  if e.event_type == EventType.SESSION_START]
        assert len(starts) >= 1

    def test_display_dashboard_auth_required(self, teleop_system):
        with pytest.raises(AuthorizationError):
            teleop_system.display_teleops_dashboard("bad-session")

    def test_close_dashboard(self, teleop_system, auth, events):
        """F6: SESSION_END emitted, session expired, dashboard cleared."""
        sid = auth.authenticate("op1", "pass")
        teleop_system.display_teleops_dashboard(sid)
        teleop_system.close_dashboard(sid)
        assert teleop_system.dashboard is None
        ends = [e for e in events._events
                if e.event_type == EventType.SESSION_END]
        assert len(ends) >= 1
        with pytest.raises(AuthorizationError):
            auth.authorize(sid, Permission.TELEOP_VIEW)

    def test_shared_command_log(self, teleop_system, auth, robot):
        """F5: idempotency survives across dashboard sessions."""
        robot.enter_teleop()
        s1 = auth.authenticate("op1", "pass")
        dash1 = teleop_system.display_teleops_dashboard(s1)
        r1 = dash1.send_command("J-01", "R-01", "zone-1", ["C-01"],
                                "forward", command_id="CMD-SHARED")

        s2 = auth.authenticate("op1", "pass")
        dash2 = teleop_system.display_teleops_dashboard(s2)
        r2 = dash2.send_command("J-01", "R-01", "zone-1", ["C-01"],
                                "forward", command_id="CMD-SHARED")
        assert r1 is r2

    def test_allocate_teleops_robot(self, teleop_system):
        allocs = teleop_system.allocate_teleops_robot()
        assert len(allocs) == 1
        assert allocs[0]["robot"].robot_id == "R-01"

    def test_get_drivers_list(self, teleop_system):
        drivers = teleop_system.get_drivers_list()
        assert len(drivers) == 2

    def test_update_teleop_robot_add(self, teleop_system, session):
        teleop_system.update_teleop_robot("R-01", session, "add")
        assert "R-01" in teleop_system.teleop_robots

    def test_update_teleop_robot_remove(self, teleop_system, session):
        teleop_system.update_teleop_robot("R-01", session, "add")
        teleop_system.update_teleop_robot("R-01", session, "remove")
        assert "R-01" not in teleop_system.teleop_robots

    def test_update_teleop_robot_duplicate_raises(self, teleop_system,
                                                   session):
        teleop_system.update_teleop_robot("R-01", session, "add")
        with pytest.raises(DuplicateError):
            teleop_system.update_teleop_robot("R-01", session, "add")

    def test_update_teleop_robot_remove_missing_raises(self, teleop_system,
                                                        session):
        with pytest.raises(NotFoundError):
            teleop_system.update_teleop_robot("R-01", session, "remove")

    def test_update_teleop_robot_bad_action(self, teleop_system, session):
        with pytest.raises(ValidationError):
            teleop_system.update_teleop_robot("R-01", session, "fly")

    def test_update_teleop_robot_requires_admin(self, teleop_system):
        a = AuthService()
        a.register_worker("v", [Permission.TELEOP_VIEW])
        sid = a.authenticate("v", "p")
        teleop_system.auth = a
        with pytest.raises(AuthorizationError):
            teleop_system.update_teleop_robot("R-01", sid, "add")

    def test_emergency_stop(self, teleop_system, session, robot, events):
        teleop_system.emergency_stop("R-01", session)
        assert robot.robot_status == RobotStatus.EMERGENCY_STOP
        estop_events = [e for e in events._events
                        if e.event_type == EventType.EMERGENCY_STOP]
        assert len(estop_events) >= 1

    def test_emergency_stop_requires_permission(self, teleop_system):
        a = AuthService()
        a.register_worker("v", [Permission.TELEOP_VIEW])
        sid = a.authenticate("v", "p")
        teleop_system.auth = a
        with pytest.raises(AuthorizationError):
            teleop_system.emergency_stop("R-01", sid)

    def test_missing_warehouse_raises(self, fms, events, cam_registry,
                                       js_registry, policy_engine, auth,
                                       degraded):
        drv_reg = DriverRegistry()
        with pytest.raises(ValidationError):
            Teleoperation(
                "", fms, drv_reg, events, cam_registry,
                js_registry, policy_engine, auth, degraded,
            )
