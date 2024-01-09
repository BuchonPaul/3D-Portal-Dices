import * as THREE from "./node_modules/three/build/three.module.js";
import * as CANNON from "./node_modules/cannon-es/dist/cannon-es.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";

// Ce jeu est librement inspiré de Portal dans sa direction artistique
//THREE
const loader = new GLTFLoader(); //Utilisé pour charger les Modèles 3D
const tloader = new THREE.TextureLoader(); //Utilisé pour charger les Textures
let camera, scene, renderer, BlueCamera, OrangeCamera;
let movementPlane;
let clickMarker;
let raycaster;

//CANNON
let world;
let jointBody;
let jointConstraint;
let diceBody;
let isDragging = false;
const meshes = [];
const bodies = [];

var panelGeometry, panelMesh, panelMaterials;

var OrangeRenderTarget, BlueRenderTarget;

//Cette Fonction vient déterminer quel est le résultat du dé lorsque celui-ci est à l'arrêt
function getDiceResult(dice) {
  const euler = new CANNON.Vec3();
  dice.quaternion.toEuler(euler);
  const eps = 0.3;
  let isZero = (angle) => Math.abs(angle) < eps;
  let isHalfPi = (angle) => Math.abs(angle - 0.5 * Math.PI) < eps;
  let isMinusHalfPi = (angle) => Math.abs(0.5 * Math.PI + angle) < eps;
  let isPiOrMinusPi = (angle) =>
    Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;
  if (isZero(euler.z)) {
    if (isZero(euler.x)) {
      return 1;
    } else if (isHalfPi(euler.x)) {
      return 3;
    } else if (isMinusHalfPi(euler.x)) {
      return 4;
    } else if (isPiOrMinusPi(euler.x)) {
      return 6;
    } else {
      return "--";
    }
  } else if (isHalfPi(euler.z)) {
    return 5;
  } else if (isMinusHalfPi(euler.z)) {
    return 2;
  } else {
    return "--";
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initThree() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#262f3d", 1000, 1000);

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.5,
    1000
  );
  camera.position.set(0, -12, 10);
  camera.position.set(40, 30, 40);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(scene.fog.color);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Toute cette partie sert à la mise en place des portails, avec les caméras qui s'en servent comme textures
  // On dimniue la résolution des petits rendu pour optimiser les performances

  const optiCam = 3;
  OrangeRenderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth / optiCam,
    window.innerHeight / optiCam,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    }
  );

  BlueRenderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth / optiCam,
    window.innerHeight / optiCam,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    }
  );

  BlueCamera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / (2.9 * window.innerHeight),
    0.1,
    1000
  );
  BlueCamera.position.set(-19.8, 7, 10);
  BlueCamera.rotation.set(0, -Math.PI / 2, 0);
  BlueCamera.setFocalLength(20);
  scene.add(BlueCamera);

  OrangeCamera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / (2.9 * window.innerHeight),
    0.1,
    1000
  );
  OrangeCamera.position.set(10, -13, 1);
  OrangeCamera.rotation.set(0, Math.PI, 0);
  OrangeCamera.setFocalLength(20);
  scene.add(OrangeCamera);

  const Orange_portalGeo = new THREE.PlaneGeometry(9, 12);
  const Orange_portalTexture = new THREE.TextureLoader().load(
    "model/portalo.png"
  );
  const Orange_portalMaterial = new THREE.MeshBasicMaterial({
    map: Orange_portalTexture,
    transparent: true,
  });
  const Orange_portalPlane = new THREE.Mesh(
    Orange_portalGeo,
    Orange_portalMaterial
  );
  Orange_portalPlane.position.set(-19.9, 7, 10);
  Orange_portalPlane.rotateY(Math.PI / 2);
  scene.add(Orange_portalPlane);

  const Blue_portalGeo = new THREE.PlaneGeometry(9, 12);
  const Blue_portalTexture = new THREE.TextureLoader().load(
    "model/portalb.png"
  );
  const Blue_portalMaterial = new THREE.MeshBasicMaterial({
    map: Blue_portalTexture,
    transparent: true,
  });
  const Blue_portalPlane = new THREE.Mesh(Blue_portalGeo, Blue_portalMaterial);
  Blue_portalPlane.position.set(10, -13, 0.1);
  scene.add(Blue_portalPlane);

  const Blue_portalGeometry = new THREE.CircleGeometry(3, 32);
  Blue_portalGeometry.scale(1, 5 / 3, 1);
  var Blue_PortalMaterial = new THREE.MeshBasicMaterial({
    map: BlueRenderTarget.texture,
  });
  const Blue_Portalplane = new THREE.Mesh(
    Blue_portalGeometry,
    Blue_PortalMaterial
  );
  Blue_Portalplane.position.set(-19.91, 7, 10);
  Blue_Portalplane.rotateY(Math.PI / 2);
  scene.add(Blue_Portalplane);

  const Orange_portalGeometry = new THREE.CircleGeometry(3, 32);
  Orange_portalGeometry.scale(1, 5 / 3, 1);
  var Orange_PortalMaterial = new THREE.MeshBasicMaterial({
    map: OrangeRenderTarget.texture,
  });
  const Orange_Portalplane = new THREE.Mesh(
    Orange_portalGeometry,
    Orange_PortalMaterial
  );
  Orange_Portalplane.position.set(10, -13, 0.01);
  scene.add(Orange_Portalplane);

  //Raycaster
  raycaster = new THREE.Raycaster();

  // Lights
  const ambientLight = new THREE.AmbientLight(0xaaaaff, 0.6);
  scene.add(ambientLight);

  const ExternProjectionLight = new THREE.SpotLight(0x99ffff, 1.2);
  ExternProjectionLight.position.set(-45, 40, 70);
  ExternProjectionLight.castShadow = true;
  ExternProjectionLight.angle = 0.4;
  ExternProjectionLight.shadow.mapSize.width = 800;
  ExternProjectionLight.shadow.mapSize.height = 800;
  ExternProjectionLight.penumbra = 0.9;
  ExternProjectionLight.target.position.set(20, 0, -20);
  ExternProjectionLight.target.updateMatrixWorld();
  scene.add(ExternProjectionLight);

  const NeonLight = new THREE.PointLight(0x55ffff, 0.8, 80);
  NeonLight.position.set(-20, 20, 0);
  scene.add(NeonLight);

  const PannelLight = new THREE.PointLight(0xffffff, 1.4, 20);
  PannelLight.position.set(2, -12, 12);
  scene.add(PannelLight);

  const DoorLight = new THREE.PointLight(0x00ffff, 2, 50);
  DoorLight.position.set(10, 6, -18.5);
  scene.add(DoorLight);

  scene.add(PannelLight);
  const BluePortalLight = new THREE.PointLight(0x00ffff, 2, 20);
  BluePortalLight.position.set(10, -13, 1);
  scene.add(BluePortalLight);

  const OrangePortalLight = new THREE.PointLight(0xff9000, 1.4, 20);
  OrangePortalLight.position.set(-18, 7, 10);
  scene.add(OrangePortalLight);

  //Génération du sol et des 2 murs sans les collisions
  const texture = new THREE.TextureLoader().load("model/wall.jpg");
  let material = new THREE.MeshLambertMaterial({ map: texture });
  material.reflectivity = 0.5;

  const floorGeometry = new THREE.PlaneGeometry(40, 40, 1, 1);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const floor = new THREE.Mesh(floorGeometry, material);
  floor.position.set(0, -20, 0);
  floor.castShadow = true;
  floor.receiveShadow = true;
  scene.add(floor);

  const floorGeometrya = new THREE.PlaneGeometry(40, 40, 1, 1);
  const floora = new THREE.Mesh(floorGeometrya, material);
  floora.position.set(0, 0, -20);
  floora.castShadow = true;
  floora.receiveShadow = true;
  scene.add(floora);

  const floorGeometryb = new THREE.PlaneGeometry(40, 40, 1, 1);
  floorGeometryb.rotateY(Math.PI / 2);
  const floorb = new THREE.Mesh(floorGeometryb, material);
  floorb.position.set(-20, 0, 0);
  floorb.castShadow = true;
  floorb.receiveShadow = true;
  scene.add(floorb);

  //Génération des "Murs/Sols" en volume
  const textureCube = [
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/bwall.png"),
    }),
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/swall.jpg"),
    }),
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/swall.jpg"),
    }),
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/swall.jpg"),
    }),
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/bwall.png"),
    }),
    new THREE.MeshStandardMaterial({
      map: tloader.load("model/swall.jpg"),
    }),
  ];
  var cubeGeometrya = new THREE.BoxGeometry(20, 20, 20);
  var cubeMesha = new THREE.Mesh(cubeGeometrya, textureCube);
  cubeMesha.position.set(-10, -10, 10);
  cubeMesha.receiveShadow = true;
  cubeMesha.castShadow = true;
  scene.add(cubeMesha);

  var cubeGeometryb = new THREE.BoxGeometry(20, 20, 20);
  var cubeMeshb = new THREE.Mesh(cubeGeometryb, textureCube);
  cubeMeshb.position.set(-10, -10, -10);
  cubeMeshb.receiveShadow = true;
  cubeMeshb.castShadow = true;
  scene.add(cubeMeshb);

  var cubeGeometryc = new THREE.BoxGeometry(20, 20, 20);
  var cubeMeshc = new THREE.Mesh(cubeGeometryc, textureCube);
  cubeMeshc.position.set(10, -10, -10);
  cubeMeshc.receiveShadow = true;
  cubeMeshc.castShadow = true;
  cubeMeshc.rotation.y = Math.PI / 2;
  scene.add(cubeMeshc);

  //Hit Marker là où on attrape le cube
  const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const markerMaterial = new THREE.MeshLambertMaterial({ color: 0x00ffff });
  clickMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  clickMarker.visible = false; // Hide it..
  scene.add(clickMarker);

  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  movementPlane = new THREE.Mesh(planeGeometry, floorMaterial);
  movementPlane.visible = false;
  scene.add(movementPlane);
  window.addEventListener("resize", onWindowResize);

  //Chargement des modèles 3D
  loadModels();
}

