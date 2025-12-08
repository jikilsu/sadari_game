const state = {
    phase: 'setup', // setup, input, game
    participants: [], // { name: '', id: 0 }
    results: [], // string values
    ladder: [], // 2D array or structure defining horiz lines
    participantCount: 0,
    ctx: null,
    canvas: null,
    columnWidth: 0,
    ladderHeight: 0,
    paddingTop: 60,
    paddingBottom: 60
};

// DOM Elements
const els = {
    phases: {
        setup: document.getElementById('setup-phase'),
        input: document.getElementById('input-phase'),
        game: document.getElementById('game-phase'),
    },
    header: document.querySelector('.game-header'),
    inputs: {
        count: document.getElementById('participant-count'),
        namesRow: document.getElementById('names-row'),
        resultsRow: document.getElementById('results-row'),
    },
    buttons: {
        apply: document.getElementById('btn-apply'),
        start: document.getElementById('btn-start'),
        reset: document.getElementById('btn-reset'),
        closeModal: document.getElementById('btn-close-modal'),
        bgmToggle: document.getElementById('bgm-toggle'),
    },
    game: {
        board: document.getElementById('game-board'),
        playersTop: document.getElementById('players-top'),
        resultsBottom: document.getElementById('results-bottom'),
        canvas: document.getElementById('ladder-canvas'),
    },
    modal: {
        self: document.getElementById('result-modal'),
        playerName: document.getElementById('modal-player-name'),
        resultValue: document.getElementById('modal-result-value'),
    }
};

// init
function init() {
    // Auto-start background music on page load
    audioManager.init();
    audioManager.startBackgroundMusic();

    // Setup BGM toggle button
    els.buttons.bgmToggle.addEventListener('click', () => {
        const isEnabled = audioManager.toggleBackgroundMusic();
        const statusText = els.buttons.bgmToggle.querySelector('.bgm-status');

        // Update button appearance
        if (isEnabled) {
            els.buttons.bgmToggle.classList.remove('off');
            statusText.textContent = 'ON';
        } else {
            els.buttons.bgmToggle.classList.add('off');
            statusText.textContent = 'OFF';
        }

        // Add pulse animation
        els.buttons.bgmToggle.classList.add('toggling');
        setTimeout(() => {
            els.buttons.bgmToggle.classList.remove('toggling');
        }, 300);
    });

    // Add sound effect for participant count changes
    els.inputs.count.addEventListener('input', () => {
        audioManager.playCountChangeSound();
    });

    els.buttons.apply.addEventListener('click', handleSetupApply);
    els.buttons.start.addEventListener('click', handleStartGame);
    els.buttons.reset.addEventListener('click', resetGame);
    els.buttons.closeModal.addEventListener('click', closeModal);

    // Canvas Resize Observer
    window.addEventListener('resize', () => {
        if (state.phase === 'game') {
            resizeCanvas();
            drawLadder();
        }
    });

    // Dynamic Sizing to Background Image with Aspect Ratio Preservation
    const bgImg = new Image();
    bgImg.src = 'background.png';
    bgImg.onload = () => {
        const container = document.querySelector('.game-container');
        const aspectRatio = bgImg.naturalWidth / bgImg.naturalHeight;

        const resizeContainer = () => {
            const viewportWidth = window.innerWidth * 0.95; // 95% of viewport width
            const viewportHeight = window.innerHeight * 0.95; // 95% of viewport height

            let targetWidth = viewportWidth;
            let targetHeight = targetWidth / aspectRatio;

            if (targetHeight > viewportHeight) {
                targetHeight = viewportHeight;
                targetWidth = targetHeight * aspectRatio;
            }

            container.style.width = `${targetWidth}px`;
            container.style.height = `${targetHeight}px`;

            // Adjust styles to let JS control exact pixels
            container.style.maxWidth = 'none';
            container.style.maxHeight = 'none';

            // If in game phase, we need to resize canvas immediately
            if (state.phase === 'game') {
                resizeCanvas();
                drawLadder();
            }
        };

        // Initial resize
        resizeContainer();

        // Add resize listener
        window.addEventListener('resize', resizeContainer);
    };
}

function switchPhase(newPhase) {
    Object.values(els.phases).forEach(el => el.classList.add('hidden'));
    els.phases[newPhase].classList.remove('hidden');
    state.phase = newPhase;

    if (newPhase === 'setup') {
        els.header.classList.remove('hidden');
    } else {
        els.header.classList.add('hidden');
    }

    // Toggle Bottom Align for Game Phase
    const container = document.querySelector('.game-container');
    if (newPhase === 'game') {
        container.classList.add('bottom-align');
    } else {
        container.classList.remove('bottom-align');
    }
}

// Handler: Setup -> Input
function handleSetupApply() {
    const count = parseInt(els.inputs.count.value);
    if (!count || count < 2 || count > 14) {
        alert('Please enter a number between 2 and 14.');
        return;
    }

    // Play apply sound
    audioManager.playApplySound();

    state.participantCount = count;
    generateInputs(count);
    switchPhase('input');
}

