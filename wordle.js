let WORD_POOL = [];
let secretWordsKeys = [];
let targetWord = "";
let currentHint = "";
let currentWordIndex = 0;

// High-performance hash set to store the massive validation dictionary
let VALID_GUESSES_SET = new Set();

const ROW_COUNT = 6;
const COL_COUNT = 5;
let currentRow = 0;
let currentCol = 0;
let guesses = Array(ROW_COUNT).fill().map(() => Array(COL_COUNT).fill(""));
let gameOver = false;

const board = document.getElementById("board");

// Optimized Async function to fetch and index both data layers
async function loadDictionaryAndStart() {
    try {
        // 1. Fetch the secret tech words database
        const response = await fetch('words.json');
        const data = await response.json();
        WORD_POOL = data;
        secretWordsKeys = Object.keys(data);
        
        // 2. Fetch the massive dictionary validation file
        showToast("Loading dictionary dictionary...");
        const validResponse = await fetch('validwords.json');
        const validData = await validResponse.json();
        
        // Convert the large array into an optimized Set for constant-time O(1) lookups
        // We sanitize strings to uppercase to avoid case-sensitivity bugs
        VALID_GUESSES_SET = new Set(validData.map(word => word.toUpperCase()));
        
        if (secretWordsKeys.length === 0) {
            showToast("Error: Empty JSON dictionary!");
            return;
        }
        
        currentWordIndex = Math.floor(Math.random() * secretWordsKeys.length);
        initGame();
        showToast("System fully loaded!");
    } catch (error) {
        console.error("Critical JSON loading error:", error);
        
        // Fallback array if local browser security policies block external file fetching
        WORD_POOL = {
            "ROBOT": "A programmable mechanical machine that can perform automated physical tasks.",
            "LOGIC": "The strict, step-by-step rules a computer follows to make decisions (If/Then).",
            "PIXEL": "The tiny individual square of colored light that builds up a digital screen image."
        };
        secretWordsKeys = Object.keys(WORD_POOL);
        initGame();
        showToast("Warning: Using local fallback data.");
    }
}

function createBoard() {
    board.innerHTML = "";
    for (let r = 0; r < ROW_COUNT; r++) {
        let rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `row-${r}`; // Added explicit row IDs for the shake animation
        for (let c = 0; c < COL_COUNT; c++) {
            let tile = document.createElement("div");
            tile.className = "tile";
            tile.id = `tile-${r}-${c}`;
            rowDiv.appendChild(tile);
        }
        board.appendChild(rowDiv);
    }
}

function initGame() {
    targetWord = secretWordsKeys[currentWordIndex % secretWordsKeys.length].toUpperCase();
    currentHint = WORD_POOL[targetWord];
    
    currentRow = 0;
    currentCol = 0;
    guesses = Array(ROW_COUNT).fill().map(() => Array(COL_COUNT).fill(""));
    gameOver = false;
    
    createBoard();
    
    document.querySelectorAll(".key").forEach(key => {
        key.removeAttribute("data-state");
    });

    document.getElementById("modal").style.display = "none";
}

document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    if (e.key === "Enter") handleEnter();
    else if (e.key === "Backspace") handleBackspace();
    else if (/^[a-zA-Z]$/.test(e.key)) handleLetter(e.key.toLowerCase());
});

document.getElementById("keyboard").addEventListener("click", (e) => {
    if (gameOver) return;
    const target = e.target.closest(".key");
    if (!target) return;
    
    const key = target.getAttribute("data-key");
    if (key === "enter") handleEnter();
    else if (key === "backspace") handleBackspace();
    else handleLetter(key);
});

function handleLetter(letter) {
    if (currentCol < COL_COUNT && currentRow < ROW_COUNT) {
        guesses[currentRow][currentCol] = letter.toUpperCase();
        const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
        tile.innerText = letter.toUpperCase();
        tile.setAttribute("data-state", "tbd");
        tile.classList.add("bounce");
        currentCol++;
    }
}

function handleBackspace() {
    if (currentCol > 0) {
        currentCol--;
        guesses[currentRow][currentCol] = "";
        const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
        tile.innerText = "";
        tile.removeAttribute("data-state");
        tile.classList.remove("bounce");
    }
}