function loadModels() {
  //Chargement des GLTF/GLB
  let diceMesh = null;
  let spawnerMesh = null;
  let doorMesh = null;

  //Les modèles sont chargés un par un pour que l'application ne se lance que lorsque tous les modèles sont chargés
  loader.load(
    "model/spawn.glb",
    function (gltf) {
      spawnerMesh = gltf.scene.children[0];
      spawnerMesh.position.set(-10, 23, 10);
      spawnerMesh.traverse((node) => {
        // Ceci permet aux modèles 3D d'émettre et recevoir les ombres
        if (!node.isMesh) return;
        node.castShadow = true;
      });
      scene.add(spawnerMesh);
      loader.load(
        "model/f.glb",
        function (gltf) {
          diceMesh = gltf.scene.children[0];
          meshes.push(diceMesh);
          diceMesh.traverse((node) => {
            // Ceci permet aux modèles 3D d'émettre et recevoir les ombres
            if (!node.isMesh) return;
            node.castShadow = true;
            node.receiveShadow = true;
          });
          scene.add(diceMesh);
          diceMesh.allowSleep = true;
          window.addEventListener("pointerdown", (event) => {
            const hitPoint = getHitPoint(
              event.clientX,
              event.clientY,
              diceMesh,
              camera
            );
            if (!hitPoint) {
              return;
            }
            //Quand le cube est cliqué, un certain nombre de fonction sont effectuées pour mettre à jour sa possition, son orientation ...

            showClickMarker();
            moveClickMarker(hitPoint);
            moveMovementPlane(hitPoint, camera);
            addJointConstraint(hitPoint, diceBody);
            requestAnimationFrame(() => {
              isDragging = true;
            });
          });

          loader.load(
            "model/door2.glb",
            function (gltf) {
              doorMesh = gltf.scene.children[0];
              doorMesh.position.set(10, 0, -20.4);
              doorMesh.scale.set(0.13, 0.13, 0.13);
              doorMesh.traverse((node) => {
                if (!node.isMesh) return;
                node.castShadow = true;
                node.receiveShadow = true;
              });
              scene.add(doorMesh);
              initCannon(); //Cannon est initié qu'une fois que tout est chargé
            },
            (xhr) => {
              //   console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
              console.log(error);
            }
          );
        },
        function (xhr) {
          //   console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
          console.log("An error happened:" + error);
        }
      );
    },
    function (xhr) {
      //   console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.log("An error happened:" + error);
    }
  );
}