// Generate Input Fields
function generateInputs(count) {
    els.inputs.namesRow.innerHTML = '';
    els.inputs.resultsRow.innerHTML = '';

    for (let i = 0; i < count; i++) {
        // Name Input
        const nameInput = document.createElement('input');
        nameInput.placeholder = `User ${i + 1}`;
        nameInput.dataset.index = i;
        nameInput.value = `P${i + 1}`;
        els.inputs.namesRow.appendChild(nameInput);

        // Result Input
        const resultInput = document.createElement('input');
        resultInput.placeholder = `Result ${i + 1}`;
        resultInput.dataset.index = i;
        resultInput.value = i % 2 === 0 ? "Win" : "Lose"; // Defaults
        els.inputs.resultsRow.appendChild(resultInput);
    }
}

// Handler: Input -> Game
function handleStartGame() {
    // Play start game sound
    audioManager.playStartGameSound();

    // Gather data
    const nameInputs = els.inputs.namesRow.querySelectorAll('input');
    const resultInputs = els.inputs.resultsRow.querySelectorAll('input');

    state.participants = Array.from(nameInputs).map((input, i) => ({
        name: input.value || `P${i + 1}`,
        id: i,
        done: false
    }));

    state.results = Array.from(resultInputs).map((input, idx) => input.value || `R${idx + 1}`);

    generateLadderData();
    setupGameBoardUI();
    switchPhase('game');

    // Initialize Canvas
    setTimeout(() => {
        state.canvas = els.game.canvas;
        state.ctx = state.canvas.getContext('2d');
        resizeCanvas();
        drawLadder();
    }, 100);
}

// Logic: Generate Ladder Structure
// We will use a grid system.
// ladder[step][col] = 1 means there is a bridge to the right (col -> col+1)
// We avoid consecutive horizontal lines.
function generateLadderData() {
    const steps = 15; // Number of vertical steps (complexity)
    const cols = state.participantCount;
    state.ladder = [];

    // Initialize blank
    for (let i = 0; i < steps; i++) {
        state.ladder[i] = new Array(cols - 1).fill(0);
    }

    // Randomize
    for (let col = 0; col < cols - 1; col++) {
        for (let row = 0; row < steps; row++) {
            // 40% chance of bridge, but check constraints
            if (Math.random() < 0.4) {
                // Check left neighbor (col-1) at same row to avoid collision
                // If col > 0 and ladder[row][col-1] == 1, we can't place here
                const leftNeighborHasBridge = (col > 0 && state.ladder[row][col - 1] === 1);

                if (!leftNeighborHasBridge) {
                    state.ladder[row][col] = 1;
                }
            }
        }
    }
}

// UI: Setup Game Board placeholders
function setupGameBoardUI() {
    els.game.playersTop.innerHTML = '';
    els.game.resultsBottom.innerHTML = '';

    state.participants.forEach((p, i) => {
        // TOP: Wrapper with GO button and Name
        const wrapper = document.createElement('div');
        wrapper.className = 'player-wrapper';
        wrapper.style.width = `${100 / state.participantCount}%`;

        const btn = document.createElement('button');
        btn.className = 'go-btn';
        btn.innerText = 'GO';
        btn.onclick = () => {
            audioManager.playGoSound();
            runGameFor(i, btn);
        };

        const nameTag = document.createElement('div');
        nameTag.className = 'name-tag';
        nameTag.innerText = p.name;

        wrapper.appendChild(btn);
        wrapper.appendChild(nameTag);
        els.game.playersTop.appendChild(wrapper);

        // BOTTOM: Results
        const resWrapper = document.createElement('div');
        resWrapper.className = 'player-wrapper';
        resWrapper.style.width = `${100 / state.participantCount}%`;

        const resTag = document.createElement('div');
        resTag.className = 'result-tag';
        resTag.innerText = state.results[i];

        resWrapper.appendChild(resTag);
        els.game.resultsBottom.appendChild(resWrapper);
    });
}

function resizeCanvas() {
    const parent = els.game.board;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Match device pixel ratio to avoid blurry lines on mobile/high-DPI screens
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.canvas.style.width = `${rect.width}px`;
    state.canvas.style.height = `${rect.height}px`;

    // Draw in CSS pixel space
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate geometries using CSS pixels for consistent layout
    state.columnWidth = rect.width / state.participantCount;
    state.ladderHeight = rect.height - (state.paddingTop + state.paddingBottom);
}

