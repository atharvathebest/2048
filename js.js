const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const gameOverMessage = document.getElementById('game-over-message');

const SIZE = 4;
const CELL_SIZE = 97.5;
const GAP = 10; // gap between cells (matches the padding calculation)

let grid = []; // Logical grid (stores numbers)
let tiles = []; // Visual tiles (stores DOM elements)
let score = 0;

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
}

function restartGame() {
    // Reset Logic
    grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    tiles = []; 
    score = 0;
    scoreDisplay.textContent = score;
    gameOverMessage.classList.add('hidden');

    // Clear existing tiles
    const existingTiles = document.querySelectorAll('.tile');
    existingTiles.forEach(t => t.remove());

    spawnTile();
    spawnTile();
}

// --- CORE LOGIC ---

function spawnTile() {
    let emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) emptyCells.push({r, c});
        }
    }

    if (emptyCells.length === 0) return;

    const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    
    grid[r][c] = value;
    createTileElement(r, c, value);
}

function createTileElement(r, c, value) {
    const tile = document.createElement('div');
    tile.classList.add('tile', `tile-${value}`, 'new-tile');
    tile.textContent = value;
    
    // Set explicit position
    tile.style.top = `${r * (CELL_SIZE + GAP) + GAP}px`;
    tile.style.left = `${c * (CELL_SIZE + GAP) + GAP}px`;

    // Add unique ID to track this specific DOM element
    tile.dataset.r = r;
    tile.dataset.c = c;
    
    gameBoard.appendChild(tile);
    tiles.push(tile);
    
    // Remove animation class after it plays
    setTimeout(() => tile.classList.remove('new-tile'), 200);
}

function updateVisuals() {
    // This function synchronizes the visual tiles with their new logical positions
    // It finds the tile element that matches the "old" position logic, but here 
    // we simply iterate and update based on the new logic.
    
    // To handle smooth animations, we actually need to update the EXISTING dom elements
    // to their new top/left coordinates.
    
    // Simple approach: Clear and Redraw is jerky. 
    // Smooth approach: Update the .style.top/left of the specific tile objects.
    // However, managing object identity is complex.
    
    // SIMPLIFIED STABLE APPROACH (Re-rendering with correct classes):
    // To ensure "floating 2" is fixed, we will wipe and redraw. 
    // Note: This sacrifices the "slide" animation for "pop" animation, 
    // but GUARANTEES the board state is visually correct.
    
    const existingTiles = document.querySelectorAll('.tile');
    existingTiles.forEach(t => t.remove());

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] !== 0) {
                // Re-create tile (Pop animation will play)
                // If you want slide, you need complex ID tracking.
                // Given the bugs, this is the most stable version.
                const tile = document.createElement('div');
                tile.classList.add('tile', `tile-${grid[r][c]}`);
                tile.textContent = grid[r][c];
                tile.style.top = `${r * (CELL_SIZE + GAP) + GAP}px`;
                tile.style.left = `${c * (CELL_SIZE + GAP) + GAP}px`;
                gameBoard.appendChild(tile);
            }
        }
    }
}

// --- MOVEMENT LOGIC ---

function slide(row) {
    // Filter zeros
    let arr = row.filter(val => val !== 0);
    // Merge
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            score += arr[i];
            arr[i + 1] = 0;
        }
    }
    // Filter zeros again after merge
    arr = arr.filter(val => val !== 0);
    // Pad with zeros
    while (arr.length < SIZE) {
        arr.push(0);
    }
    return arr;
}

function move(direction) {
    let hasMoved = false;
    let newGrid = JSON.parse(JSON.stringify(grid)); // Deep copy

    if (direction === 'ArrowLeft') {
        for (let r = 0; r < SIZE; r++) {
            const newRow = slide(newGrid[r]);
            if (JSON.stringify(newGrid[r]) !== JSON.stringify(newRow)) hasMoved = true;
            newGrid[r] = newRow;
        }
    } else if (direction === 'ArrowRight') {
        for (let r = 0; r < SIZE; r++) {
            let row = newGrid[r].reverse();
            let newRow = slide(row);
            newRow.reverse();
            if (JSON.stringify(newGrid[r]) !== JSON.stringify(newRow)) hasMoved = true;
            newGrid[r] = newRow;
        }
    } else if (direction === 'ArrowUp') {
        for (let c = 0; c < SIZE; c++) {
            let col = [];
            for (let r = 0; r < SIZE; r++) col.push(newGrid[r][c]);
            let newCol = slide(col);
            for (let r = 0; r < SIZE; r++) {
                if (newGrid[r][c] !== newCol[r]) hasMoved = true;
                newGrid[r][c] = newCol[r];
            }
        }
    } else if (direction === 'ArrowDown') {
        for (let c = 0; c < SIZE; c++) {
            let col = [];
            for (let r = 0; r < SIZE; r++) col.push(newGrid[r][c]);
            col.reverse();
            let newCol = slide(col);
            newCol.reverse();
            for (let r = 0; r < SIZE; r++) {
                if (newGrid[r][c] !== newCol[r]) hasMoved = true;
                newGrid[r][c] = newCol[r];
            }
        }
    }

    if (hasMoved) {
        grid = newGrid;
        scoreDisplay.textContent = score;
        updateVisuals(); // Re-render board
        spawnTile(); // Add new tile
        
        if (isGameOver()) {
            setTimeout(() => gameOverMessage.classList.remove('hidden'), 500);
        }
    }
}

function isGameOver() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) return false;
            if (c < SIZE - 1 && grid[r][c] === grid[r][c+1]) return false;
            if (r < SIZE - 1 && grid[r][c] === grid[r+1][c]) return false;
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
restartGame();