function initCannon() {
  // Setup world
  world = new CANNON.World({
    allowSleep: true,
    gravity: new CANNON.Vec3(0, -100, 0),
  });

  // Génération des 6 planes avec collisions pour les 6 côtés de la Map
  const floorShape0 = new CANNON.Plane();
  const floorBody0 = new CANNON.Body({ mass: 0 });
  floorBody0.addShape(floorShape0);
  floorBody0.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  floorBody0.position.set(0, -20, 0);
  world.addBody(floorBody0);
  const floorShape10 = new CANNON.Plane();
  const floorBody10 = new CANNON.Body({ mass: 0 });
  floorBody10.addShape(floorShape10);
  floorBody10.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  floorBody10.position.set(0, 20, 0);
  world.addBody(floorBody10);
  const floorShape1 = new CANNON.Plane();
  const floorBody1 = new CANNON.Body({ mass: 0 });
  floorBody1.addShape(floorShape1);
  floorBody1.quaternion.setFromEuler(0, -Math.PI / 2, 0);
  floorBody1.position.set(20, 0, 0);
  world.addBody(floorBody1);
  const floorShape12 = new CANNON.Plane();
  const floorBody12 = new CANNON.Body({ mass: 0 });
  floorBody12.addShape(floorShape12);
  floorBody12.quaternion.setFromEuler(0, Math.PI / 2, 0);
  floorBody12.position.set(-20, 0, 0);
  world.addBody(floorBody12);
  const floorShape21 = new CANNON.Plane();
  const floorBody21 = new CANNON.Body({ mass: 0 });
  floorBody21.addShape(floorShape21);
  floorBody21.quaternion.setFromEuler(0, 0, 0);
  floorBody21.position.set(0, 0, -20);
  world.addBody(floorBody21);
  const floorShape22 = new CANNON.Plane();
  const floorBody22 = new CANNON.Body({ mass: 0 });
  floorBody22.addShape(floorShape22);
  floorBody22.quaternion.setFromEuler(0, -Math.PI, 0);
  floorBody22.position.set(0, 0, 20);
  world.addBody(floorBody22);

  // Body du cube, c'est la partie qui gère ses collisions
  const diceShape = new CANNON.Box(new CANNON.Vec3(2.8, 2.8, 2.8));
  diceBody = new CANNON.Body({ mass: 1 });
  diceBody.addShape(diceShape);
  diceBody.position.set(-10, 40, 10);
  bodies.push(diceBody);
  world.addBody(diceBody);

  // Génération des collisions pour les plateformes cubiques
  const wallShapea = new CANNON.Box(new CANNON.Vec3(10, 10, 10));
  let wallBodya = new CANNON.Body({ mass: 0 });
  wallBodya.addShape(wallShapea);
  wallBodya.position.set(-10, -10, 10);
  wallBodya.allowSleep;
  world.addBody(wallBodya);
  const wallShapeb = new CANNON.Box(new CANNON.Vec3(10, 10, 10));
  let wallBodyb = new CANNON.Body({ mass: 0 });
  wallBodyb.addShape(wallShapeb);
  wallBodyb.position.set(-10, -10, -10);
  wallBodyb.allowSleep;
  world.addBody(wallBodyb);
  const wallShapec = new CANNON.Box(new CANNON.Vec3(10, 10, 10));
  let wallBodyc = new CANNON.Body({ mass: 0 });
  wallBodyc.addShape(wallShapec);
  wallBodyc.position.set(10, -10, -10);
  wallBodyc.allowSleep;
  world.addBody(wallBodyc);

  //Collision qui permet de drag le cube
  const jointShape = new CANNON.Sphere(0.1);
  jointBody = new CANNON.Body({ mass: 0 });
  jointBody.addShape(jointShape);
  jointBody.collisionFilterGroup = 0;
  jointBody.collisionFilterMask = 0;
  world.addBody(jointBody);

  // On gère toutes les intéractions du cube, on gère le drag and drop, on détecte si il est arrêté pour afficher le score sur le panneau
  diceBody.addEventListener("sleepy", async function (e) {
    let result = await getDiceResult(diceBody);
    panelMaterials = [
      new THREE.MeshStandardMaterial({
        map: tloader.load("model/" + result + ".jpg"),
      }), // face avant
      new THREE.MeshStandardMaterial({ color: 0xffffff }), // face arrière
      new THREE.MeshStandardMaterial({ color: 0xffffff }), // face haut
      new THREE.MeshStandardMaterial({ color: 0xffffff }), // face bas
      new THREE.MeshStandardMaterial({ color: 0xffffff }), // face droite
      new THREE.MeshStandardMaterial({ color: 0xffffff }), // face gauche
    ];
    panelGeometry = await new THREE.BoxGeometry(0.3, 10, 7);
    panelMesh = await new THREE.Mesh(panelGeometry, panelMaterials);
    panelMesh.position.set(0.3, -12, 12);
    scene.add(panelMesh);
  });

  setTimeout(() => {
    animate(); // On lance la fonction animate qui boucle et rafaraichit l'image
    console.log("Number of Triangles :", renderer.info.render.triangles);
    //displayHleper() // DéCOMENTER POUR SAVOIR COMMENT FONCTIONNE LES CAMéRAS
  }, 1);
}

