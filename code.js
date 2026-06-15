const sysStatus = document.getElementById('sys-status');
const trackingActive = document.getElementById('tracking-active');
const currentGesture = document.getElementById('current-gesture');
const vectorDelta = document.getElementById('vector-delta');
const systemClock = document.getElementById('system-clock');
const gesturePrompt = document.getElementById('gesture-prompt');

let scene, camera, renderer, crystalMesh, particleGroup;
let targetRotationX = 0, targetRotationY = 0;
let targetScale = 1.0;

let popUpWindow = null;
let lastTrackingTime = performance.now();
const IDLE_TIMEOUT_MS = 4000; 

// --- SECTION 1: THREE.JS HIGH-FIDELITY WEBGL GRAPHICS ENVIRONMENT ---
function init3DScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.015);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 0.85
    });
    
    crystalMesh = new THREE.Mesh(geometry, material);
    scene.add(crystalMesh);

    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const posArray = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particleMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.5
    });
    
    particleGroup = new THREE.Points(particleGeo, particleMat);
    scene.add(particleGroup);

    window.addEventListener('resize', onWindowResize);
    sysStatus.innerText = "OFFLINE // CLICK TO START";
    gesturePrompt.style.opacity = "1";
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- SECTION 2: GLOBAL GESTURE EVALUATOR (Called by Pop-up) ---
window.updateTrackingData = function(landmarks) {
    if (!landmarks) {
        if (performance.now() - lastTrackingTime > IDLE_TIMEOUT_MS) {
            trackingActive.innerText = "NO SIGNAL";
            trackingActive.className = "metric alert";
            currentGesture.innerText = "NONE";
            gesturePrompt.innerText = "Hold up open palm to begin control";
            targetRotationX = 0;
            targetRotationY = 0;
            targetScale = 1.0;
        }
        return;
    }

    lastTrackingTime = performance.now();
    trackingActive.innerText = "LOCKED";
    trackingActive.className = "metric";

    // Compute distances
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2)+Math.pow(p1.z-p2.z,2));
    const pinchDistance = dist(thumbTip, indexTip);
    
    const indexExtended = dist(indexTip, wrist) > dist(indexPip, wrist);
    const middleExtended = dist(middleTip, wrist) > dist(landmarks[10], wrist);
    const ringExtended = dist(ringTip, wrist) > dist(landmarks[14], wrist);
    const pinkyExtended = dist(pinkyTip, wrist) > dist(landmarks[18], wrist);

    let gesture = "TRACKING ACTIVE";
    if (pinchDistance < 0.06) gesture = "PINCH & DRAG";
    else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) gesture = "CLOSED FIST";
    else if (indexExtended && middleExtended && ringExtended && pinkyExtended) gesture = "OPEN PALM CONTROL";

    currentGesture.innerText = gesture;

    const controlNode = landmarks[9];
    let rawHandX = (0.5 - controlNode.x);
    let rawHandY = (controlNode.y - 0.5);
    vectorDelta.innerText = `${rawHandX.toFixed(2)} / ${rawHandY.toFixed(2)}`;

    if (gesture === "OPEN PALM CONTROL") {
        gesturePrompt.innerText = "👋 DRAGGING ROTATION MATRIX";
        targetRotationY = rawHandX * Math.PI * 2.5;
        targetRotationX = rawHandY * Math.PI * 2.5;
        targetScale = 1.0;
    } 
    else if (gesture === "PINCH & DRAG") {
        gesturePrompt.innerText = "👌 KINETIC SCALE ENGAGED";
        targetScale = 0.5 + (1.0 - controlNode.y) * 1.5;
    }
    else if (gesture === "CLOSED FIST") {
        gesturePrompt.innerText = "✊ AXIS RE-LAYERING LOCK";
    }
};

// --- SECTION 3: FULL SCREEN CAMERA POP-UP GENERATOR ---
function spawnTrackingPopup() {
    if (popUpWindow && !popUpWindow.closed) return;

    // Open window designed to fill screen space completely
    const width = window.screen.width * 0.8;
    const height = window.screen.height * 0.8;
    const windowFeatures = `width=${width},height=${height},left=0,top=0,scrollbars=no,resizable=yes`;
    
    popUpWindow = window.open("", "AI_Camera_Monitor", windowFeatures);
    
    if (!popUpWindow) {
        sysStatus.innerText = "POP-UP BLOCKED BY BROWSER";
        return;
    }

    // Inject MediaPipe packages straight into the popup document ecosystem
    popUpWindow.document.write(`
        <html>
        <head>
            <title>AI Computer Vision Overlay Tracker</title>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; position: relative; }
                video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 1; }
                canvas { position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 2; transform: scaleX(-1); }
                #hud-alert { position: absolute; bottom: 20px; left: 20px; color: #10b981; font-family: monospace; font-size: 1.2rem; z-index: 3; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; border: 1px solid #10b981; }
            </style>
        </head>
        <body>
            <video id="popup-video" autoplay playsinline></video>
            <canvas id="popup-canvas"></canvas>
            <div id="hud-alert">SYSTEM: EYE-AI SKELETAL RADAR ACTIVE</div>

            <script>
                const video = document.getElementById('popup-video');
                const canvas = document.getElementById('popup-canvas');
                const ctx = canvas.getContext('2d');

                function resizeCanvas() {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                window.addEventListener('resize', resizeCanvas);
                resizeCanvas();

                // Connect to the main screen script context smoothly
                const masterWindow = window.opener;

                const hands = new Hands({
                    locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
                });

                hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.60,
                    minTrackingConfidence: 0.60
                });

                hands.onResults((results) => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        const landmarks = results.multiHandLandmarks[0];
                        
                        // Pass math vectors right across windows back to the master controller 
                        if(masterWindow && !masterWindow.closed) {
                            masterWindow.updateTrackingData(landmarks);
                        }

                        // Render the neon-cyber skeleton overlay frame over the pixels
                        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#047857', lineWidth: 4});
                        drawLandmarks(ctx, landmarks, {color: '#10b981', lineWidth: 1, radius: 5});
                    } else {
                        if(masterWindow && !masterWindow.closed) {
                            masterWindow.updateTrackingData(null);
                        }
                    }
                });

                const camera = new Camera(video, {
                    onFrame: async () => {
                        await hands.send({ image: video });
                    },
                    width: 640,
                    height: 480
                });
                camera.start();
            <\/script>
        </body>
        </html>
    `);
    popUpWindow.document.close();
    sysStatus.innerText = "CAMERA STACK SPLIT // POPUP OPERATIONAL";
}

// --- SECTION 4: SMOOTH KINETIC RENDERING RUNTIME TIMERS ---
function renderLoop(time) {
    systemClock.innerText = `${(time / 1000).toFixed(1)}s`;

    crystalMesh.rotation.y += (targetRotationY - crystalMesh.rotation.y) * 0.08;
    crystalMesh.rotation.x += (targetRotationX - crystalMesh.rotation.x) * 0.08;
    
    const currentScale = crystalMesh.scale.x;
    const nextScale = currentScale + (targetScale - currentScale) * 0.1;
    crystalMesh.scale.set(nextScale, nextScale, nextScale);

    if (currentGesture.innerText === "NONE") {
        crystalMesh.rotation.y += 0.003;
        crystalMesh.rotation.x += 0.001;
    }

    particleGroup.rotation.y -= 0.001;

    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
}

init3DScene();
requestAnimationFrame(renderLoop);

window.addEventListener('click', () => {
    spawnTrackingPopup();
});