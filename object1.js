// Создание сцены, камеры и рендера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000); // Соотношение сторон 1:1
camera.position.set(0, 0, 2); // Расположение камеры

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(500, 500); // Квадратный размер
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

document.body.appendChild(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(-5, 10, 7.5).normalize();
scene.add(directionalLight);

// Загрузка окружения
new THREE.EXRLoader()
    .load('https://raw.githubusercontent.com/letomaneteo/21/main/sunset_fairway_4k.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    });

// Загрузка модели GLTF
const loader = new THREE.GLTFLoader();
let model;
let mixer;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const targetObjects = [
    { name: "Mesh002", animationName: "Object03Action" },
    { name: "Mesh005", animationName: "Object01Action" },
    { name: "Mesh014", animationName: "Object02Action" },
];

const interactiveObjects = [];

loader.load(
    'https://raw.githubusercontent.com/letomaneteo/21/main/3tumbalux.glb',
    (gltf) => {
        model = gltf.scene;
        mixer = new THREE.AnimationMixer(model);

        model.traverse((child) => {
            if (child.isMesh) {
                child.material.envMap = scene.environment;
                child.material.needsUpdate = true;

                const target = targetObjects.find(obj => obj.name === child.name);
                if (target) {
                    const animationClip = gltf.animations.find(anim => anim.name === target.animationName);
                    if (animationClip) {
                        const action = mixer.clipAction(animationClip);
                        action.clampWhenFinished = true;
                        action.loop = THREE.LoopOnce;
                        interactiveObjects.push({ mesh: child, action, playingForward: true });
                    }
                }
            }
        });
        model.rotation.set(0, Math.PI / 2, 0);
        scene.add(model);
    },
    undefined,
    (error) => console.error('Ошибка загрузки модели:', error)
);

// Обработка кликов
function onPointerClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects.map(obj => obj.mesh), true);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;

        interactiveObjects.forEach((obj) => {
            if (obj.mesh === clickedMesh) {
                if (obj.playingForward) {
                    obj.action.reset();
                    obj.action.timeScale = 1;
                    obj.action.play();
                } else {
                    obj.action.reset();
                    obj.action.timeScale = -1;
                    obj.action.time = obj.action.getClip().duration;
                    obj.action.play();
                }
                obj.playingForward = !obj.playingForward;
            }
        });
    }
}

window.addEventListener('click', onPointerClick);

// Обработка вращения и масштабирования модели
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoRotate = true;
const rotationSpeed = 0.001;

renderer.domElement.addEventListener('mousedown', (event) => {
    isDragging = true;
    autoRotate = false;
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('mousemove', (event) => {
    if (isDragging && model) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y,
        };

        model.rotation.y += deltaMove.x * 0.005;
        model.rotation.x += deltaMove.y * 0.005;

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
});

renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
    autoRotate = true;
});

renderer.domElement.addEventListener('wheel', (event) => {
    if (model) {
        const scaleChange = event.deltaY > 0 ? 0.95 : 1.05;
        model.scale.multiplyScalar(scaleChange);
    }
});

// Анимация
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (autoRotate && model) {
        model.rotation.y += rotationSpeed;
    }

    renderer.render(scene, camera);
}

animate();

// Обновление размеров
window.addEventListener('resize', () => {
    const size = Math.min(window.innerWidth, window.innerHeight); // Квадратный размер
    camera.aspect = 1; // Соотношение сторон 1:1
    camera.updateProjectionMatrix();
    renderer.setSize(size, size);
});