//Toutes la partie suivante est une suite de fonction permettant de gérer le clic et le lancé du cube
// ----------------------------------------------------------------------------------------------------------------------------
window.addEventListener("pointermove", (event) => {
  if (!isDragging) {
    return;
  }
  const hitPoint = getHitPoint(
    event.clientX,
    event.clientY,
    movementPlane,
    camera
  );

  if (hitPoint) {
    moveClickMarker(hitPoint);
    moveJoint(hitPoint);
  }
});
window.addEventListener("pointerup", () => {
  isDragging = false;
  hideClickMarker();
  removeJointConstraint();
});
function showClickMarker() {
  clickMarker.visible = true;
}
function moveClickMarker(position) {
  clickMarker.position.copy(position);
}
function hideClickMarker() {
  clickMarker.visible = false;
}
function moveMovementPlane(point, camera) {
  movementPlane.position.copy(point);
  movementPlane.quaternion.copy(camera.quaternion);
}
function getHitPoint(clientX, clientY, mesh, camera) {
  const mouse = new THREE.Vector2();
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -((clientY / window.innerHeight) * 2 - 1);

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(mesh);
  return hits.length > 0 ? hits[0].point : undefined;
}
function addJointConstraint(position, constrainedBody) {
  const vector = new CANNON.Vec3()
    .copy(position)
    .vsub(constrainedBody.position);

  const antiRotation = constrainedBody.quaternion.inverse();
  const pivot = antiRotation.vmult(vector); // pivot is not in local body coordinates
  jointBody.position.copy(position);
  jointConstraint = new CANNON.PointToPointConstraint(
    constrainedBody,
    pivot,
    jointBody,
    new CANNON.Vec3(0, 0, 0)
  );
  world.addConstraint(jointConstraint);
}
function moveJoint(position) {
  jointBody.position.copy(position);
  jointConstraint.update();
}
function removeJointConstraint() {
  world.removeConstraint(jointConstraint);
  jointConstraint = undefined;
}
// ----------------------------------------------------------------------------------------------------------------------------

