import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let requestAnimationFrameId;

let timeRate = 50;

let bodiesNumber = 3;

const G = 1e-3;

const celestialObjectConfigs = [
  {
    radius: 20,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 20000000,
  },
  {
    radius: 5,
    position: { x: 100, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -14 },
    mass: 10000,
  },
  {
    radius: 5,
    position: { x: 200, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -10 },
    mass: 10000,
  },
  {
    radius: 8,
    position: { x: 350, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -8 },
    mass: 50000,
  },
  {
    radius: 6,
    position: { x: 450, y: 0, z: 0 },
    velocity: { x: 0, y: 1, z: -6 },
    mass: 80000,
  },
];

const celestialObjects = [];

const scene = createScene();

const renderer = createRenderer();

const camera = createCamera();

const controls = createControls(camera, renderer.domElement);

const clock = new THREE.Clock();

const timeRateSlider = document.getElementById("time-rate-slider");

const bodiesNumberInput = document.getElementById("bodies-number-input");

const resetButton = document.getElementById("reset-button");

const randomButton = document.getElementById("random-button");

init();

animate();

window.addEventListener("resize", (event) => {
  const { innerWidth, innerHeight, devicePixelRatio } = event.target;

  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

timeRateSlider.addEventListener("input", (event) => {
  timeRate = event.target.value;
});

bodiesNumberInput.addEventListener("input", (event) => {
  bodiesNumber = event.target.value;
});

resetButton.addEventListener("click", restart);

randomButton.addEventListener("click", () => {
  celestialObjectConfigs.length = 0;

  for (let i = 0; i < bodiesNumber; i++) {
    const radius = Math.random() * 5 + 1;
    const color = getRandomColor();
    const position = getRandomPosition(400);
    const velocity = getRandomVelocity(0.5);
    const mass = Math.random() * 100000 + 10000;

    celestialObjectConfigs.push({ radius, color, position, velocity, mass });
  }

  restart();
});

function createScene() {
  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const axesHelper = new THREE.AxesHelper(1000);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);

  directionalLight.position.set(0, 1, 0);

  scene.add(axesHelper);
  scene.add(ambientLight);
  scene.add(directionalLight);

  return scene;
}

function createRenderer() {
  const { innerWidth, innerHeight, devicePixelRatio } = window;
  const canvas = document.getElementById("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);

  return renderer;
}

function createCamera() {
  const { innerWidth, innerHeight } = window;
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight);

  camera.position.copy(new THREE.Vector3(445, 180, 445));

  return camera;
}

function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  // controls.autoRotate = true;
  // controls.autoRotateSpeed = 0.1;

  return controls;
}

function createSphere({ radius, color }) {
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

function createLine(color) {
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(lineGeometry, lineMaterial);

  return {
    line,
    points: [],
  };
}

function createCelestialObject({ radius, mass, position, velocity }) {
  const color = getRandomColor();
  const mesh = createSphere({ radius, color });
  const trail = createLine(color);

  return {
    mesh,
    trail,
    mass,
    position: new THREE.Vector3(position.x, position.y, position.z),
    velocity: new THREE.Vector3(velocity.x, velocity.y, velocity.z),
  };
}

function clearCelestialObjects(celestialObjects) {
  for (const celestialObject of celestialObjects) {
    scene.remove(celestialObject.mesh);
    scene.remove(celestialObject.trail.line);
  }

  celestialObjects.length = 0;
}

function init() {
  for (const configs of celestialObjectConfigs) {
    celestialObjects.push(createCelestialObject(configs));
  }

  for (const celestialObject of celestialObjects) {
    scene.add(celestialObject.mesh);
    scene.add(celestialObject.trail.line);
  }
}

function restart() {
  clearCelestialObjects(celestialObjects);
  resetCamera();
  init();
}

function resetCamera() {
  camera.position.copy(new THREE.Vector3(445, 150, 445));
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.zoomSpeed = 1.0;
  controls.reset();
}

function animate() {
  requestAnimationFrameId = requestAnimationFrame(animate);

  const deltaTime = clock.getDelta() * timeRate;

  updateState(celestialObjects, deltaTime);

  updateCelestialObjects(celestialObjects);

  controls.update();

  renderer.render(scene, camera);
}

function calculateGravitationalForce(a, b) {
  const vectorBetweenBodies = new THREE.Vector3().subVectors(
    b.position,
    a.position
  );
  const distanceSquared = vectorBetweenBodies.lengthSq();

  if (distanceSquared === 0) return new THREE.Vector3(0, 0, 0);

  const forceMagnitude = (G * a.mass * b.mass) / distanceSquared;
  const forceVector = vectorBetweenBodies
    .normalize()
    .multiplyScalar(forceMagnitude);

  return forceVector;
}

function updateState(celestialObjects, deltaTime) {
  for (let i = 0; i < celestialObjects.length; i++) {
    const celestialObject = celestialObjects[i];
    const totalForce = new THREE.Vector3(0, 0, 0);

    for (let j = 0; j < celestialObjects.length; j++) {
      if (i !== j) {
        const otherObject = celestialObjects[j];
        const force = calculateGravitationalForce(celestialObject, otherObject);

        totalForce.add(force);
      }
    }

    const acceleration = totalForce.divideScalar(celestialObject.mass);

    celestialObject.velocity.add(acceleration.multiplyScalar(deltaTime));
    celestialObject.position.add(
      celestialObject.velocity.clone().multiplyScalar(deltaTime)
    );
  }
}

function updateCelestialObjects(celestialObjects) {
  for (const celestialObject of celestialObjects) {
    celestialObject.mesh.position.copy(celestialObject.position);
    updateTrail(celestialObject);
  }
}

function updateTrail(celestialObject, maxTrailPoints = 3000) {
  celestialObject.trail.points.push(celestialObject.position.clone());

  if (maxTrailPoints !== -1) {
    if (celestialObject.trail.points.length > maxTrailPoints) {
      celestialObject.trail.points.shift();
    }
  }

  const positions = new Float32Array(celestialObject.trail.points.length * 3);

  celestialObject.trail.points.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  });

  celestialObject.trail.line.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  celestialObject.trail.line.geometry.computeBoundingSphere();

  celestialObject.trail.line.geometry.setDrawRange(
    0,
    celestialObject.trail.points.length
  );

  celestialObject.trail.line.geometry.needsUpdate = true;
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  return `rgb(${r}, ${g}, ${b})`;
}

function getRandomPosition(maxDistance) {
  const x = Math.floor(Math.random() * maxDistance);
  const y = Math.floor(Math.random() * maxDistance);
  const z = Math.floor(Math.random() * maxDistance);

  return { x, y, z };
}

function getRandomVelocity(maxSpeed) {
  const x = Math.random() * 2 * maxSpeed - maxSpeed;
  const y = Math.random() * 2 * maxSpeed - maxSpeed;
  const z = Math.random() * 2 * maxSpeed - maxSpeed;

  return { x, y, z };
}
