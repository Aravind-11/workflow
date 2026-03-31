"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Button } from "@/components/ui/button";

type BotId = "bot-alpha" | "bot-bravo" | "bot-charlie";

type BotConfig = {
  id: BotId;
  label: string;
  color: string;
  position: [number, number, number];
};

type BotSceneState = {
  mesh: THREE.Group;
  patrolIndex: number;
};

const FLOOR_WIDTH = 32;
const FLOOR_DEPTH = 20;
const WALL_HEIGHT = 2.8;
const MIN_X = -FLOOR_WIDTH / 2 + 0.8;
const MAX_X = FLOOR_WIDTH / 2 - 0.8;
const MIN_Z = -FLOOR_DEPTH / 2 + 0.8;
const MAX_Z = FLOOR_DEPTH / 2 - 0.8;

const BOT_CONFIG: BotConfig[] = [
  { id: "bot-alpha", label: "Bot Alpha", color: "#0ea5e9", position: [-11, 0.45, 6] },
  { id: "bot-bravo", label: "Bot Bravo", color: "#22c55e", position: [-3, 0.45, -2] },
  { id: "bot-charlie", label: "Bot Charlie", color: "#f97316", position: [8, 0.45, 4] },
];

const PATROL_POINTS: Array<[number, number, number]> = [
  [-12, 0.45, 7],
  [-3, 0.45, 7],
  [8, 0.45, 2],
  [11, 0.45, -6],
  [-3, 0.45, -8],
];

function clampBotPosition(pos: THREE.Vector3) {
  pos.x = Math.max(MIN_X, Math.min(MAX_X, pos.x));
  pos.z = Math.max(MIN_Z, Math.min(MAX_Z, pos.z));
}

function makeBot(color: string) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.5, 32),
    new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.4 }),
  );
  body.position.y = 0.25;

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.3, roughness: 0.45 }),
  );
  top.position.y = 0.62;

  const heading = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.2, roughness: 0.7 }),
  );
  heading.rotation.x = Math.PI / 2;
  heading.position.set(0, 0.45, 0.62);

  const group = new THREE.Group();
  group.add(body, top, heading);
  group.castShadow = true;
  group.userData = { baseColor: color };

  return group;
}

