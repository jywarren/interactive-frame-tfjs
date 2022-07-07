import React, { useEffect } from "react";
import * as THREE from "./utils/three.module";
import { CameraUtils } from "./utils/CameraUtils";
import { OrbitControls } from "./OrbitControls";
import "@mediapipe/pose";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';


/*
Credit for 3d model: "Palm Plant" (https://skfb.ly/6VsxQ) by SomeKevin is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
*/

const HOST =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://jywarren.github.io/interactive-frame-tfjs/";

let camera, scene, renderer;
let cameraControls;
let controls;
let bottomLeftCorner, bottomRightCorner, topLeftCorner;
let detector;

let plant;
let defaultVideoWidth = 640;

/* Detect if device is a touch screen or not */
let touchscreen = "ontouchstart" in window ? true : false;

const setupCamera = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
    },
  });
  video.srcObject = stream;

  return new Promise(
    (resolve) => (video.onloadedmetadata = () => resolve(video))
  );
};

const setup = async () => {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet
  );
  const video = await setupCamera();
  video.play();
  return video;
};

async function init() {
  const container = document.getElementById("container");

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;

  // scene
  scene = new THREE.Scene();

  // camera
  const planeGeo = new THREE.PlaneGeometry(100.1, 100.1);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0, 50, 100);
  scene.add(camera);

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 40, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.dispose();
  cameraControls.update();

  // moving around scene?
  /*
  controls = new FlyControls( camera, renderer.domElement );

  controls.movementSpeed = 1000;
  controls.domElement = renderer.domElement;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;
  controls.update();
  */

  bottomLeftCorner = new THREE.Vector3();
  bottomRightCorner = new THREE.Vector3();
  topLeftCorner = new THREE.Vector3();

  if (touchscreen) {
    bottomRightCorner.set(50.0, -0.0, -20.0);
    bottomLeftCorner.set(-50.0, -0.0, -20.0);
    topLeftCorner.set(-50.0, 100.0, -20.0);
  } else {
    bottomRightCorner.set(50.0, -0.0, -30.0);
    bottomLeftCorner.set(-50.0, -0.0, -30.0);
    topLeftCorner.set(-50.0, 100.0, -30.0);
  }

  /* 3D model */
  // example: https://sbcode.net/threejs/loaders-gltf/
  const loader = new GLTFLoader();
  loader.load(
    `${HOST}/chinatown.glb`, // https://alitasci.net/gltf-to-glb-packer/
    function (object) {
      plant = object;

      plant.castShadow = true;
      plant.receiveShadow = false;
      if (touchscreen) {
        plant.scene.scale.set(0.4, 0.4, 0.35);
      } else {
        plant.scene.scale.set(150*0.22, 150*0.35, 150*0.22);
//        plant.scene.scale.set(0.22, 0.35, 0.22);
      }

      if (touchscreen) {
        //plant.scene.position.set(60, 0, -40);
        plant.scene.position.set(-140, -300, -800);
        plant.scene.rotation.set( -THREE.Math.degToRad(15), 0, 0);
      } else {
        //plant.scene.position.set(eastwest, altitude, -150);
        plant.scene.position.set(-140, -300, -800);
        plant.scene.rotation.set( -THREE.Math.degToRad(15), 0, 0);
        // chinatown-sketchfab.glb
        // plant.scene.position.set(60, 0, -40);
      }

      scene.add(plant.scene);

    },
    undefined,
    function (e) {
      console.error(e);
    }
  );

  // lights
  const mainLight = new THREE.PointLight(0xffffff, 1, 250);
  mainLight.position.y = 50;
  mainLight.position.z = 10;
  // scene.add(mainLight);

  const color = 0xffffff;
  // const color = 0xdfebff;
  // const intensity = 1;
  const intensity = 1;
  const directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(0, 60, 0);
  // directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  // directionalLight.target.position.set(0, 20, -40);
  // scene.add(directionalLight);
  // scene.add(directionalLight.target);

  const Dlight = new THREE.DirectionalLight(0x404040, 1);
  Dlight.position.set(100, 120, 300);
  Dlight.castShadow = true;
  Dlight.shadow.camera.top = 200;
  Dlight.shadow.camera.bottom = -200;
  Dlight.shadow.camera.right = 200;
  Dlight.shadow.camera.left = -200;
  Dlight.shadow.mapSize.set(4096, 4096);
  scene.add(Dlight);

  const light = new THREE.AmbientLight(0xffffff, 0.8); // soft white light
  light.position.set(0, 0, 300);
  scene.add(light);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);
}

function onDocumentMouseMove(event) {
  // Manually fire the event in OrbitControls
  cameraControls.handleMouseMoveRotate(event);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onFaceMove(faceX, leftEyeYPosition) {
  // Manually fire the event in OrbitControls
  cameraControls.handleFaceMoveRotate(faceX, leftEyeYPosition);
}

function scaleValue(value, from, to) {
  var scale = (to[1] - to[0]) / (from[1] - from[0]);
  var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];

  return ~~(capped * scale + to[0]);
}

function getFaceCoordinates(poses) {
  const leftEye = poses[0]?.keypoints.filter(
    (keypoint) => keypoint.name === "left_eye"
  )[0];
  const rightEye = poses[0]?.keypoints.filter(
    (keypoint) => keypoint.name === "right_eye"
  )[0];

  /* 
    The coordinates for the eyes will be based on the default size of the video element (640x480).
    We need to do some calculation to make it match the window size instead
  */

  if (leftEye.score > 0.7) {
    let scaledLeftEyeXCoordinate = scaleValue(
      leftEye.x,
      [0, defaultVideoWidth],
      [0, window.innerWidth]
    );

    let scaledRightEyeXCoordinate = scaleValue(
      rightEye.x,
      [0, defaultVideoWidth],
      [0, window.innerWidth]
    );

    const leftEyePosition = window.innerWidth - scaledLeftEyeXCoordinate;
    // const rightEyePosition = window.innerWidth - scaledRightEyeXCoordinate;
    const leftEyeYPosition = leftEye.y;

    // const middleEyes = leftEyePosition - rightEyePosition / 2;

    // onFaceMove(middleEyes, leftEyeYPosition);
    onFaceMove(leftEyePosition, leftEyeYPosition);
  }
}

async function animate() {
  requestAnimationFrame(animate);

  const poses = await detector?.estimatePoses(video);
  getFaceCoordinates(poses);

  // set the projection matrix to encompass the portal's frame
  CameraUtils.frameCorners(
    camera,
    bottomLeftCorner,
    bottomRightCorner,
    topLeftCorner,
    false
  );

  renderer.render(scene, camera);
}

const App = () => {
  useEffect(async () => {
    init();
    await setup();
    animate();
  }, []);
  return <></>;
};

export default App;