// draw: Static Ladder
function drawLadder() {
    if (!state.ctx) return;
    const ctx = state.ctx;
    const { clientWidth: width, clientHeight: height } = state.canvas;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const numCols = state.participantCount;
    const numRows = state.ladder.length;
    const rowStep = state.ladderHeight / numRows;

    // Draw Vertical Lines
    for (let i = 0; i < numCols; i++) {
        const x = (i * state.columnWidth) + (state.columnWidth / 2);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.moveTo(x, state.paddingTop);
        ctx.lineTo(x, height - state.paddingBottom);
        ctx.stroke();
    }

    // Draw Horizontal Lines (Rungs)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols - 1; c++) {
            if (state.ladder[r][c] === 1) {
                const x1 = (c * state.columnWidth) + (state.columnWidth / 2);
                const x2 = ((c + 1) * state.columnWidth) + (state.columnWidth / 2);
                // Spread rungs vertically
                const y = state.paddingTop + (r * rowStep) + (rowStep / 2);

                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();
            }
        }
    }
}

// Logic + Animation: Run single player
async function runGameFor(startIndex, btnElement) {
    if (state.participants[startIndex].done) return;

    // Disable button
    btnElement.disabled = true;
    state.participants[startIndex].done = true;

    const ctx = state.ctx;
    const numRows = state.ladder.length;
    const rowStep = state.ladderHeight / numRows;

    // Animation Config
    let currentCol = startIndex;
    let currentRow = 0;

    // Coordinates
    let currentX = (currentCol * state.columnWidth) + (state.columnWidth / 2);
    let currentY = state.paddingTop; // Start Top

    // Path history for redrawing cleanly if needed (optional optimization)
    // We will just draw over the existing canvas with a colored line

    // Pick a random color for trace
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9ff3', '#54a0ff'];
    const traceColor = colors[startIndex % colors.length];

    ctx.lineWidth = 6;
    ctx.strokeStyle = traceColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = traceColor;

    // Sequential Path calculation
    // Path segment format: { x1, y1, x2, y2 }
    const pathSegments = [];

    // 1. Start from top button to first internal point
    // Actually our first internal point is at paddingTop
    // So just move there.

    // Calculate full path first
    let y = state.paddingTop;
    let col = startIndex;

    // We iterate through "cells" or intervals
    // For visualization, we treat each row index as a block.
    // The horizontal line is in the middle of the block.

    for (let r = 0; r < numRows; r++) {
        // Vertical move down to the rung level
        const nextY = state.paddingTop + (r * rowStep) + (rowStep / 2);
        pathSegments.push({ type: 'vert', x: getX(col), y1: y, y2: nextY });
        y = nextY;

        // Check for horizontal move
        // Check right
        if (col < state.participantCount - 1 && state.ladder[r][col] === 1) {
            const nextX = getX(col + 1);
            pathSegments.push({ type: 'horiz', x1: getX(col), x2: nextX, y: y });
            col++;
        }
        // Check left
        else if (col > 0 && state.ladder[r][col - 1] === 1) {
            const nextX = getX(col - 1);
            pathSegments.push({ type: 'horiz', x1: getX(col), x2: nextX, y: y });
            col--; // Move left
        }
    }

    // Final vertical drop to bottom
    const finalY = state.canvas.height - state.paddingBottom;
    pathSegments.push({ type: 'vert', x: getX(col), y1: y, y2: finalY });

    // Animate Path
    for (const segment of pathSegments) {
        await animateSegment(ctx, segment);
    }

    // Show Result
    showResult(state.participants[startIndex].name, state.results[col]);
}

function getX(col) {
    return (col * state.columnWidth) + (state.columnWidth / 2);
}

function animateSegment(ctx, segment) {
    return new Promise(resolve => {
        const { type, x, y1, y2, x1, x2, y } = segment;
        const duration = 100; // ms per segment (fast)
        const startTime = performance.now();

        // Play sound effect based on movement type
        if (type === 'horiz') {
            audioManager.playLadderMoveSound(true); // Horizontal sliding sound
        } else {
            audioManager.playLadderMoveSound(false); // Vertical bounce sound
        }

        function step(time) {
            const progress = Math.min((time - startTime) / duration, 1);

            ctx.beginPath();
            if (type === 'vert') {
                const curY = y1 + (y2 - y1) * progress;
                ctx.moveTo(x, y1);
                ctx.lineTo(x, curY);
            } else {
                const curX = x1 + (x2 - x1) * progress;
                ctx.moveTo(x1, y);
                ctx.lineTo(curX, y);
            }
            ctx.stroke();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function showResult(player, result) {
    setTimeout(() => {
        // Play appropriate result sound
        audioManager.playResultSound(result);

        els.modal.playerName.innerText = player;
        els.modal.resultValue.innerText = result;
        els.modal.self.classList.remove('hidden');
    }, 500); // Wait a bit after animation
}

function closeModal() {
    els.modal.self.classList.add('hidden');
}

function resetGame() {
    // Play reset sound
    audioManager.playResetSound();

    state.participants = [];
    state.results = [];
    state.ladder = [];
    switchPhase('setup');
}

// Start
init();
