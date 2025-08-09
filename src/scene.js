
import gsap from "gsap";
import CryptoJS from 'crypto-js';

export class Scene {
    setUp(e) {
        this.e = e;
    }

    buildScene() {
        this.action = "set up";

        // Game configuration
        this.GRID_SIZE = 9;
        this.JEWEL_TYPES = 5; // Configurable number of jewel types
        this.grid = [];
        this.isAnimating = false;
        this.score = 0;
        this.timeLeft = 120;
        this.gameStarted = false;
        this.gameOver = false;
        this.debugMode = false; // Track debug mode for numbers
        this.gridOverlayVisible = false; // Track grid overlay visibility
        
        // Jewel colors and letters - add more colors as needed
        this.jewelColors = ['#FF6B6B', '#4ECDC4', '#0066FF', '#FFA726', '#9B59B6']; // Red, Teal, Primary Blue, Orange, Purple
        this.jewelLetters = ['r', 't', 'b', 'o', 'p']; // r=red, t=teal, b=blue, o=orange, p=purple
        
        // Initialize game
        this.initializeGrid();
        this.createGameHTML();
        this.bindEvents();
        this.showStartMenu();
    }

    initializeGrid() {
        this.grid = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                this.grid[row][col] = Math.floor(Math.random() * this.JEWEL_TYPES);
            }
        }
        
        // Remove initial matches
        this.removeInitialMatches();
    }

    removeInitialMatches() {
        let hasMatches = true;
        let iterations = 0;
        
        while (hasMatches && iterations < 100) {
            hasMatches = false;
            iterations++;
            
            for (let row = 0; row < this.GRID_SIZE; row++) {
                for (let col = 0; col < this.GRID_SIZE; col++) {
                    if (this.wouldCreateMatch(row, col, this.grid[row][col])) {
                        this.grid[row][col] = Math.floor(Math.random() * this.JEWEL_TYPES);
                        hasMatches = true;
                    }
                }
            }
        }
    }

    wouldCreateMatch(row, col, jewelType) {
        // Check horizontal match
        let horizontalCount = 1;
        for (let c = col - 1; c >= 0 && this.grid[row][c] === jewelType; c--) horizontalCount++;
        for (let c = col + 1; c < this.GRID_SIZE && this.grid[row][c] === jewelType; c++) horizontalCount++;
        if (horizontalCount >= 3) return true;
        
        // Check vertical match
        let verticalCount = 1;
        for (let r = row - 1; r >= 0 && this.grid[r][col] === jewelType; r--) verticalCount++;
        for (let r = row + 1; r < this.GRID_SIZE && this.grid[r][col] === jewelType; r++) verticalCount++;
        return verticalCount >= 3;
    }

    createGameHTML() {
        const existingContainer = document.getElementById('jewelGameContainer');
        if (existingContainer) existingContainer.remove();
        
        const gameContainer = document.createElement('div');
        gameContainer.id = 'jewelGameContainer';
        gameContainer.innerHTML = `<div id="jewelGrid" class="jewel-grid"></div>`;
        document.body.appendChild(gameContainer);
        
        this.renderGrid();
    }

    renderGrid() {
        const gridElement = document.getElementById('jewelGrid');
        if (!gridElement) return;
        
        gridElement.innerHTML = '';
        
        // Calculate jewel size
        const gridWidth = gridElement.offsetWidth - 20;
        const gridHeight = gridElement.offsetHeight - 20;
        this.jewelSize = Math.floor(Math.min(gridWidth / this.GRID_SIZE, gridHeight / this.GRID_SIZE) - 2);
        this.jewelGap = 2;
        this.gridPadding = 10;
        
        // Create jewels
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const jewelElement = document.createElement('div');
                jewelElement.className = 'jewel';
                jewelElement.dataset.row = row;
                jewelElement.dataset.col = col;
                jewelElement.dataset.color = this.jewelLetters[this.grid[row][col]];
                jewelElement.style.backgroundColor = this.jewelColors[this.grid[row][col]];
                jewelElement.style.width = `${this.jewelSize}px`;
                jewelElement.style.height = `${this.jewelSize}px`;
                jewelElement.style.left = `${this.gridPadding + col * (this.jewelSize + this.jewelGap)}px`;
                jewelElement.style.top = `${this.gridPadding + row * (this.jewelSize + this.jewelGap)}px`;
                // Debug numbers removed - will be shown with G key
                gridElement.appendChild(jewelElement);
            }
        }
    }

    bindEvents() {
        const gridElement = document.getElementById('jewelGrid');
        if (!gridElement) return;
        
        this.isGesturing = false;
        this.gestureStartJewel = null;
        this.startX = 0;
        this.startY = 0;
        this.hasTriggeredSwap = false;
        
        gridElement.addEventListener('mousedown', (e) => this.handleDragStart(e));
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        gridElement.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleDragEnd(e), { passive: true });
        gridElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Add key listeners for debugging
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.logAllBlocks();
            } else if (e.key === 'g' || e.key === 'G') {
                this.toggleDebugNumbers();
            } else if (e.key === 'h' || e.key === 'H') {
                this.toggleGridOverlay();
            }
        });
    }

    showStartMenu() {
        const startMenu = document.getElementById('startMenu');
        const playButton = document.getElementById('playButton');
        const instructionsButton = document.getElementById('instructionsButton');
        const instructionsOverlay = document.getElementById('instructionsOverlay');
        const closeInstructionsButton = document.getElementById('closeInstructionsButton');
        
        if (startMenu && playButton) {
            startMenu.style.display = 'flex';
            playButton.onclick = () => this.startGame();
            
            if (instructionsButton && instructionsOverlay && closeInstructionsButton) {
                instructionsButton.onclick = () => instructionsOverlay.style.display = 'flex';
                closeInstructionsButton.onclick = () => instructionsOverlay.style.display = 'none';
                instructionsOverlay.onclick = (e) => {
                    if (e.target === instructionsOverlay) instructionsOverlay.style.display = 'none';
                };
            }
        }
    }

    startGame() {
        const startMenu = document.getElementById('startMenu');
        if (startMenu) startMenu.style.display = 'none';
        
        this.gameStarted = true;
        this.startTimer();
        this.updateScoreDisplay();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) this.endGame();
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timerDiv = document.getElementById('timerDiv');
        if (timerDiv) timerDiv.textContent = timeString;
    }

    updateScoreDisplay() {
        const scoreDiv = document.getElementById('scoreDiv');
        if (scoreDiv) scoreDiv.textContent = `SCORE: ${this.score}`;
    }

    handleDragStart(e) {
        if (this.isAnimating || this.gameOver || !this.gameStarted) return;
        
        e.preventDefault();
        const jewelElement = e.target.closest('.jewel');
        if (!jewelElement) return;
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        this.isGesturing = true;
        this.gestureStartJewel = {
            row: parseInt(jewelElement.dataset.row),
            col: parseInt(jewelElement.dataset.col),
            element: jewelElement
        };
        
        this.startX = clientX;
        this.startY = clientY;
        this.hasTriggeredSwap = false;
        
        this.highlightJewel(this.gestureStartJewel.row, this.gestureStartJewel.col, true);
    }

    handleDragMove(e) {
        if (!this.isGesturing || !this.gestureStartJewel || this.hasTriggeredSwap) return;
        
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;
        const threshold = 12;
        
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            let targetRow = this.gestureStartJewel.row;
            let targetCol = this.gestureStartJewel.col;
            let hasValidTarget = false;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > threshold && targetCol < this.GRID_SIZE - 1) {
                    targetCol++;
                    hasValidTarget = true;
                } else if (deltaX < -threshold && targetCol > 0) {
                    targetCol--;
                    hasValidTarget = true;
                }
            } else {
                if (deltaY > threshold && targetRow < this.GRID_SIZE - 1) {
                    targetRow++;
                    hasValidTarget = true;
                } else if (deltaY < -threshold && targetRow > 0) {
                    targetRow--;
                    hasValidTarget = true;
                }
            }
            
            if (hasValidTarget) {
                this.hasTriggeredSwap = true;
                this.isAnimating = true;
                // this.clearAllHighlights();
                this.attemptSwap(this.gestureStartJewel.row, this.gestureStartJewel.col, targetRow, targetCol);
            }
        }
    }

    handleDragEnd(e) {
        if (!this.isGesturing) return;
        e.preventDefault();
        // this.clearAllHighlights();
        this.isGesturing = false;
        this.gestureStartJewel = null;
        this.hasTriggeredSwap = false;
    }

    clearAllHighlights() {
        // const jewels = document.querySelectorAll('.jewel');
        // jewels.forEach(jewel => {
        //     jewel.style.transform = 'scale(1)';
        //     jewel.classList.remove('drag-target');
        // });
    }

    highlightJewel(row, col, highlight) {
        const jewelElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (jewelElement) {
            if (highlight) {
                jewelElement.style.zIndex = '100';
            } else {
                jewelElement.style.zIndex = '';
            }
        }
    }

    attemptSwap(row1, col1, row2, col2) {
        const jewel1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const jewel2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        if (!jewel1 || !jewel2) {
            this.showInvalidMoveFeedback(row1, col1, row2, col2);
            return;
        }
        
        // Test the swap
        const color1 = jewel1.dataset.color;
        const color2 = jewel2.dataset.color;
        
        jewel1.dataset.color = color2;
        jewel2.dataset.color = color1;
        
        const matches = this.findMatches();
        
        jewel1.dataset.color = color1;
        jewel2.dataset.color = color2;
        
        if (matches.length > 0) {
            this.animateSwap(row1, col1, row2, col2, () => {
                this.processMatches();
            });
        } else {
            this.showInvalidMoveFeedback(row1, col1, row2, col2);
        }
    }

    findMatches() {
        const matches = [];
        const visited = new Set();
        
        console.log("=== FINDING MATCHES ===");
        
        // First, let's log the current state of the grid for debugging
        console.log("Current grid state:");
        for (let row = 0; row < this.GRID_SIZE; row++) {
            let rowStr = "";
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const jewel = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (jewel && jewel.dataset.color) {
                    rowStr += jewel.dataset.color + " ";
                } else {
                    rowStr += "- ";
                }
            }
            console.log(`Row ${row}: ${rowStr}`);
        }
        
        // Horizontal matches
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE - 2; col++) {
                const jewel1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const jewel2 = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`);
                const jewel3 = document.querySelector(`[data-row="${row}"][data-col="${col + 2}"]`);
                
                if (jewel1 && jewel2 && jewel3) {
                    const color1 = jewel1.dataset.color;
                    const color2 = jewel2.dataset.color;
                    const color3 = jewel3.dataset.color;
                    
                    // Debug: Log the actual color values
                    if (color1 && color2 && color3) {
                        console.log(`Checking horizontal at [${row},${col}]: colors=${color1},${color2},${color3}`);
                    }
                    
                    if (color1 && color2 && color3 && color1 === color2 && color2 === color3) {
                        console.log(`Found HORIZONTAL match at row ${row}, cols ${col}-${col+2}: ${color1}${color2}${color3}`);
                        console.log(`  Checking if blocks are already visited...`);
                        for (let c = col; c <= col + 2; c++) {
                            const key = `${row}-${c}`;
                            if (!visited.has(key)) {
                                matches.push({ row, col: c });
                                visited.add(key);
                                console.log(`  Added to matches: [${row},${c}] = ${color1}`);
                            } else {
                                console.log(`  Skipped [${row},${c}] = ${color1} (already visited)`);
                            }
                        }
                    }
                }
            }
        }
        
        // Vertical matches
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let row = 0; row < this.GRID_SIZE - 2; row++) {
                const jewel1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const jewel2 = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
                const jewel3 = document.querySelector(`[data-row="${row + 2}"][data-col="${col}"]`);
                
                if (jewel1 && jewel2 && jewel3) {
                    const color1 = jewel1.dataset.color;
                    const color2 = jewel2.dataset.color;
                    const color3 = jewel3.dataset.color;
                    
                    // Debug: Log the actual color values
                    if (color1 && color2 && color3) {
                        console.log(`Checking vertical at [${row},${col}]: colors=${color1},${color2},${color3}`);
                    }
                    
                    if (color1 && color2 && color3 && color1 === color2 && color2 === color3) {
                        console.log(`Found VERTICAL match at col ${col}, rows ${row}-${row+2}: ${color1}${color2}${color3}`);
                        console.log(`  Checking if blocks are already visited...`);
                        for (let r = row; r <= row + 2; r++) {
                            const key = `${r}-${col}`;
                            if (!visited.has(key)) {
                                matches.push({ row: r, col });
                                visited.add(key);
                                console.log(`  Added to matches: [${r},${col}] = ${color1}`);
                            } else {
                                console.log(`  Skipped [${r},${col}] = ${color1} (already visited)`);
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`Total matches found: ${matches.length}`);
        
        // Final debug: Log all the matches that were found
        console.log("All matches found:");
        matches.forEach((match, index) => {
            const element = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
            if (element) {
                console.log(`  Match ${index + 1}: [${match.row},${match.col}] = ${element.dataset.color}`);
            }
        });
        
        return matches;
    }

    animateSwap(row1, col1, row2, col2, callback) {
        const jewel1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const jewel2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        if (!jewel1 || !jewel2) {
            callback();
            return;
        }
        
        const deltaRow = row2 - row1;
        const deltaCol = col2 - col1;
        const translateX = deltaCol * (this.jewelSize + this.jewelGap);
        const translateY = deltaRow * (this.jewelSize + this.jewelGap);
        
        jewel1.style.zIndex = '1000';
        jewel2.style.zIndex = '999';
        
        const tl = gsap.timeline({
            onComplete: () => {
                gsap.set([jewel1, jewel2], { clearProps: "transform" });
                
                // Only swap positions, not colors
                jewel1.dataset.row = row2;
                jewel1.dataset.col = col2;
                jewel2.dataset.row = row1;
                jewel2.dataset.col = col1;
                
                // Update the actual pixel positions to match the new data attributes
                jewel1.style.left = `${this.gridPadding + col2 * (this.jewelSize + this.jewelGap)}px`;
                jewel1.style.top = `${this.gridPadding + row2 * (this.jewelSize + this.jewelGap)}px`;
                jewel2.style.left = `${this.gridPadding + col1 * (this.jewelSize + this.jewelGap)}px`;
                jewel2.style.top = `${this.gridPadding + row1 * (this.jewelSize + this.jewelGap)}px`;
                
                // Make sure the background colors are visible
                jewel1.style.backgroundColor = this.jewelColors[this.jewelLetters.indexOf(jewel1.dataset.color)];
                jewel2.style.backgroundColor = this.jewelColors[this.jewelLetters.indexOf(jewel2.dataset.color)];
                
                this.isAnimating = false;
                callback();
            }
        });
        
        tl.to(jewel1, {
            x: translateX,
            y: translateY,
            duration: 0.3,
            ease: "back.inOut(1.2)"
        }, 0)
        .to(jewel2, {
            x: -translateX,
            y: -translateY,
            duration: 0.3,
            ease: "back.inOut(1.2)"
        }, 0);
    }

    showInvalidMoveFeedback(row1, col1, row2, col2) {
        const jewel1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const jewel2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        if (!jewel1 || !jewel2) {
            this.isAnimating = false;
            return;
        }
        
        const isHorizontal = Math.abs(col2 - col1) > Math.abs(row2 - row1);
        
        const tl = gsap.timeline({
            onComplete: () => {
                this.isAnimating = false;
            }
        });
        
        if (isHorizontal) {
            tl.to([jewel1, jewel2], { x: 5, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { x: -5, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { x: 3, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { x: 0, duration: 0.05, ease: "power2.out" });
        } else {
            tl.to([jewel1, jewel2], { y: 5, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { y: -5, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { y: 3, duration: 0.05, ease: "power2.out" })
              .to([jewel1, jewel2], { y: 0, duration: 0.05, ease: "power2.out" });
        }
    }

    processMatches() {
        // CRITICAL: Sync the grid before finding matches
        this.syncInternalGridFromDOM();
        
        const matches = this.findMatches();
        
        if (matches.length === 0) {
            this.isAnimating = false;
            return;
        }
        
        // Set animating to true when processing matches
        this.isAnimating = true;
        
        const baseScore = matches.length * 10;
        this.score += baseScore;
        this.updateScoreDisplay();
        this.showScorePopup(baseScore);
        
        this.animateClearMatches(matches, () => {
            this.handleBlockFallingAfterMatch(matches);
        });
    }

    animateClearMatches(matches, callback) {
        const elements = [];
        
        matches.forEach(match => {
            const element = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
                        if (element) {
                const color = element.dataset.color;
                const row = element.dataset.row;
                const col = element.dataset.col;
                
                console.log(`CLEARING BLOCK: [${row},${col}] = ${color} - Reason: Part of match #${matches.indexOf(match) + 1} of ${matches.length} total matches`);
                elements.push(element);
            } else {
                console.error(`ERROR: Could not find element to clear at [${match.row},${match.col}]`);
            }
        });
        
        // Mark elements as cleared and void immediately
        elements.forEach(element => {
            element.dataset.cleared = 'true';
            element.dataset.void = 'true'; // Mark as void so it's not counted in sync
        });
        
        // Update the grid
        matches.forEach(match => {
            this.grid[match.row][match.col] = -1;
        });
        
        // Create a timeline for the spin and shrink animation
        const tl = gsap.timeline({
            onComplete: () => {
                console.log("Match spin and shrink animation complete, proceeding to block falling...");
            callback();
            }
        });
        
        // Spin and shrink animation - 0.25 seconds total
        tl.to(elements, {
            rotation: 360,
            scale: 0,
            duration: 0.25,
            ease: "power2.out",
            transformOrigin: "center center"
        }, 0); // Start immediately
        
        console.log(`Started spin and shrink animation for ${elements.length} matched blocks`);
    }
    
    handleBlockFallingAfterMatch(matches) {
        const clearedPerColumn = new Array(this.GRID_SIZE).fill(0);
        matches.forEach(match => {
            clearedPerColumn[match.col]++;
        });
        
        const blocksToFall = [];
        
        for (let col = 0; col < this.GRID_SIZE; col++) {
            if (clearedPerColumn[col] > 0) {
                for (let row = 0; row < this.GRID_SIZE; row++) {
                    const blockElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (blockElement && !blockElement.dataset.isNew && blockElement.dataset.cleared !== 'true' && blockElement.dataset.void !== 'true') {
                        const spacesToFall = this.calculateSpacesToFall(row, col, clearedPerColumn[col]);
                        if (spacesToFall > 0) {
                            blocksToFall.push({
                                element: blockElement,
                                currentRow: row,
                                targetRow: row + spacesToFall,
                                col: col,
                                spacesToFall: spacesToFall
                            });
                        }
                    }
                }
            }
        }
        
        const newBlocks = [];
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let i = 0; i < clearedPerColumn[col]; i++) {
                const newJewelType = Math.floor(Math.random() * this.JEWEL_TYPES);
                const newBlock = this.createNewBlock(col, newJewelType, i);
                newBlocks.push(newBlock);
            }
        }
        
        const allBlocksToMove = [...blocksToFall, ...newBlocks];
        
        // Console log for missing blocks below for each column
        console.log("=== MISSING BLOCKS PER COLUMN ===");
        for (let col = 0; col < this.GRID_SIZE; col++) {
            let missingInColumn = 0;
            for (let row = 0; row < this.GRID_SIZE; row++) {
                const blockAtRow = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!blockAtRow || blockAtRow.dataset.cleared === 'true' || blockAtRow.dataset.void === 'true') {
                    missingInColumn++;
                }
            }
            console.log(`Column ${col}: ${missingInColumn} missing blocks`);
        }
        
        // Console log for all blocks to fall and new blocks
        console.log("=== BLOCKS TO FALL ===");
        blocksToFall.forEach((block, index) => {
            console.log(`Falling block ${index}: from [${block.currentRow},${block.col}] to [${block.targetRow},${block.col}] (${block.spacesToFall} spaces)`);
        });
        
        console.log("=== NEW BLOCKS ===");
        newBlocks.forEach((block, index) => {
            console.log(`New block ${index}: column ${block.col}, target row ${block.targetRow}, stack index ${block.stackIndex}`);
        });
        
        console.log("=== STARTING ANIMATION ===");
        this.isAnimating = true; // Set animating to true before starting block falling animation
        this.animateAllBlocksToFinalPositions(allBlocksToMove);
    }
    
    calculateSpacesToFall(row, col, clearedInColumn) {
        let spacesToFall = 0;
        for (let checkRow = row + 1; checkRow < this.GRID_SIZE; checkRow++) {
            const blockAtCheckRow = document.querySelector(`[data-row="${checkRow}"][data-col="${col}"]`);
            if (!blockAtCheckRow || blockAtCheckRow.dataset.cleared === 'true') {
                spacesToFall++;
            }
        }
        return spacesToFall;
    }
    
    createNewBlock(col, jewelType, stackIndex) {
        const gridElement = document.getElementById('jewelGrid');
        
        const jewelElement = document.createElement('div');
        jewelElement.className = 'jewel new-jewel';
        jewelElement.dataset.col = col;
        jewelElement.dataset.row = -1; // Temporary row for new blocks
        jewelElement.dataset.color = this.jewelLetters[jewelType];
        jewelElement.dataset.isNew = 'true';
        jewelElement.dataset.stackIndex = stackIndex;
        jewelElement.style.backgroundColor = this.jewelColors[jewelType];
        jewelElement.style.position = 'absolute';
        jewelElement.style.zIndex = '200';
        jewelElement.style.opacity = '1';
        
        // Calculate the left position based on column
        const leftPosition = this.gridPadding + col * (this.jewelSize + this.jewelGap);
        
        // Calculate the top position - start from above the grid (negative Y) and stack up
        // First block starts at 0 minus one block height, second at 0 minus two block heights, etc.
        const blockHeight = this.jewelSize + this.jewelGap;
        const topPosition = this.gridPadding - (blockHeight * (stackIndex + 1));
        
        jewelElement.style.left = `${leftPosition}px`;
        jewelElement.style.top = `${topPosition}px`;
        jewelElement.style.width = `${this.jewelSize}px`;
        jewelElement.style.height = `${this.jewelSize}px`;
        
        gridElement.appendChild(jewelElement);
        
        // Calculate where this new block should end up
        // Find the first empty space from the bottom up
        let targetRow = this.GRID_SIZE - 1;
        for (let row = this.GRID_SIZE - 1; row >= 0; row--) {
            const blockAtRow = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (!blockAtRow || blockAtRow.dataset.cleared === 'true' || blockAtRow.dataset.void === 'true') {
                // Found an empty space, this is where the new block should go
                targetRow = row;
                break;
            }
        }
        
        return {
            element: jewelElement,
            col: col,
            targetRow: targetRow,
            isNew: true,
            stackIndex: stackIndex
        };
    }
    
    animateAllBlocksToFinalPositions(allBlocks) {
        const animations = [];
        
        // Group all blocks by their column for processing
        const blocksByColumn = {};
        allBlocks.forEach(block => {
            if (!blocksByColumn[block.col]) {
                blocksByColumn[block.col] = [];
            }
            blocksByColumn[block.col].push(block);
        });
        
        // Process each column separately
        Object.keys(blocksByColumn).forEach(col => {
            const blocksInColumn = blocksByColumn[col];
            
            // Animate each block in this column
            blocksInColumn.forEach((block, index) => {
                // 1. Get the current position of the jewel
                const currentTop = parseInt(block.element.style.top) || 0;
                
                // 2. Calculate how many missing blocks are below it
                let missingBlocksBelow = 0;
                const currentRow = parseInt(block.element.dataset.row) || 0;
                
                console.log(`Calculating missing blocks for block at row ${currentRow}, col ${col}`);
                
                for (let row = currentRow + 1; row < this.GRID_SIZE; row++) {
                    const blockAtRow = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    // Only count as missing if there's no block OR if the block is cleared/void
                    if (!blockAtRow || blockAtRow.dataset.cleared === 'true' || blockAtRow.dataset.void === 'true') {
                        missingBlocksBelow++;
                        // console.log(`Row ${row} is missing (cleared: ${blockAtRow?.dataset.cleared}, void: ${blockAtRow?.dataset.void})`);
                    } else {
                        // console.log(`Row ${row} has block: ${blockAtRow.dataset.color}`);
                    }
                }
                
                console.log(`Block at [${currentRow},${col}] needs to fall ${missingBlocksBelow} spaces`);
                
                // 3. Move the jewel down by jewel height * number of blocks missing
                const moveDistance = missingBlocksBelow * (this.jewelSize + this.jewelGap);
                const targetTop = currentTop + moveDistance;
                
                // Kill any existing animations on this block
                gsap.killTweensOf(block.element);
            
                // Animate the block to its target position
            const animation = gsap.to(block.element, {
                top: targetTop,
                duration: 0.2, // 4x faster (0.8 / 4 = 0.2)
                ease: "sine.out"
            });
                
                animations.push(animation);
            });
        });
        
        // Wait for all animations to complete
        Promise.all(animations.map(anim => new Promise(resolve => {
            anim.eventCallback("onComplete", resolve);
        }))).then(() => {
            // 1. Clear out any arrays that might have stuff from the previous round
            allBlocks.length = 0;
            
            // 2. Make sure all data structures and grid info is updated
            const allJewels = document.querySelectorAll('.jewel');
            allJewels.forEach(jewel => {
                // Remove void/cleared jewels from DOM completely
                if (jewel.dataset.void === 'true' || jewel.dataset.cleared === 'true') {
                    console.log(`Destroying removed jewel at [${jewel.dataset.row},${jewel.dataset.col}]`);
                    jewel.remove();
                    return;
                }
                
                // Remove any temporary attributes from previous rounds
                delete jewel.dataset.cleared;
                delete jewel.dataset.isNew;  // CRITICAL: Remove new block flag after animation
                delete jewel.dataset.stackIndex;
                
                // Clear any innerHTML content (like "NEW" text) that might be left over
                if (jewel.innerHTML && jewel.innerHTML.trim()) {
                    jewel.innerHTML = '';
                }
                
                // Update ALL blocks to get their proper coordinates from their current Y position
                const currentTop = parseInt(jewel.style.top) || 0;
                const currentLeft = parseInt(jewel.style.left) || 0;
                const calculatedRow = Math.round((currentTop - this.gridPadding) / (this.jewelSize + this.jewelGap));
                const calculatedCol = Math.round((currentLeft - this.gridPadding) / (this.jewelSize + this.jewelGap));
                
                // Update the data attributes to match their actual visual position
                jewel.dataset.row = calculatedRow;
                jewel.dataset.col = calculatedCol;
                
                // Debug numbers removed - will be shown with G key
            });
            
            // CRITICAL: Update the internal grid to match the current DOM state
            this.syncInternalGridFromDOM();
            
            // Create visual overlay to show what's in this.grid vs DOM
            // this.createGridOverlay(); // Debug grid disabled
            
            // COMPLETE CLEANUP AND VERIFICATION
            console.log("=== FINAL CLEANUP ===");
            
            // Count all jewels to verify we have exactly 81
            const finalJewels = document.querySelectorAll('.jewel');
            console.log(`Total jewels: ${finalJewels.length} (should be 81)`);
            
            if (finalJewels.length !== 81) {
                console.error(`ERROR: Expected 81 jewels, found ${finalJewels.length}`);
                
                // Debug: Show what jewels we have
                console.log("=== JEWEL INVENTORY ===");
                finalJewels.forEach((jewel, index) => {
                    const row = jewel.dataset.row;
                    const col = jewel.dataset.col;
                    const color = jewel.dataset.color;
                    const cleared = jewel.dataset.cleared;
                    const isNew = jewel.dataset.isNew;
                    const voided = jewel.dataset.void;
                    
                    console.log(`Jewel ${index}: [${row},${col}] = ${color} (cleared: ${cleared}, new: ${isNew}, void: ${voided})`);
                });
            }
            
            // Verify each jewel has proper data attributes
            finalJewels.forEach((jewel, index) => {
                const row = parseInt(jewel.dataset.row);
                const col = parseInt(jewel.dataset.col);
                const color = jewel.dataset.color;
                
                if (row < 0 || row >= 9 || col < 0 || col >= 9) {
                    console.error(`Jewel ${index}: Invalid position [${row},${col}]`);
                }
                if (!color) {
                    console.error(`Jewel ${index}: Missing color`);
                }
            });
            
            // CRITICAL: Check for cascade matches after blocks have fallen
            console.log("=== CHECKING FOR CASCADE MATCHES ===");
            this.checkForCascadeMatches();
        });
    }
    
    updateGridFromBlockPositions(allBlocks) {
        const allJewels = document.querySelectorAll('.jewel');
        const positionMap = new Map();
        
        allJewels.forEach(jewelElement => {
            const style = window.getComputedStyle(jewelElement);
            const isVisible = style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';
            
            if (!isVisible) {
                jewelElement.remove();
                return;
            }
        });
        
        const visibleJewels = document.querySelectorAll('.jewel');
        
        visibleJewels.forEach(jewelElement => {
            const currentTop = parseInt(jewelElement.style.top) || 0;
            const currentLeft = parseInt(jewelElement.style.left) || 0;
            
            const calculatedRow = Math.round((currentTop - this.gridPadding) / (this.jewelSize + this.jewelGap));
            const calculatedCol = Math.round((currentLeft - this.gridPadding) / (this.jewelSize + this.jewelGap));
            
            if (calculatedRow >= 0 && calculatedRow < this.GRID_SIZE && 
                calculatedCol >= 0 && calculatedCol < this.GRID_SIZE) {
                
                const positionKey = `${calculatedRow},${calculatedCol}`;
                if (positionMap.has(positionKey)) {
                    jewelElement.remove();
                    return;
                }
                
                positionMap.set(positionKey, jewelElement);
                
                const oldRow = jewelElement.dataset.row;
                const oldCol = jewelElement.dataset.col;
                
                jewelElement.dataset.row = calculatedRow;
                jewelElement.dataset.col = calculatedCol;
                
                delete jewelElement.dataset.isNew;
                delete jewelElement.dataset.stackIndex;
                
                // Debug numbers removed - will be shown with G key
            }
        });
        
        const finalJewels = document.querySelectorAll('.jewel');
        finalJewels.forEach(jewelElement => {
            const row = parseInt(jewelElement.dataset.row);
            const col = parseInt(jewelElement.dataset.col);
            
            if (row < 0 || row >= this.GRID_SIZE || col < 0 || col >= this.GRID_SIZE) {
                jewelElement.remove();
            }
        });
        
        this.syncInternalGridFromDOM();
    }
    
    syncInternalGridFromDOM() {
        // Clear the grid completely
        this.grid = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                this.grid[row][col] = -1;
            }
        }
        
        // Cycle through ALL blocks in the DOM (excluding void/eliminated ones)
        const allJewels = document.querySelectorAll('.jewel');
        console.log(`Found ${allJewels.length} total jewels in DOM`);
        
        let validJewels = 0;
        allJewels.forEach((jewelElement, index) => {
            // Skip void/eliminated jewels
            if (jewelElement.dataset.void === 'true' || jewelElement.dataset.cleared === 'true') {
                console.log(`Skipping void/cleared jewel ${index}`);
                return;
            }
            
            const row = parseInt(jewelElement.dataset.row);
            const col = parseInt(jewelElement.dataset.col);
            const colorLetter = jewelElement.dataset.color;
            
            // console.log(`Valid jewel ${index}: [${row},${col}] = ${colorLetter}`);
            validJewels++;
            
            if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
                const jewelTypeIndex = this.jewelLetters.indexOf(colorLetter);
                
                if (jewelTypeIndex !== -1) {
                    this.grid[row][col] = jewelTypeIndex;
                    // console.log(`Set grid[${row}][${col}] = ${jewelTypeIndex} (${colorLetter})`);
                } else {
                    // console.error(`Invalid color letter: ${colorLetter}`);
                }
            } else {
                // console.error(`Invalid position: [${row},${col}]`);
            }
        });
        
        // console.log(`Processed ${validJewels} valid jewels`);
        
        console.log("=== FINAL GRID STATE ===");
        for (let row = 0; row < this.GRID_SIZE; row++) {
            let rowStr = "";
            for (let col = 0; col < this.GRID_SIZE; col++) {
                rowStr += this.grid[row][col] + " ";
            }
            console.log(`Row ${row}: ${rowStr}`);
        }
    }

    checkForCascadeMatches() {
        console.log("=== CHECKING FOR CASCADE MATCHES ===");
        
        // Sync the grid first to ensure we have the latest state
        this.syncInternalGridFromDOM();
        
        // Find any new matches
        const newMatches = this.findMatches();
        
        if (newMatches.length > 0) {
            console.log(`Found ${newMatches.length} cascade matches! Processing...`);
            
            // Process these new matches
            this.processMatches();
        } else {
            console.log("No cascade matches found. Ready for next turn.");
            
            // Clear all arrays and reset for fresh start
            this.isAnimating = false;
            console.log("=== READY FOR NEXT TURN ===");
        }
    }
    
    showScorePopup(points) {
        const popup = document.getElementById('scorePopup');
        if (popup) {
            popup.textContent = `+${points}`;
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, -50%) scale(1.2)';
            
            gsap.to(popup, {
                opacity: 0,
                y: "-=50",
                scale: 1,
                duration: 1,
                ease: "power2.out"
            });
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameStarted = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        const finalDiv = document.getElementById('finalDiv');
        const scoreDiv2 = document.getElementById('scoreDiv2');
        
        if (finalDiv && scoreDiv2) {
            scoreDiv2.textContent = this.score;
            finalDiv.style.display = 'flex';
            
            setTimeout(() => {
                finalDiv.onclick = () => {
                    this.restartGame();
                };
            }, 2000);
        }
    }

    restartGame() {
        const finalDiv = document.getElementById('finalDiv');
        if (finalDiv) {
            finalDiv.style.display = 'none';
        }
        
        this.score = 0;
        this.timeLeft = 120;
        this.gameOver = false;
        this.gameStarted = false;
        this.selectedJewel = null;
        this.isAnimating = false;
        
        this.initializeGrid();
        this.renderGrid();
        this.showStartMenu();
    }

    createGridOverlay() {
        // Remove any existing overlay
        const existingOverlay = document.getElementById('gridOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'gridOverlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000';
        
        // Create grid overlay
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.style.position = 'absolute';
                cell.style.left = `${this.gridPadding + col * (this.jewelSize / 2 + this.jewelGap)}px`;
                cell.style.top = `${this.gridPadding + row * (this.jewelSize / 2 + this.jewelGap)}px`;
                cell.style.width = `${this.jewelSize / 2}px`;
                cell.style.height = `${this.jewelSize / 2}px`;
                cell.style.border = '2px solid red';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '12px';
                cell.style.fontWeight = 'bold';
                cell.style.color = 'white';
                cell.style.fontFamily = 'Arial, sans-serif';
                
                // Show what's in this.grid at this position
                const gridValue = this.grid[row][col];
                const colorLetter = gridValue >= 0 ? this.jewelLetters[gridValue] : 'X';
                cell.textContent = `${row},${col}:${colorLetter}`;
                
                // Color the cell based on the jewel color
                if (gridValue >= 0) {
                    cell.style.backgroundColor = this.jewelColors[gridValue];
            } else {
                    cell.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Red for empty
                }
                
                overlay.appendChild(cell);
            }
        }
        
        document.body.appendChild(overlay);
        
        // Keep overlay visible (no timeout)
    }

    logAllBlocks() {
        console.log("=== ALL BLOCKS IN DOM ===");
        const allJewels = document.querySelectorAll('.jewel');
        console.log(`Total blocks: ${allJewels.length}`);
        
        allJewels.forEach((jewel, index) => {
            // const row = jewel.dataset.row;
            // const col = jewel.dataset.col;
            // const color = jewel.dataset.color;
            // const cleared = jewel.dataset.cleared;
            // const isNew = jewel.dataset.isNew;
            // const voided = jewel.dataset.void;
            // const stackIndex = jewel.dataset.stackIndex;
            
            // console.log(`Block ${index}: [${row},${col}] = ${color} (cleared: ${cleared}, new: ${isNew}, void: ${voided}, stackIndex: ${stackIndex})`);
            console.log(index, jewel);
        });
    }

    toggleDebugNumbers() {
        this.debugMode = !this.debugMode;
        console.log(`Debug numbers ${this.debugMode ? 'enabled' : 'disabled'}`);
        
        const allJewels = document.querySelectorAll('.jewel');
        allJewels.forEach(jewel => {
            const row = jewel.dataset.row;
            const col = jewel.dataset.col;
            
            if (this.debugMode) {
                jewel.innerHTML = `<div style="position: absolute; top: 2px; left: 2px; font-size: 12px; color: black; font-family: Arial, sans-serif; font-weight: bold;">${row},${col}</div>`;
            } else {
                jewel.innerHTML = '';
            }
        });
    }

    toggleGridOverlay() {
        this.gridOverlayVisible = !this.gridOverlayVisible;
        console.log(`Grid overlay ${this.gridOverlayVisible ? 'enabled' : 'disabled'}`);
        
        if (this.gridOverlayVisible) {
            this.createGridOverlay();
        } else {
            const existingOverlay = document.getElementById('gridOverlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
        }
    }

    update(){
        if(this.action==="set up"){
            // Game is set up and running
        }
    }
}
