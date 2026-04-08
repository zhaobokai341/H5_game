const VIEW_SIZE = 10;
let SIZE = 21;
let mazeLayout = [];
let playerPos = { x: 1, y: 1 };
let goalPos = { x: 0, y: 0 };
let gameActive = false;
let timerStarted = false;
let secondsElapsed = 0;
let timerInterval = null;

window.onload = initGame;

function generateMaze(size) {
    if (size % 2 === 0) size++;
    SIZE = size;
    let grid = Array(size).fill().map(() => Array(size).fill(1));
    function walk(x, y) {
        grid[y][x] = 0;
        let dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === 1) {
                grid[y + dy/2][x + dx/2] = 0;
                walk(nx, ny);
            }
        }
    }
    walk(1, 1);
    goalPos = { x: size - 2, y: size - 2 };
    grid[goalPos.y][goalPos.x] = 3;
    return grid;
}

function render() {
    const viewport = document.getElementById('maze-viewport');
    viewport.innerHTML = '';
    let vX = Math.max(0, Math.min(playerPos.x - 5, SIZE - VIEW_SIZE));
    let vY = Math.max(0, Math.min(playerPos.y - 5, SIZE - VIEW_SIZE));

    for (let y = vY; y < vY + VIEW_SIZE; y++) {
        for (let x = vX; x < vX + VIEW_SIZE; x++) {
            const div = document.createElement('div');
            const type = mazeLayout[y][x];
            div.className = `cell ${type === 1 ? 'wall' : type === 3 ? 'goal' : 'path'}`;
            if (playerPos.x === x && playerPos.y === y) div.classList.add('player');
            viewport.appendChild(div);
        }
    }
}

function movePlayer(dx, dy) {
    if (!gameActive || document.getElementById('minimap-container').classList.contains('zoomed')) return;

    if (!timerStarted) {
        timerStarted = true;
        timerInterval = setInterval(() => {
            secondsElapsed++;
            document.getElementById('timer').innerText = secondsElapsed;
        }, 1000);
    }

    let nx = playerPos.x + dx;
    let ny = playerPos.y + dy;

    if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && mazeLayout[ny][nx] !== 1) {
        playerPos.x = nx;
        playerPos.y = ny;
        render();
        if (mazeLayout[ny][nx] === 3) {
            gameActive = false;
            clearInterval(timerInterval);
            document.getElementById('status').innerText = `🏆 Escaped in ${secondsElapsed}s!`;
        }
    }
}

function toggleMap() {
    const container = document.getElementById('minimap-container');
    const isZoomed = container.classList.toggle('zoomed');
    const minimap = document.getElementById('minimap');
    const navHint = document.getElementById('nav-hint');

    if (isZoomed) {
        minimap.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const div = document.createElement('div');
                div.className = `m-cell ${mazeLayout[y][x] === 1 ? 'm-wall' : mazeLayout[y][x] === 3 ? 'm-goal' : 'm-path'}`;
                if (playerPos.x === x && playerPos.y === y) div.classList.add('m-player');
                minimap.appendChild(div);
            }
        }
        let v = playerPos.y < goalPos.y ? "South" : playerPos.y > goalPos.y ? "North" : "";
        let h = playerPos.x < goalPos.x ? "East" : playerPos.x > goalPos.x ? "West" : "";
        navHint.innerText = `Direction: ${v} ${h}`;
    } else {
        minimap.innerHTML = '';
    }
}

function initGame() {
    clearInterval(timerInterval);
    timerStarted = false;
    secondsElapsed = 0;
    document.getElementById('timer').innerText = "0";
    let reqSize = parseInt(document.getElementById('sizeInput').value) || 21;
    mazeLayout = generateMaze(reqSize);
    playerPos = { x: 1, y: 1 };
    gameActive = true;
    render();
}

window.addEventListener('keydown', (e) => {
    if (e.key === "ArrowUp") movePlayer(0, -1);
    if (e.key === "ArrowDown") movePlayer(0, 1);
    if (e.key === "ArrowLeft") movePlayer(-1, 0);
    if (e.key === "ArrowRight") movePlayer(1, 0);
});