export function Warehouse3DVisualizer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const botStateRef = useRef<Record<BotId, BotSceneState>>({} as Record<BotId, BotSceneState>);
  const keyStateRef = useRef({ forward: false, backward: false, left: false, right: false });
  const selectedBotRef = useRef<BotId>("bot-alpha");
  const patrolRef = useRef(false);
  const speedRef = useRef(3);
  const [selectedBot, setSelectedBot] = useState<BotId>("bot-alpha");
  const [patrolEnabled, setPatrolEnabled] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [botPositions, setBotPositions] = useState<Record<BotId, [number, number]>>({
    "bot-alpha": [-11, 6],
    "bot-bravo": [-3, -2],
    "bot-charlie": [8, 4],
  });

  useEffect(() => {
    selectedBotRef.current = selectedBot;
  }, [selectedBot]);

  useEffect(() => {
    patrolRef.current = patrolEnabled;
  }, [patrolEnabled]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const selectedPosition = useMemo(() => botPositions[selectedBot], [botPositions, selectedBot]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f1f5f9");

    const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 200);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 8;
    controls.maxDistance = 55;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight("#ffffff", 0.65);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight("#ffffff", 0.75);
    dir.position.set(10, 18, 12);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    const floorTexture = new THREE.TextureLoader().load("/floorplans/warehouse-main-plan.png");
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.wrapS = THREE.ClampToEdgeWrapping;
    floorTexture.wrapT = THREE.ClampToEdgeWrapping;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_WIDTH, FLOOR_DEPTH),
      new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.88, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(FLOOR_WIDTH, 32, "#94a3b8", "#cbd5e1");
    grid.position.y = 0.01;
    scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.8, metalness: 0.1 });
    const rackMaterial = new THREE.MeshStandardMaterial({ color: "#10b981", roughness: 0.5, metalness: 0.2 });

    const addWall = (x: number, z: number, w: number, d: number, h = WALL_HEIGHT) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
      wall.position.set(x, h / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    };

    const addRack = (x: number, z: number, w: number, d: number, h = 1.9) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rackMaterial);
      rack.position.set(x, h / 2, z);
      rack.castShadow = true;
      rack.receiveShadow = true;
      scene.add(rack);
    };

    // Outer perimeter.
    addWall(0, -FLOOR_DEPTH / 2, FLOOR_WIDTH, 0.35);
    addWall(0, FLOOR_DEPTH / 2, FLOOR_WIDTH, 0.35);
    addWall(-FLOOR_WIDTH / 2, 0, 0.35, FLOOR_DEPTH);
    addWall(FLOOR_WIDTH / 2, 0, 0.35, FLOOR_DEPTH);

    // Main room partitions approximated from provided 2D plan.
    addWall(-8.1, 4.4, 0.3, 10.5);
    addWall(1.4, 4.5, 0.3, 10.5);
    addWall(7.1, 4.5, 0.3, 10.5);
    addWall(-4.1, 1.8, 13.2, 0.3);
    addWall(7.4, -0.9, 0.3, 6.2);
    addWall(1.8, -5.6, 12.0, 0.3);

    // Storage and product racks.
    addRack(10.8, 6.8, 3, 0.8);
    addRack(10.8, 4.6, 3, 0.8);
    addRack(10.8, 2.4, 3, 0.8);
    addRack(10.8, 0.2, 3, 0.8);
    addRack(10.8, -2.0, 3, 0.8);
    addRack(10.8, -4.2, 3, 0.8);
    addRack(-2.8, 8.1, 2.4, 0.8);
    addRack(0.3, 8.1, 2.4, 0.8);

    const botStates: Record<BotId, BotSceneState> = {} as Record<BotId, BotSceneState>;
    for (const bot of BOT_CONFIG) {
      const mesh = makeBot(bot.color);
      mesh.position.set(bot.position[0], bot.position[1], bot.position[2]);
      scene.add(mesh);
      botStates[bot.id] = { mesh, patrolIndex: 0 };
    }
    botStateRef.current = botStates;

    const setSelectionStyle = () => {
      for (const bot of BOT_CONFIG) {
        const state = botStateRef.current[bot.id];
        if (!state) continue;
        state.mesh.scale.setScalar(bot.id === selectedBotRef.current ? 1.1 : 1);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "w" || event.key === "ArrowUp") keyStateRef.current.forward = true;
      if (event.key === "s" || event.key === "ArrowDown") keyStateRef.current.backward = true;
      if (event.key === "a" || event.key === "ArrowLeft") keyStateRef.current.left = true;
      if (event.key === "d" || event.key === "ArrowRight") keyStateRef.current.right = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "w" || event.key === "ArrowUp") keyStateRef.current.forward = false;
      if (event.key === "s" || event.key === "ArrowDown") keyStateRef.current.backward = false;
      if (event.key === "a" || event.key === "ArrowLeft") keyStateRef.current.left = false;
      if (event.key === "d" || event.key === "ArrowRight") keyStateRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    setSelectionStyle();

    const clock = new THREE.Clock();
    let rafId = 0;
    let uiTime = 0;

    const animate = () => {
      const dt = clock.getDelta();
      const moveDirection = new THREE.Vector3(
        Number(keyStateRef.current.right) - Number(keyStateRef.current.left),
        0,
        Number(keyStateRef.current.backward) - Number(keyStateRef.current.forward),
      );

      const selectedState = botStateRef.current[selectedBotRef.current];
      if (selectedState) {
        if (moveDirection.lengthSq() > 0) {
          moveDirection.normalize().multiplyScalar(speedRef.current * dt);
          selectedState.mesh.position.add(moveDirection);
          clampBotPosition(selectedState.mesh.position);
          selectedState.mesh.lookAt(selectedState.mesh.position.clone().add(moveDirection));
        } else if (patrolRef.current) {
          const patrolTarget = PATROL_POINTS[selectedState.patrolIndex] ?? PATROL_POINTS[0];
          const targetPos = new THREE.Vector3(...patrolTarget);
          const toward = targetPos.sub(selectedState.mesh.position);
          if (toward.length() < 0.25) {
            selectedState.patrolIndex = (selectedState.patrolIndex + 1) % PATROL_POINTS.length;
          } else {
            toward.normalize().multiplyScalar(Math.max(1.2, speedRef.current * 0.8) * dt);
            selectedState.mesh.position.add(toward);
            clampBotPosition(selectedState.mesh.position);
            selectedState.mesh.lookAt(selectedState.mesh.position.clone().add(toward));
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);

      uiTime += dt;
      if (uiTime > 0.2) {
        uiTime = 0;
        setBotPositions({
          "bot-alpha": [botStateRef.current["bot-alpha"].mesh.position.x, botStateRef.current["bot-alpha"].mesh.position.z],
          "bot-bravo": [botStateRef.current["bot-bravo"].mesh.position.x, botStateRef.current["bot-bravo"].mesh.position.z],
          "bot-charlie": [botStateRef.current["bot-charlie"].mesh.position.x, botStateRef.current["bot-charlie"].mesh.position.z],
        });
        setSelectionStyle();
      }

      rafId = window.requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(host);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      controls.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  function moveSelectedBot(dx: number, dz: number) {
    const state = botStateRef.current[selectedBot];
    if (!state) return;
    state.mesh.position.x += dx;
    state.mesh.position.z += dz;
    clampBotPosition(state.mesh.position);
    state.mesh.lookAt(state.mesh.position.clone().add(new THREE.Vector3(dx, 0, dz)));
    setBotPositions((prev) => ({
      ...prev,
      [selectedBot]: [state.mesh.position.x, state.mesh.position.z],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">3D Warehouse Plan + Bot Control</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Use mouse drag to orbit the camera. Use WASD/arrow keys or the controls below to drive the selected bot.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div
          ref={mountRef}
          className="h-[68vh] min-h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-navy-border dark:bg-navy"
        />

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bots</h4>
            {BOT_CONFIG.map((bot) => (
              <label key={bot.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-navy-border">
                <span>{bot.label}</span>
                <input
                  type="radio"
                  name="selectedBot"
                  checked={selectedBot === bot.id}
                  onChange={() => setSelectedBot(bot.id)}
                />
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Manual controls</h4>
            <div className="grid grid-cols-3 gap-2">
              <span />
              <Button size="sm" variant="outline" onClick={() => moveSelectedBot(0, -0.7)}>
                Up
              </Button>
              <span />
              <Button size="sm" variant="outline" onClick={() => moveSelectedBot(-0.7, 0)}>
                Left
              </Button>
              <Button size="sm" variant="outline" onClick={() => moveSelectedBot(0, 0.7)}>
                Down
              </Button>
              <Button size="sm" variant="outline" onClick={() => moveSelectedBot(0.7, 0)}>
                Right
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Automation</h4>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-navy-border">
              <span>Patrol mode</span>
              <input type="checkbox" checked={patrolEnabled} onChange={(e) => setPatrolEnabled(e.target.checked)} />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Speed ({speed.toFixed(1)} m/s)
            </label>
            <input
              type="range"
              min={1}
              max={6}
              step={0.2}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-navy dark:text-slate-300">
            <p className="font-medium text-slate-800 dark:text-gray-100">Selected Bot Position</p>
            <p>X: {selectedPosition[0].toFixed(2)}</p>
            <p>Z: {selectedPosition[1].toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
