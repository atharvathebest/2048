const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const gameOverMessage = document.getElementById('game-over-message');

const SIZE = 4;
const CELL_SIZE = 97.5;
const GAP = 10; 

let cells = []; // The logical grid (stores Tile objects or null)
let score = 0;
let isProcessing = false; // Prevents rapid key spamming during animation

// --- CLASS FOR TILE MANAGEMENT ---
class Tile {
    constructor(gameBoard, value, r, c) {
        this.value = value;
        this.r = r;
        this.c = c;
        this.element = document.createElement('div');
        this.element.classList.add('tile', `tile-${value}`, 'new-tile');
        this.element.textContent = value;
        
        // Initial Position
        this.setPosition(r, c);
        
        gameBoard.appendChild(this.element);
        
        // Remove 'new-tile' class after pop animation
        setTimeout(() => this.element.classList.remove('new-tile'), 200);
    }

    setPosition(r, c) {
        this.r = r;
        this.c = c;
        this.element.style.top = `${r * (CELL_SIZE + GAP) + GAP}px`;
        this.element.style.left = `${c * (CELL_SIZE + GAP) + GAP}px`;
    }

    setValue(value) {
        this.value = value;
        this.element.textContent = value;
        this.element.className = `tile tile-${value}`; // Reset classes, apply color
        this.element.classList.add('merged-tile'); // Add pulse animation
        setTimeout(() => this.element.classList.remove('merged-tile'), 200);
    }

    remove() {
        this.element.remove();
    }
}

// --- INITIALIZATION ---

function setupBoard() {
    gameBoard.innerHTML = '';
    // Create background grid cells (visual only)
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.style.top = `${r * (CELL_SIZE + GAP) + GAP}px`;
            cell.style.left = `${c * (CELL_SIZE + GAP) + GAP}px`;
            gameBoard.appendChild(cell);
        }
    }
    
    cells = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    score = 0;
    isProcessing = false;
    spawnTile();
    spawnTile();
}

function restartGame() {
    // Remove all existing tile elements from DOM
    cells.flat().forEach(tile => {
        if(tile) tile.remove();
    });
    
    cells = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    score = 0;
    scoreDisplay.textContent = 0;
    gameOverMessage.classList.add('hidden');
    isProcessing = false;
    
    spawnTile();
    spawnTile();
}

// --- CORE LOGIC ---

function spawnTile() {
    let emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (cells[r][c] === null) emptyCells.push({r, c});
        }
    }

    if (emptyCells.length === 0) return;

    const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    
    cells[r][c] = new Tile(gameBoard, value, r, c);
}

// --- MOVEMENT LOGIC ---

// Returns a promise that resolves when animation is done
async function move(direction) {
    if (isProcessing) return;
    isProcessing = true;

    let hasMoved = false;
    const promises = []; // Store animations

    // Defines the traversal order based on direction
    let rStart = 0, rEnd = SIZE, rStep = 1;
    let cStart = 0, cEnd = SIZE, cStep = 1;

    if (direction === 'ArrowRight') { cStart = SIZE - 1; cEnd = -1; cStep = -1; }
    if (direction === 'ArrowDown')  { rStart = SIZE - 1; rEnd = -1; rStep = -1; }

    // We merge flags to prevent double merging in one slide
    let mergedFlags = Array(SIZE).fill(null).map(() => Array(SIZE).fill(false));

    // Iterate through the grid in the correct order
    for (let r = rStart; r !== rEnd; r += rStep) {
        for (let c = cStart; c !== cEnd; c += cStep) {
            const tile = cells[r][c];
            if (!tile) continue;

            let nextR = r;
            let nextC = c;
            
            // Calculate farthest valid position
            while (true) {
                let checkR = nextR;
                let checkC = nextC;

                if (direction === 'ArrowUp') checkR--;
                else if (direction === 'ArrowDown') checkR++;
                else if (direction === 'ArrowLeft') checkC--;
                else if (direction === 'ArrowRight') checkC++;

                // Bounds Check
                if (checkR < 0 || checkR >= SIZE || checkC < 0 || checkC >= SIZE) break;

                const target = cells[checkR][checkC];

                // If empty, we can move there
                if (!target) {
                    nextR = checkR;
                    nextC = checkC;
                } 
                // If occupied, check for merge
                else if (target.value === tile.value && !mergedFlags[checkR][checkC]) {
                    nextR = checkR;
                    nextC = checkC;
                    break; // Stop checking, we found a merge
                } 
                else {
                    break; // Blocked by different value or already merged
                }
            }

            // If the tile is moving
            if (nextR !== r || nextC !== c) {
                hasMoved = true;
                const target = cells[nextR][nextC];

                // Update Logical Grid immediately (so next iterations see it)
                cells[r][c] = null;
                
                // Animation Logic
                tile.setPosition(nextR, nextC); // CSS transition starts here

                if (target) {
                    // It's a merge
                    mergedFlags[nextR][nextC] = true;
                    // Keep the target in the cell for now (visual only)
                    // The 'tile' object (incoming) is not put in cells array yet
                    // We handle the actual value update after animation
                    promises.push({ type: 'merge', from: tile, into: target, r: nextR, c: nextC });
                } else {
                    // Simple move
                    cells[nextR][nextC] = tile;
                }
            }
        }
    }

    if (hasMoved) {
        // Wait for CSS transition (150ms)
        await new Promise(resolve => setTimeout(resolve, 150));

        // Process Merges after animation finishes
        promises.forEach(p => {
            if (p.type === 'merge') {
                p.from.remove(); // Remove the tile that moved
                p.into.setValue(p.into.value * 2); // Update value of stationary tile
                score += p.into.value;
                cells[p.r][p.c] = p.into; // Ensure grid points to the survivor
            }
        });

        scoreDisplay.textContent = score;
        spawnTile();

        if (checkGameOver()) {
            setTimeout(() => gameOverMessage.classList.remove('hidden'), 500);
        }
    }

    isProcessing = false;
}

function checkGameOver() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!cells[r][c]) return false; // Empty cell exists
            
            // Check neighbors
            const val = cells[r][c].value;
            if (c < SIZE - 1 && cells[r][c+1] && cells[r][c+1].value === val) return false;
            if (r < SIZE - 1 && cells[r+1][c] && cells[r+1][c].value === val) return false;
        }
    }
    return true;
}

// --- EVENTS ---

window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        move(e.key);
    }
});

// Start game
setupBoard();
// Inside script.js, find where we set the class:
this.element.className = `tile tile-${value}`; 

// If you want a fallback for huge numbers, you can change it to:
// this.element.className = `tile tile-${value > 2048 ? 'super' : value}`;