// Verification function triggers here when ENTER is pressed
function handleEnter() {
    if (currentCol < COL_COUNT) {
        showToast("Need 5 letters!");
        return;
    }
    
    const currentGuess = guesses[currentRow].join("").toUpperCase();
    
    // --- DICTIONARY VERIFICATION MATRIX ---
    // Checks if the word exists in our massive valid list, OR matches an explicitly defined secret word
    const isValidWord = VALID_GUESSES_SET.has(currentGuess) || secretWordsKeys.includes(currentGuess);
    
    if (!isValidWord) {
        showToast("Not in word list!");
        
        // Trigger visual row-shaking physics feedback
        const activeRow = document.getElementById(`row-${currentRow}`);
        if (activeRow) {
            activeRow.style.animation = "shake 0.2s ease-in-out";
            setTimeout(() => activeRow.style.animation = "", 200);
        }
        return; // Halt logic sequence execution immediately
    }
    
    revealRow(currentRow, currentGuess);
}

function revealRow(rowNum, guess) {
    let targetLetterCounts = {};
    for (let char of targetWord) {
        targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
    }

    let tileStatuses = Array(COL_COUNT).fill("absent");

    for (let i = 0; i < COL_COUNT; i++) {
        if (guess[i] === targetWord[i]) {
            tileStatuses[i] = "correct";
            targetLetterCounts[guess[i]]--;
        }
    }

    for (let i = 0; i < COL_COUNT; i++) {
        if (tileStatuses[i] !== "correct" && targetLetterCounts[guess[i]] > 0) {
            tileStatuses[i] = "present";
            targetLetterCounts[guess[i]]--;
        }
    }

    for (let i = 0; i < COL_COUNT; i++) {
        const tile = document.getElementById(`tile-${rowNum}-${i}`);
        setTimeout(() => {
            tile.style.transform = "rotateX(90deg)";
            setTimeout(() => {
                tile.setAttribute("data-state", tileStatuses[i]);
                tile.style.transform = "rotateX(0deg)";
                if (i === COL_COUNT - 1) {
                    updateKeyboard(guess, tileStatuses);
                    checkGameEnd(guess);
                }
            }, 200);
        }, i * 150);
    }
}

function updateKeyboard(guess, statuses) {
    for (let i = 0; i < COL_COUNT; i++) {
        const letter = guess[i].toLowerCase();
        const key = document.querySelector(`.key[data-key="${letter}"]`);
        if (!key) continue;
        const currentKeyState = key.getAttribute("data-state");
        if (currentKeyState === "correct") continue;
        if (currentKeyState === "present" && statuses[i] === "absent") continue;
        key.setAttribute("data-state", statuses[i]);
    }
}

function checkGameEnd(guess) {
    if (guess === targetWord) {
        gameOver = true;
        setTimeout(() => showEndModal(true), 500);
    } else {
        currentRow++;
        currentCol = 0;
        if (currentRow >= ROW_COUNT) {
            gameOver = true;
            setTimeout(() => showEndModal(false), 500);
        }
    }
}

function showToast(message) {
    const container = document.getElementById("message-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 1000);
}

function showEndModal(isWin) {
    const modal = document.getElementById("modal");
    const title = document.getElementById("modal-title");
    const explanation = document.getElementById("modal-explanation");
    document.getElementById("target-word-display").innerText = targetWord;

    if (isWin) {
        // Left Cannon
        confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 }
        });
        // Right Cannon
        confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 }
        });
        title.innerText = "Success!";
        title.style.color = "var(--color-correct)";
        explanation.innerHTML = `<strong>Definition:</strong> ${currentHint}<br><br>Your code logic loop cracked the secret word vector successfully!`;
    } else {
        title.innerText = "You failed!";
        title.style.color = "#ff4a4a";
        explanation.innerHTML = `<strong>Definition:</strong> ${currentHint}<br><br>The algorithm ran out of guess iterations. Reset your variables and try again!`;
    }
    modal.style.display = "flex";
}

function resetGame() {
    currentWordIndex = Math.floor(Math.random() * secretWordsKeys.length);
    initGame();
}

window.onload = loadDictionaryAndStart;