initThree(); // On lance la fonction THREE, à partir de cette fonction, tout le reste sera éxecuté

function displayHleper() {
  scene.add(new THREE.CameraHelper(BlueCamera));
  scene.add(new THREE.CameraHelper(OrangeCamera));
}
//Ces deux fonctions calculent de manière trigonométrique l'angle avec lequel le joueur regarde le portail, pour orienter la caméra en fonction
function updatePortalBlue(cam, portalcam) {
  let rx, ry;
  rx = Math.atan((cam.position.x - 10) / (cam.position.z + 1));
  ry = Math.atan(
    (cam.position.y + 13) /
      Math.pow(
        Math.pow(cam.position.x - 10, 2) + Math.pow(cam.position.z + 1, 2),
        0.5
      )
  );
  portalcam.rotation.set(0, -Math.PI / 2, 0);
  portalcam.rotateY(rx);
  portalcam.rotateX(-ry);
}

function updatePortalOrange(cam, portalcam) {
  let rx, ry;
  rx = Math.atan((cam.position.z - 10) / (cam.position.x + 20));
  ry = Math.atan(
    (cam.position.y - 7) /
      Math.pow(
        Math.pow(cam.position.z - 10, 2) + Math.pow(cam.position.x + 20, 2),
        0.5
      )
  );
  portalcam.rotation.set(0, Math.PI / 2, 0);
  portalcam.rotateY(Math.PI / 2 - rx);
  portalcam.rotateX(-ry);
}

//On gère les FPS
let lastTime = 0;
const maxFPS = 60;
const interval = 1000 / maxFPS;

function animate(currentTime) {
  const elapsed = currentTime - lastTime;
  world.fixedStep();
  for (let i = 0; i !== meshes.length; i++) {
    //On met à jour le modèle du cube par rapport à la position de son équivalent Physique
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
  }
  if (elapsed > interval) {
    //On limite le taux de rafraichissment des portails
    lastTime = currentTime;
    //Mise à jour de la caméra principale et de tout les portails
    updatePortalBlue(camera, BlueCamera);
    renderer.setRenderTarget(OrangeRenderTarget);
    renderer.render(scene, BlueCamera);
    renderer.setRenderTarget(BlueRenderTarget);
    updatePortalOrange(camera, OrangeCamera);
    renderer.render(scene, OrangeCamera);
    renderer.setRenderTarget(null);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
