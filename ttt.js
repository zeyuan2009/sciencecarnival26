let boardState = ["", "", "", "", "", "", "", "", ""];
let isGameActive = true;
let humanPlayer = "X";
let computerPlayer = "O";

let humanScore = 0;
let computerScore = 0;

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

const statusDisplay = document.getElementById("status");
const cells = document.querySelectorAll(".cell");
const resetBtn = document.getElementById("reset-btn");

const scoreHumanDisplay = document.getElementById("score-human");
const scoreComputerDisplay = document.getElementById("score-computer");

// Cell Grid Event Listener Routing
cells.forEach(cell => {
    cell.addEventListener("click", handleCellClick);
});

resetBtn.addEventListener("click", resetGrid);

function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute("data-index"));

    // Prevent interactions if space is taken or game loop is frozen
    if (boardState[clickedCellIndex] !== "" || !isGameActive) return;

    // 1. Human Move Phase
    makeMove(clickedCellIndex, humanPlayer);

    // 2. Evaluate Board State After Human Placement
    if (checkWin(humanPlayer)) {
        endGame(humanPlayer);
        return;
    }

    if (checkDraw()) {
        endGame("draw");
        return;
    }

    // 3. Shift Control Matrix to Computer Bot
    statusDisplay.innerText = "Computer Bot processing paths...";
    isGameActive = false; // Freeze input interactions temporarily

    setTimeout(() => {
        const botOptimalMove = getBotMove();
        makeMove(botOptimalMove, computerPlayer);

        if (checkWin(computerPlayer)) {
            endGame(computerPlayer);
            return;
        }

        if (checkDraw()) {
            endGame("draw");
            return;
        }

        // Restore human play permissions
        isGameActive = true;
        statusDisplay.innerText = "Your turn! Tap an empty cell.";
    }, 400); // Processing delay creates realistic "bot thinking" feel
}

function makeMove(index, player) {
    boardState[index] = player;
    const targetCell = document.querySelector(`.cell[data-index="${index}"]`);
    targetCell.innerText = player;
    targetCell.setAttribute("data-player", player);
    targetCell.classList.add("taken");
}

// Bot Decision Architecture
function getBotMove() {
    // Phase A: Offensive Look-ahead (Can Bot Win Immediately?)
    for (let combo of WINNING_COMBINATIONS) {
        let openSpot = findWinningSpot(combo, computerPlayer);
        if (openSpot !== null) return openSpot;
    }

    // Phase B: Defensive Intervention (Is Human About to Win?)
    for (let combo of WINNING_COMBINATIONS) {
        let openSpot = findWinningSpot(combo, humanPlayer);
        if (openSpot !== null) return openSpot;
    }

    // Phase C: Positional Strategy (Claim Center Grid Matrix if Empty)
    if (boardState[4] === "") return 4;

    // Phase D: Random Available Index Fallback
    let emptyCells = [];
    boardState.forEach((val, idx) => { if (val === "") emptyCells.push(idx); });
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function findWinningSpot(combination, playerTarget) {
    let matches = 0;
    let emptyIndex = null;

    for (let index of combination) {
        if (boardState[index] === playerTarget) matches++;
        else if (boardState[index] === "") emptyIndex = index;
    }

    if (matches === 2 && emptyIndex !== null) return emptyIndex;
    return null;
}

function checkWin(player) {
    return WINNING_COMBINATIONS.some(combination => {
        const winDetected = combination.every(index => boardState[index] === player);
        if (winDetected) {
            highlightWinnerLine(combination, player);
        }
        return winDetected;
    });
}

function checkDraw() {
    return boardState.every(cell => cell !== "");
}

// Dynamic highlight mapping depending on who triggered the win state
function highlightWinnerLine(combination, winner) {
    combination.forEach(index => {
        const cell = document.querySelector(`.cell[data-index="${index}"]`);
        if (winner === humanPlayer) {
            cell.classList.add("winner-human");
        } else {
            cell.classList.add("winner-bot");
        }
    });
}

function endGame(outcome) {
    isGameActive = false;
    if (outcome === humanPlayer) {
        statusDisplay.innerText = "You Win!";
        humanScore++;
        scoreHumanDisplay.innerText = humanScore;
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
    } else if (outcome === computerPlayer) {
        statusDisplay.innerText = "You lost!";
        computerScore++;
        scoreComputerDisplay.innerText = computerScore;
    } else {
        statusDisplay.innerText = "It's a tie!";
    }
}

function resetGrid() {
    boardState = ["", "", "", "", "", "", "", "", ""];
    isGameActive = true;
    statusDisplay.innerText = "Your turn! Tap an empty cell.";
    
    cells.forEach(cell => {
        cell.innerText = "";
        cell.className = "cell";
        cell.removeAttribute("data-player");
    });
}