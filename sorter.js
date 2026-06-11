const CONTAINER_WIDTH = 30; // Total data items to render
let dataArray = [];
let isSorting = false;

const container = document.getElementById("array-container");
const speedSlider = document.getElementById("speed");
const speedVal = document.getElementById("speed-val");
const randomBtn = document.getElementById("random-btn");
const sortBtn = document.getElementById("sort-btn");

// Instantiate browser audio architecture for sensory sound cues
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

speedSlider.addEventListener("input", () => {
    speedVal.innerText = `${speedSlider.value}ms`;
});

randomBtn.addEventListener("click", generateNewArray);
sortBtn.addEventListener("click", beginBubbleSort);

function generateNewArray() {
    if (isSorting) return;
    container.innerHTML = "";
    dataArray = [];
    
    for (let i = 0; i < CONTAINER_WIDTH; i++) {
        // Random heights between 10% and 100% of container window
        const randomHeight = Math.floor(Math.random() * 90) + 10;
        dataArray.push(randomHeight);
        
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = `${randomHeight}%`;
        bar.id = `bar-${i}`;
        container.appendChild(bar);
    }
}

// Custom micro-delay helper using asynchronous promise loops
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Built-in Synthesizer beep cue
function playBeep(pitchPercent) {
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // Base pitch alterations mapped smoothly from 200Hz to 800Hz
        osc.frequency.value = 200 + (pitchPercent * 6);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime); // Low volume burst
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05); // Snap fadeout
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } catch(e) {}
}

async function beginBubbleSort() {
    isSorting = true;
    toggleInterfaceInputs(true);

    let len = dataArray.length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len - i - 1; j++) {
            const barLeft = document.getElementById(`bar-${j}`);
            const barRight = document.getElementById(`bar-${j + 1}`);

            // Apply comparative color highlights
            barLeft.classList.add("comparing");
            barRight.classList.add("comparing");

            playBeep(dataArray[j]);

            // If left variable is taller than right, initiate standard pointer swap values
            if (dataArray[j] > dataArray[j + 1]) {
                let temp = dataArray[j];
                dataArray[j] = dataArray[j + 1];
                dataArray[j + 1] = temp;

                // Sync the UI instantly
                barLeft.style.height = `${dataArray[j]}%`;
                barRight.style.height = `${dataArray[j + 1]}%`;
            }

            // Halt current thread loop for the slider duration setting
            await sleep(parseInt(speedSlider.value));

            // Clear operational highlights
            barLeft.classList.remove("comparing");
            barRight.classList.remove("comparing");
        }

        // Lock in completion color flags starting from the far right end element
        document.getElementById(`bar-${len - i - 1}`).classList.add("sorted");
    }

    isSorting = false;
    toggleInterfaceInputs(false);
}

function toggleInterfaceInputs(disabledState) {
    randomBtn.disabled = disabledState;
    sortBtn.disabled = disabledState;
}

// Initialize on boot sequence
generateNewArray();