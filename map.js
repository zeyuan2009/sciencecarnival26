const sysStatus = document.getElementById('sys-status');
const trackingActive = document.getElementById('tracking-active');
const currentGesture = document.getElementById('current-gesture');
const vectorDelta = document.getElementById('vector-delta');
const systemClock = document.getElementById('system-clock');
const gesturePrompt = document.getElementById('gesture-prompt');

let map; 
let popUpWindow = null;
let lastTrackingTime = performance.now();
const IDLE_TIMEOUT_MS = 4000; 

// Kinematic Vector Memory Allocation
let rawHandX = 0, rawHandY = 0;
let targetPanX = 0, targetPanY = 0;
let currentGestureName = "NONE";

// Time-delay tracking mechanisms to prevent zoom acceleration loops
let lastZoomTime = 0;
const ZOOM_COOLDOWN_MS = 800; 

// --- SECTION 1: LEAFLET MAP INTERFACE INITIALIZATION ---
function initMapScene() {
    map = L.map('map', {
        zoomControl: true,
        dragging: false,      
        scrollWheelZoom: false 
    }).setView([5.4042279, 100.2953453], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    setTimeout(() => {
        map.invalidateSize();
    }, 200);

    sysStatus.innerText = "OFFLINE // CLICK TO LAUNCH CAMERA";
    gesturePrompt.style.opacity = "1";
}

// --- SECTION 2: SPATIAL POINTING & DISPLACEMENT EVALUATOR ---
window.updateMultiTrackingData = function(multiHandLandmarks) {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
        if (performance.now() - lastTrackingTime > IDLE_TIMEOUT_MS) {
            trackingActive.innerText = "NO SIGNAL";
            trackingActive.className = "metric alert";
            currentGestureName = "NONE";
            currentGesture.innerText = "NONE";
            gesturePrompt.innerText = "Hold up your hand to begin control";
            targetPanX = 0;
            targetPanY = 0;
        }
        return;
    }

    lastTrackingTime = performance.now();
    trackingActive.innerText = "LOCKED";
    trackingActive.className = "metric";

    // Isolate primary hand node tracking references
    const landmarks = multiHandLandmarks[0];
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2)+Math.pow(p1.z-p2.z,2));
    const currentTime = performance.now();

    // Calculate individual finger extension values
    const thumbIndexPinch = dist(thumbTip, indexTip) < 0.05;
    const indexExtended = dist(indexTip, wrist) > dist(indexPip, wrist);
    const middleExtended = dist(middleTip, wrist) > dist(middlePip, wrist);
    const ringExtended = dist(ringTip, wrist) > dist(landmarks[14], wrist);
    const pinkyExtended = dist(pinkyTip, wrist) > dist(landmarks[18], wrist);

    // --- STRATIFIED GESTURE EVALUATOR ENGINE ---
    if (thumbIndexPinch && middleExtended && ringExtended && pinkyExtended) {
        // OK Sign: Thumb and Index touch, other fingers stand up straight
        currentGestureName = "OK SIGN (ZOOM IN)";
        targetPanX = 0;
        targetPanY = 0;

        if (currentTime - lastZoomTime > ZOOM_COOLDOWN_MS) {
            gesturePrompt.innerText = "👌 OK SIGN DETECTED // ZOOMING IN";
            map.zoomIn();
            lastZoomTime = currentTime;
        }
    } 
    else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        // Closed Fist: All primary fingers collapsed inside palm bounds
        currentGestureName = "CLOSED FIST (ZOOM OUT)";
        targetPanX = 0;
        targetPanY = 0;

        if (currentTime - lastZoomTime > ZOOM_COOLDOWN_MS) {
            gesturePrompt.innerText = "✊ FIST CLENCHED // ZOOMING OUT";
            map.zoomOut();
            lastZoomTime = currentTime;
        }
    }
    else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        // Pointing: Only the index finger is sticking out
        currentGestureName = "POINTING DIRECTIONAL PAN";
        gesturePrompt.innerText = "☝️ POINTING // SLIDING VIEWPORT";

        // Calculate vector direction relative to screen coordinates
        // Compares index fingertip location against the base knuckle anchor (node 5)
        const baseKnuckle = landmarks[5];
        rawHandX = (baseKnuckle.x - indexTip.x); 
        rawHandY = (baseKnuckle.y - indexTip.y);
        
        vectorDelta.innerText = `${rawHandX.toFixed(2)} / ${rawHandY.toFixed(2)}`;

        // Multiply the pointing offset to set slide speed vectors
        targetPanX = rawHandX * 50;
        targetPanY = rawHandY * 50;
    }
    else {
        currentGestureName = "ACTIVE HOVER";
        gesturePrompt.innerText = "☝️ Point to pan | 👌 OK to zoom in | ✊ Fist to zoom out";
        targetPanX = 0;
        targetPanY = 0;
    }

    currentGesture.innerText = currentGestureName;
};

// --- SECTION 3: POP-UP WINDOW SYSTEM GENERATOR ---
function spawnTrackingPopup() {
    if (popUpWindow && !popUpWindow.closed) return;

    const width = window.screen.width * 0.4;
    const height = window.screen.height * 0.4;
    const windowFeatures = `width=${width},height=${height},left=0,top=0,scrollbars=no,resizable=yes`;
    
    popUpWindow = window.open("", "AI_Camera_Monitor", windowFeatures);
    
    if (!popUpWindow) {
        sysStatus.innerText = "POP-UP BLOCKED BY BROWSER";
        return;
    }

    popUpWindow.document.write(`
        <html>
        <head>
            <title>AI Structural Finger Vector Overlay</title>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; position: relative; }
                video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); z-index: 1; }
                canvas { position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 2; transform: scaleX(-1); }
                #hud-alert { position: absolute; bottom: 15px; left: 15px; color: #10b981; font-family: monospace; font-size: 1rem; z-index: 3; background: rgba(0,0,0,0.7); padding: 8px; border-radius: 4px; border: 1px solid #10b981; }
            </style>
        </head>
        <body>
            <video id="popup-video" autoplay playsinline></video>
            <canvas id="popup-canvas"></canvas>
            <div id="hud-alert">EYE-AI INTERACTION LAYER STABLE</div>

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

                const masterWindow = window.opener;

                const hands = new Hands({
                    locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
                });

                hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.70,
                    minTrackingConfidence: 0.70
                });

                hands.onResults((results) => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        if(masterWindow && !masterWindow.closed) {
                            masterWindow.updateMultiTrackingData(results.multiHandLandmarks);
                        }
                        for (const landmarks of results.multiHandLandmarks) {
                            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#047857', lineWidth: 4});
                            drawLandmarks(ctx, landmarks, {color: '#10b981', lineWidth: 1, radius: 5});
                        }
                    } else {
                        if(masterWindow && !masterWindow.closed) {
                            masterWindow.updateMultiTrackingData(null);
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
    sysStatus.innerText = "DIRECTIONAL MAP CONTROLLER ONLINE";
}

// --- SECTION 4: HIGH-SPEED EXECUTION RENDERING ENGINE ---
function renderLoop(time) {
    systemClock.innerText = `${(time / 1000).toFixed(1)}s`;

    if (currentGestureName === "POINTING DIRECTIONAL PAN" && map) {
        // Translate vector offsets to slide Leaflet map frame
        map.panBy([targetPanX, -targetPanY], { animate: false });
    }

    requestAnimationFrame(renderLoop);
}

// Initialization Triggers
initMapScene();
requestAnimationFrame(renderLoop);

window.addEventListener('click', () => {
    spawnTrackingPopup();
});