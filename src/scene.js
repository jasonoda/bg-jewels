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
        this.JEWEL_TYPES = 4; // Configurable number of jewel types (excluding bonus boxes)
        this.grid = [];
        this.isAnimating = false;
        this.score = 0;
        this.timeLeft = 120;
        this.gameStarted = false;
        this.gameOver = false;
        this.debugMode = false; // Track debug mode for numbers
        this.gridOverlayVisible = false; // Track grid overlay visibility
        this.gamePaused = false; // Track if game is paused
        
        // Jewel colors and letters - add more colors as needed
        this.jewelColors = ['#FF6B6B', '#4ECDC4', '#0066FF', '#FFA726', '#9B59B6', '#FFFFFF', '#808080']; // Red, Teal, Primary Blue, Orange, Purple, White (bonus), Grey (L-bonus)
        this.jewelLetters = ['r', 't', 'b', 'o', 'p', 'w', 'g']; // r=red, t=teal, b=blue, o=orange, p=purple, w=white (bonus), g=grey (L-bonus)
        
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
        
        // Create a sample grey bonus box at the center
        this.grid[4][4] = 6; // Grey jewel index
        
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
                    // Skip the bonus box position
                    if (row === 4 && col === 4) continue;
                    
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
                
                // Style bonus boxes (white and grey jewels)
                if (this.grid[row][col] === 5 || this.grid[row][col] === 6) {
                    jewelElement.dataset.bonusBox = 'true';
                }
                
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
            } else if (e.key === 'j' || e.key === 'J') {
                this.toggleMask();
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
        if (this.isAnimating || this.gameOver || !this.gameStarted || this.gamePaused) return;
        
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
        
        // Check if one of the swapped jewels is a bonus box
        const isBonusBox1 = jewel1.dataset.color === 'w' || jewel1.dataset.color === 'g';
        const isBonusBox2 = jewel2.dataset.color === 'w' || jewel2.dataset.color === 'g';
        
        if (isBonusBox1 || isBonusBox2) {
            // Determine which bonus box and its type
            const bonusBoxJewel = isBonusBox1 ? jewel1 : jewel2;
            const bonusBoxType = bonusBoxJewel.dataset.color;
            const bonusBoxRow = isBonusBox1 ? row1 : row2;
            const bonusBoxCol = isBonusBox1 ? col1 : col2;
            
            if (bonusBoxType === 'g') {
                // Grey bonus box: Create diamond-shaped destruction
                console.log("Grey bonus box swap detected! Creating diamond destruction");
                
                const jewelsToClear = [];
                
                // Create diamond pattern: 3 blocks in each direction + diagonals
                for (let r = Math.max(0, bonusBoxRow - 3); r <= Math.min(this.GRID_SIZE - 1, bonusBoxRow + 3); r++) {
                    for (let c = Math.max(0, bonusBoxCol - 3); c <= Math.min(this.GRID_SIZE - 1, bonusBoxCol + 3); c++) {
                        // Calculate Manhattan distance (diamond shape)
                        const distance = Math.abs(r - bonusBoxRow) + Math.abs(c - bonusBoxCol);
                        if (distance <= 3) {
                            jewelsToClear.push({ row: r, col: c });
                        }
                    }
                }
                
                if (jewelsToClear.length > 0) {
                    // Animate the swap
                    this.animateSwap(row1, col1, row2, col2, () => {
                        // Convert the diamond positions to match format
                        const diamondMatches = jewelsToClear.map(pos => ({ row: pos.row, col: pos.col }));
                        
                        // Use the same animation and block falling procedure as regular matches
                        this.animateClearMatches(diamondMatches, [], () => {
                            this.handleBlockFallingAfterMatch(diamondMatches, []);
                        });
                    });
                    return;
                }
            } else {
                // White bonus box: Clear all jewels of the target color
                const colorToClear = isBonusBox1 ? jewel2.dataset.color : jewel1.dataset.color;
                
                if (colorToClear) {
                    //console.log(`White bonus box swap detected! Clearing all ${colorToClear} jewels`);
                    
                    // Find all jewels of the target color
                    const jewelsToClear = [];
                    const allJewels = document.querySelectorAll('.jewel');
                    
                    allJewels.forEach(jewel => {
                        if (jewel.dataset.color === colorToClear) {
                            const row = parseInt(jewel.dataset.row);
                            const col = parseInt(jewel.dataset.col);
                            if (row >= 0 && col >= 0) {
                                jewelsToClear.push({ row, col });
                            }
                        }
                    });
                    
                    // Also add the position where the swapped jewel will end up
                    jewelsToClear.push({ row: bonusBoxRow, col: bonusBoxCol });
                    
                    if (jewelsToClear.length > 0) {
                        // Animate the swap
                        this.animateSwap(row1, col1, row2, col2, () => {
                            // Clear all jewels of the target color
                            this.clearAllJewelsOfColor(jewelsToClear, () => {
                                this.handleBlockFallingAfterMatch([], []); // No matches, no bonus boxes
                            });
                        });
                        return;
                    }
                }
            }
        }
        
        // Normal swap logic
        const color1 = jewel1.dataset.color;
        const color2 = jewel2.dataset.color;
        
        jewel1.dataset.color = color2;
        jewel2.dataset.color = color1;
        
        const { matches, bonusBoxes } = this.findMatches(true);
        
        jewel1.dataset.color = color1;
        jewel2.dataset.color = color2;
        
        if (matches.length > 0) {
            this.animateSwap(row1, col1, row2, col2, () => {
                this.processMatches(bonusBoxes);
            });
        } else {
            this.showInvalidMoveFeedback(row1, col1, row2, col2);
        }
    }
    
    clearAllJewelsOfColor(jewelsToClear, callback) {
        const elements = [];
        
        // Also clear any bonus boxes that were involved in the swap
        const allJewels = document.querySelectorAll('.jewel');
        allJewels.forEach(jewel => {
            if ((jewel.dataset.color === 'w' || jewel.dataset.color === 'g') && jewel.dataset.bonusBox === 'true') {
                const row = parseInt(jewel.dataset.row);
                const col = parseInt(jewel.dataset.col);
                if (row >= 0 && col >= 0) {
                    //console.log(`Clearing ${jewel.dataset.color === 'w' ? 'white' : 'grey'} bonus box at [${row},${col}]`);
                    elements.push(jewel);
                    
                    // Mark as cleared and void
                    jewel.dataset.cleared = 'true';
                    jewel.dataset.void = 'true';
                    
                    // Update the grid
                    if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
                        this.grid[row][col] = -1;
                    }
                }
            }
        });
        
        jewelsToClear.forEach(jewelPos => {
            const element = document.querySelector(`[data-row="${jewelPos.row}"][data-col="${jewelPos.col}"]`);
            if (element) {
                //console.log(`Clearing jewel at [${jewelPos.row},${jewelPos.col}]`);
                elements.push(element);
                
                // Mark as cleared and void
                element.dataset.cleared = 'true';
                element.dataset.void = 'true';
                
                // Update the grid
                if (jewelPos.row >= 0 && jewelPos.row < this.GRID_SIZE && jewelPos.col >= 0 && jewelPos.col < this.GRID_SIZE) {
                    this.grid[jewelPos.row][jewelPos.col] = -1;
                }
            }
        });
        
        if (elements.length > 0) {
            // Create animation for clearing the jewels
            const tl = gsap.timeline({
                onComplete: () => {
                    //console.log("Bonus box clear animation complete");
                    callback();
                }
            });
            
            tl.to(elements, {
                rotation: 360,
                scale: 0,
                duration: 0.25,
                ease: "power2.out",
                transformOrigin: "center center"
            }, 0);
        } else {
            callback();
        }
        
        // After clearing, trigger block falling
        setTimeout(() => {
            this.handleBlockFallingAfterBonusBoxClear();
        }, 100);
    }
    
    handleBlockFallingAfterBonusBoxClear() {
        //console.log("=== HANDLING BLOCK FALLING AFTER BONUS BOX CLEAR ===");
        
        // Count all cleared blocks per column
        const clearedPerColumn = new Array(this.GRID_SIZE).fill(0);
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let row = 0; row < this.GRID_SIZE; row++) {
                const blockElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (blockElement && (blockElement.dataset.cleared === 'true' || blockElement.dataset.void === 'true')) {
                    clearedPerColumn[col]++;
                }
            }
        }
        
        // Create a snapshot of the current grid state to ensure consistent calculations
        const gridSnapshot = this.createGridSnapshot();
        
        const blocksToFall = [];
        
        for (let col = 0; col < this.GRID_SIZE; col++) {
            if (clearedPerColumn[col] > 0) {
                for (let row = 0; row < this.GRID_SIZE; row++) {
                    const blockElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (blockElement && !blockElement.dataset.isNew && blockElement.dataset.cleared !== 'true' && blockElement.dataset.void !== 'true') {
                        // Allow both regular blocks AND existing bonus boxes to fall
                        const spacesToFall = this.calculateSpacesToFallFromSnapshot(row, col, gridSnapshot);
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
        
        //console.log("=== BLOCKS TO FALL AFTER BONUS BOX CLEAR ===");
        blocksToFall.forEach((block, index) => {
            //console.log(`Falling block ${index}: from [${block.currentRow},${block.col}] to [${block.targetRow},${block.col}] (${block.spacesToFall} spaces)`);
        });
        
        //console.log("=== NEW BLOCKS AFTER BONUS BOX CLEAR ===");
        newBlocks.forEach((block, index) => {
            //console.log(`New block ${index}: column ${block.col}, target row ${block.targetRow}, stack index ${block.stackIndex}`);
        });
        
        this.isAnimating = true;
        this.animateAllBlocksToFinalPositions(allBlocksToMove);
    }
    
    calculateSpacesToFall(row, col, clearedInColumn) {
        let spacesToFall = 0;
        for (let checkRow = row + 1; checkRow < this.GRID_SIZE; checkRow++) {
            const blockAtCheckRow = document.querySelector(`[data-row="${checkRow}"][data-col="${col}"]`);
            // A space is empty if: no block exists, block is cleared, block is void, OR block is a bonus box that was cleared
            if (!blockAtCheckRow || blockAtCheckRow.dataset.cleared === 'true' || blockAtCheckRow.dataset.void === 'true') {
                spacesToFall++;
            }
            // Note: Bonus boxes (both white 'w' and grey 'g') that are NOT cleared are treated as filled spaces
            // and will prevent blocks from falling through them
        }
        return spacesToFall;
    }

    findMatches(allowBonusBoxes = false) {
        const matches = [];
        const bonusBoxes = [];
        const visited = new Set();
        
        //console.log("=== FINDING MATCHES ===");
        //console.log(`Allow bonus boxes: ${allowBonusBoxes}`);
        
        // First, let's log the current state of the grid for debugging
        //console.log("Current grid state:");
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
            //console.log(`Row ${row}: ${rowStr}`);
        }
        
        // Find all horizontal and vertical matches first (but don't process them yet)
        const horizontalMatches = [];
        const verticalMatches = [];
        
        // Horizontal matches (check for 3, 4, and 5 jewel matches)
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE - 2; col++) {
                const jewel1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const jewel2 = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`);
                const jewel3 = document.querySelector(`[data-row="${row}"][data-col="${col + 2}"]`);
                
                if (jewel1 && jewel2 && jewel3) {
                    const color1 = jewel1.dataset.color;
                    const color2 = jewel2.dataset.color;
                    const color3 = jewel3.dataset.color;
                    
                    if (color1 && color2 && color3) {
                        // Skip if any of the colors are bonus boxes (they should never participate in matches)
                        if (color1 === 'w' || color2 === 'w' || color3 === 'w' || color1 === 'g' || color2 === 'g' || color3 === 'g') {
                            continue;
                        }
                        
                        // Check if colors match (only for non-bonus box jewels)
                        if (color1 === color2 && color2 === color3) {
                            // Check for longer matches (4 and 5 jewels)
                            let matchLength = 3;
                            let endCol = col + 2;
                            
                            // Check for 4th jewel
                            const jewel4 = document.querySelector(`[data-row="${row}"][data-col="${col + 3}"]`);
                            if (jewel4 && color1 === jewel4.dataset.color && jewel4.dataset.color !== 'w' && jewel4.dataset.color !== 'g') {
                                matchLength = 4;
                                endCol = col + 3;
                                
                                // Check for 5th jewel
                                const jewel5 = document.querySelector(`[data-row="${row}"][data-col="${col + 4}"]`);
                                if (jewel5 && color1 === jewel5.dataset.color && jewel5.dataset.color !== 'w' && jewel5.dataset.color !== 'g') {
                                    matchLength = 5;
                                    endCol = col + 4;
                                }
                            }
                            
                            //console.log(`Found HORIZONTAL ${matchLength}-jewel match at row ${row}, cols ${col}-${endCol}: ${color1.repeat(matchLength)}`);
                            
                            // Store horizontal match for L-shape detection (don't process yet)
                            horizontalMatches.push({
                                row: row,
                                startCol: col,
                                endCol: endCol,
                                color: color1,
                                length: matchLength
                            });
                        }
                    }
                }
            }
        }
        
        // Vertical matches (check for 3, 4, and 5 jewel matches)
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let row = 0; row < this.GRID_SIZE - 2; row++) {
                const jewel1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const jewel2 = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
                const jewel3 = document.querySelector(`[data-row="${row + 2}"][data-col="${col}"]`);
                
                if (jewel1 && jewel2 && jewel3) {
                    const color1 = jewel1.dataset.color;
                    const color2 = jewel2.dataset.color;
                    const color3 = jewel3.dataset.color;
                    
                    if (color1 && color2 && color3) {
                        // Skip if any of the colors are bonus boxes
                        if (color1 === 'w' || color2 === 'w' || color3 === 'w' || color1 === 'g' || color2 === 'g' || color3 === 'g') {
                            continue;
                        }
                        
                        // Check if colors match
                        if (color1 === color2 && color2 === color3) {
                            // Check for longer matches (4 and 5 jewels)
                            let matchLength = 3;
                            let endRow = row + 2;
                            
                            // Check for 4th jewel
                            const jewel4 = document.querySelector(`[data-row="${row + 3}"][data-col="${col}"]`);
                            if (jewel4 && color1 === jewel4.dataset.color && jewel4.dataset.color !== 'w' && jewel4.dataset.color !== 'g') {
                                matchLength = 4;
                                endRow = row + 3;
                                
                                // Check for 5th jewel
                                const jewel5 = document.querySelector(`[data-row="${row + 4}"][data-col="${col}"]`);
                                if (jewel5 && color1 === jewel5.dataset.color && jewel5.dataset.color !== 'w' && jewel5.dataset.color !== 'g') {
                                    matchLength = 5;
                                    endRow = row + 4;
                                }
                            }
                            
                            //console.log(`Found VERTICAL ${matchLength}-jewel match at col ${col}, rows ${row}-${endRow}: ${color1.repeat(matchLength)}`);
                            
                            // Store vertical match for L-shape detection (don't process yet)
                            verticalMatches.push({
                                col: col,
                                startRow: row,
                                endRow: endRow,
                                color: color1,
                                length: matchLength
                            });
                        }
                    }
                }
            }
        }
        
        // Check for L-shaped matches (before processing regular matches)
        if (allowBonusBoxes) {
            horizontalMatches.forEach((horizontalMatch, hIndex) => {
                verticalMatches.forEach((verticalMatch, vIndex) => {
                    // Check for L-shape: vertical line intersects with horizontal line at one end
                    let isLShape = false;
                    let intersectionRow, intersectionCol;
                    
                    // Check if horizontal line extends from the top of vertical line
                    if (horizontalMatch.row === verticalMatch.startRow && 
                        horizontalMatch.startCol <= verticalMatch.col && 
                        horizontalMatch.endCol >= verticalMatch.col) {
                        intersectionRow = verticalMatch.startRow;
                        intersectionCol = verticalMatch.col;
                        isLShape = true;
                    }
                    // Check if horizontal line extends from the bottom of vertical line
                    else if (horizontalMatch.row === verticalMatch.endRow && 
                             horizontalMatch.startCol <= verticalMatch.col && 
                             horizontalMatch.endCol >= verticalMatch.col) {
                        intersectionRow = verticalMatch.endRow;
                        intersectionCol = verticalMatch.col;
                        isLShape = true;
                    }
                    // Check if vertical line extends from the left of horizontal line
                    else if (verticalMatch.col === horizontalMatch.startCol && 
                             verticalMatch.startRow <= horizontalMatch.row && 
                             verticalMatch.endRow >= horizontalMatch.row) {
                        intersectionRow = horizontalMatch.row;
                        intersectionCol = horizontalMatch.startCol;
                        isLShape = true;
                    }
                    // Check if vertical line extends from the right of horizontal line
                    else if (verticalMatch.col === horizontalMatch.endCol && 
                             verticalMatch.startRow <= horizontalMatch.row && 
                             verticalMatch.endRow >= horizontalMatch.row) {
                        intersectionRow = horizontalMatch.row;
                        intersectionCol = horizontalMatch.endCol;
                        isLShape = true;
                    }
                    
                    if (isLShape) {
                        console.log("L shape detected");
                        const intersectionKey = `${intersectionRow}-${intersectionCol}`;
                        
                        // Check if this intersection point isn't already a bonus box
                        const intersectionJewel = document.querySelector(`[data-row="${intersectionRow}"][data-col="${intersectionCol}"]`);
                        if (intersectionJewel && intersectionJewel.dataset.bonusBox !== 'true') {
                            console.log("Creating grey bonus box at intersection");
                            
                            // Follow the EXACT same steps as white bonus box creation:
                            // 1. Add to bonusBoxes array
                            bonusBoxes.push({ row: intersectionRow, col: intersectionCol, type: 'grey' });
                            
                            // 2. Mark as visited to prevent duplicate processing
                            visited.add(intersectionKey);
                            
                            // 3. Return immediately to prevent regular match processing
                            console.log("L-shape detected - returning early");
                            return { matches: [], bonusBoxes };
                        }
                    }
                });
            });
        }
        
        // Process regular matches
        horizontalMatches.forEach(horizontalMatch => {
            if (horizontalMatch.length === 5 && allowBonusBoxes) {
                // Handle 5-jewel match with white bonus box
                const centerCol = horizontalMatch.startCol + 2;
                const centerJewel = document.querySelector(`[data-row="${horizontalMatch.row}"][data-col="${centerCol}"]`);
                
                if (centerJewel && !visited.has(`${horizontalMatch.row}-${centerCol}`)) {
                    bonusBoxes.push({ row: horizontalMatch.row, col: centerCol, type: 'white' });
                    visited.add(`${horizontalMatch.row}-${centerCol}`);
                }
                
                // Add all 5 jewels to matches EXCEPT the center (bonus box)
                for (let c = horizontalMatch.startCol; c <= horizontalMatch.endCol; c++) {
                    const key = `${horizontalMatch.row}-${c}`;
                    if (!visited.has(key) && c !== centerCol) {
                        matches.push({ row: horizontalMatch.row, col: c });
                        visited.add(key);
                    }
                }
            } else {
                // Regular 3, 4, or 5 jewel match (no bonus box)
                for (let c = horizontalMatch.startCol; c <= horizontalMatch.endCol; c++) {
                    const key = `${horizontalMatch.row}-${c}`;
                    if (!visited.has(key)) {
                        matches.push({ row: horizontalMatch.row, col: c });
                        visited.add(key);
                    }
                }
            }
        });
        
        verticalMatches.forEach(verticalMatch => {
            if (verticalMatch.length === 5 && allowBonusBoxes) {
                // Handle 5-jewel match with white bonus box
                const centerRow = verticalMatch.startRow + 2;
                const centerJewel = document.querySelector(`[data-row="${centerRow}"][data-col="${verticalMatch.col}"]`);
                
                if (centerJewel && !visited.has(`${centerRow}-${verticalMatch.col}`)) {
                    bonusBoxes.push({ row: centerRow, col: verticalMatch.col, type: 'white' });
                    visited.add(`${centerRow}-${verticalMatch.col}`);
                }
                
                // Add all 5 jewels to matches EXCEPT the center (bonus box)
                for (let r = verticalMatch.startRow; r <= verticalMatch.endRow; r++) {
                    const key = `${r}-${verticalMatch.col}`;
                    if (!visited.has(key) && r !== centerRow) {
                        matches.push({ row: r, col: verticalMatch.col });
                        visited.add(key);
                    }
                }
            } else {
                // Regular 3, 4, or 5 jewel match (no bonus box)
                for (let r = verticalMatch.startRow; r <= verticalMatch.endRow; r++) {
                    const key = `${r}-${verticalMatch.col}`;
                    if (!visited.has(key)) {
                        matches.push({ row: r, col: verticalMatch.col });
                        visited.add(key);
                    }
                }
            }
        });
        
        return { matches, bonusBoxes };
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

    processMatches(bonusBoxesFromPrevious = []) {
        //console.log("=== PROCESSING MATCHES ===");
        //console.log(`Bonus boxes from previous: ${bonusBoxesFromPrevious.length}`);
        
        // CRITICAL: Sync the grid before finding matches
        this.syncInternalGridFromDOM();
        
        const { matches, bonusBoxes } = this.findMatches(false); // No bonus boxes in cascade matches
        
        //console.log(`Found ${matches.length} matches and ${bonusBoxes.length} bonus boxes`);
        
        if (matches.length === 0) {
            //console.log("No matches found, ending process");
            this.isAnimating = false;
            return;
        }
        
        // Set animating to true when processing matches
        this.isAnimating = true;
        //console.log("Set isAnimating = true for match processing");
        
        const baseScore = matches.length * 10;
        this.score += baseScore;
        this.updateScoreDisplay();
        this.showScorePopup(baseScore);
        
        // Combine bonus boxes from current matches and previous ones
        const allBonusBoxes = [...bonusBoxesFromPrevious, ...bonusBoxes];
        
        //console.log(`Processing ${matches.length} matches with ${allBonusBoxes.length} total bonus boxes`);
        
        this.animateClearMatches(matches, allBonusBoxes, () => {
            this.handleBlockFallingAfterMatch(matches, allBonusBoxes);
        });
    }

    animateClearMatches(matches, bonusBoxes, callback) {
        const elements = [];
        const bonusBoxElements = [];
        
        // First, handle bonus boxes - convert them to white or grey jewels
        bonusBoxes.forEach(bonusBox => {

            console.log("bonusBox1");

            const element = document.querySelector(`[data-row="${bonusBox.row}"][data-col="${bonusBox.col}"]`);
            if (element) {
                console.log("bonusBox2");
                //console.log(`Converting to ${bonusBox.type} bonus box: [${bonusBox.row},${bonusBox.col}]`);
                bonusBoxElements.push(element);
                
                // Convert to appropriate color and flag as new bonus box
                if (bonusBox.type === 'white') {
                    element.style.backgroundColor = '#FFFFFF';
                    element.dataset.color = 'w';
                } else if (bonusBox.type === 'grey') {
                    console.log("bonusBox3");
                    element.style.backgroundColor = '#808080';
                    element.dataset.color = 'g';
                }
                
                element.dataset.bonusBox = 'true';
                element.dataset.newBonusBox = 'true'; // Flag to prevent clearing
                
                // Don't add to elements to be cleared
            } else {
                //console.error(`ERROR: Could not find element for bonus box at [${bonusBox.row},${bonusBox.col}]`);
            }
        });
        
        // Handle regular matches
        matches.forEach(match => {
            const element = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
                        if (element) {
                const color = element.dataset.color;
                const row = element.dataset.row;
                const col = element.dataset.col;
                
                // Skip if this is a new bonus box
                if (element.dataset.newBonusBox === 'true') {
                    //console.log(`Skipping new bonus box at [${row},${col}] - preventing clearing`);
                    return;
                }
                
                // Check if this element is a bonus box
                if (element.dataset.bonusBox === 'true') {
                    //console.error(`ERROR: Bonus box at [${row},${col}] is being cleared! This should not happen.`);
                }
                
                //console.log(`CLEARING BLOCK: [${row},${col}] = ${color} - Reason: Part of match #${matches.indexOf(match) + 1} of ${matches.length} total matches`);
                elements.push(element);
            } else {
                //console.error(`ERROR: Could not find element to clear at [${match.row},${match.col}]`);
            }
        });
        
        // Mark elements as cleared and void immediately
        elements.forEach(element => {
            element.dataset.cleared = 'true';
            element.dataset.void = 'true'; // Mark as void so it's not counted in sync
        });
        
        // Update the grid (only for cleared elements, not bonus boxes)
        elements.forEach(element => {
            const row = parseInt(element.dataset.row);
            const col = parseInt(element.dataset.col);
            if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
                this.grid[row][col] = -1;
            }
        });
        
        // Update grid for bonus boxes
        bonusBoxElements.forEach(element => {
            const row = parseInt(element.dataset.row);
            const col = parseInt(element.dataset.col);
            if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
                if (element.dataset.color === 'w') {
                    this.grid[row][col] = 5; // White jewel index
                } else if (element.dataset.color === 'g') {
                    this.grid[row][col] = 6; // Grey jewel index
                }
            }
        });
        
        // Create a timeline for the spin and shrink animation (only for cleared elements)
        const tl = gsap.timeline({
            onComplete: () => {
                //console.log("Match spin and shrink animation complete, proceeding to bonus box falling...");
                this.handleBonusBoxFalling(bonusBoxElements, () => {
                    this.handleBlockFallingAfterMatch(matches, bonusBoxes);
                });
            }
        });
        
        // Spin and shrink animation - 0.25 seconds total (only for cleared elements)
        if (elements.length > 0) {
        tl.to(elements, {
            rotation: 360,
            scale: 0,
            duration: 0.25,
            ease: "power2.out",
            transformOrigin: "center center"
        }, 0); // Start immediately
        }
        
        //console.log(`Started spin and shrink animation for ${elements.length} matched blocks`);
        //console.log(`Created ${bonusBoxElements.length} bonus boxes`);
    }
    
    handleBonusBoxFalling(bonusBoxElements, callback) {
        if (bonusBoxElements.length === 0) {
            //console.log("No bonus boxes to fall, proceeding to regular block falling...");
            callback();
            return;
        }
        
        //console.log("=== BONUS BOX FALLING PHASE ===");
        
        const animations = [];
        const gridUpdates = [];
        
        bonusBoxElements.forEach((bonusBoxElement, index) => {
            // Safety check - ensure the element still exists
            if (!bonusBoxElement || !bonusBoxElement.parentNode) {
                //console.warn(`Bonus box element ${index} no longer exists, skipping...`);
                return;
            }
            
            const currentRow = parseInt(bonusBoxElement.dataset.row);
            const currentCol = parseInt(bonusBoxElement.dataset.col);
            
            //console.log(`Processing bonus box ${index + 1}/${bonusBoxElements.length} at [${currentRow},${currentCol}]`);
            
            // Calculate how many empty spaces are below this bonus box
            let spacesToFall = 0;
            for (let checkRow = currentRow + 1; checkRow < this.GRID_SIZE; checkRow++) {
                const blockAtCheckRow = document.querySelector(`[data-row="${checkRow}"][data-col="${currentCol}"]`);
                if (!blockAtCheckRow || blockAtCheckRow.dataset.cleared === 'true' || blockAtCheckRow.dataset.void === 'true') {
                    spacesToFall++;
                } else {
                    //console.log(`Bonus box at [${currentRow},${currentCol}] found obstacle at [${checkRow},${currentCol}]: color=${blockAtCheckRow.dataset.color}, cleared=${blockAtCheckRow.dataset.cleared}, void=${blockAtCheckRow.dataset.void}, bonusBox=${blockAtCheckRow.dataset.bonusBox}`);
                }
            }
            
            //console.log(`Bonus box at [${currentRow},${currentCol}] calculated ${spacesToFall} spaces to fall`);
            
            if (spacesToFall > 0) {
                //console.log(`Bonus box at [${currentRow},${currentCol}] needs to fall ${spacesToFall} spaces`);
                
                // Calculate the target position
                const targetRow = currentRow + spacesToFall;
                const currentTop = parseInt(bonusBoxElement.style.top) || 0;
                const moveDistance = spacesToFall * (this.jewelSize + this.jewelGap);
                const targetTop = currentTop + moveDistance;
                
                //console.log(`Bonus box at [${currentRow},${currentCol}] moving from top=${currentTop} to top=${targetTop} (distance=${moveDistance})`);
                
                // Store the grid update for later
                gridUpdates.push({
                    element: bonusBoxElement,
                    oldRow: currentRow,
                    newRow: targetRow,
                    col: currentCol
                });
                
                // Animate the bonus box falling
                const animation = gsap.to(bonusBoxElement, {
                    top: targetTop,
                    duration: 0.3,
                    ease: "sine.out"
                });
                
                animations.push(animation);
            } else {
                //console.log(`Bonus box at [${currentRow},${currentCol}] doesn't need to fall`);
            }
        });
        
        // Wait for all bonus box animations to complete
        if (animations.length > 0) {
            Promise.all(animations.map(anim => new Promise(resolve => {
                anim.eventCallback("onComplete", resolve);
            }))).then(() => {
                // Update the data attributes and grid after animations complete
                gridUpdates.forEach(update => {
                    update.element.dataset.row = update.newRow;
                    
                    // Update the grid - preserve the original bonus box type
                    if (update.newRow >= 0 && update.newRow < this.GRID_SIZE && update.col >= 0 && update.col < this.GRID_SIZE) {
                        // Determine the correct grid value based on the bonus box color
                        let gridValue;
                        if (update.element.dataset.color === 'g') {
                            gridValue = 6; // Grey jewel index
                        } else {
                            gridValue = 5; // White jewel index
                        }
                        this.grid[update.newRow][update.col] = gridValue;
                        
                        // Clear the old position in the grid
                        if (update.oldRow >= 0 && update.oldRow < this.GRID_SIZE) {
                            this.grid[update.oldRow][update.col] = -1;
                        }
                    }
                });
                
                //console.log("Bonus box falling complete, proceeding to regular block falling...");
                callback();
            });
        } else {
            //console.log("No bonus boxes needed to fall, proceeding to regular block falling...");
            callback();
        }
    }
    
    handleBlockFallingAfterMatch(matches, bonusBoxes) {
        //console.log("=== HANDLING BLOCK FALLING AFTER MATCH ===");
        //console.log(`Matches: ${matches.length}, Bonus boxes: ${bonusBoxes.length}`);
        
        // Log bonus box positions before processing
        bonusBoxes.forEach((bonusBox, index) => {
            const element = document.querySelector(`[data-row="${bonusBox.row}"][data-col="${bonusBox.col}"]`);
            if (element) {
                //console.log(`Bonus box ${index}: [${bonusBox.row},${bonusBox.col}] - color: ${element.dataset.color}, bonusBox: ${element.dataset.bonusBox}`);
            } else {
                //console.error(`Bonus box ${index}: [${bonusBox.row},${bonusBox.col}] - ELEMENT NOT FOUND!`);
            }
        });
        
        const clearedPerColumn = new Array(this.GRID_SIZE).fill(0);
        
        // Count cleared blocks per column from matches
        matches.forEach(match => {
            clearedPerColumn[match.col]++;
        });
        
        // Subtract bonus boxes that were created (they take up cleared spaces)
        bonusBoxes.forEach(bonusBox => {
            clearedPerColumn[bonusBox.col]--;
        });
        
        // Create a snapshot of the current grid state to ensure consistent calculations
        const gridSnapshot = this.createGridSnapshot();
        
        const blocksToFall = [];
        
        for (let col = 0; col < this.GRID_SIZE; col++) {
            if (clearedPerColumn[col] > 0) {
                for (let row = 0; row < this.GRID_SIZE; row++) {
                    const blockElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (blockElement && !blockElement.dataset.isNew && blockElement.dataset.cleared !== 'true' && blockElement.dataset.void !== 'true') {
                        // Allow both regular blocks AND existing bonus boxes to fall
                        const spacesToFall = this.calculateSpacesToFallFromSnapshot(row, col, gridSnapshot);
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
        
        // //console log for missing blocks below for each column
        //console.log("=== MISSING BLOCKS PER COLUMN ===");
        for (let col = 0; col < this.GRID_SIZE; col++) {
            let missingInColumn = 0;
            for (let row = 0; row < this.GRID_SIZE; row++) {
                const blockAtRow = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!blockAtRow || blockAtRow.dataset.cleared === 'true' || blockAtRow.dataset.void === 'true') {
                    missingInColumn++;
                }
            }
            //console.log(`Column ${col}: ${missingInColumn} missing blocks`);
        }
        
        // //console log for all blocks to fall and new blocks
        //console.log("=== BLOCKS TO FALL ===");
        blocksToFall.forEach((block, index) => {
            //console.log(`Falling block ${index}: from [${block.currentRow},${block.col}] to [${block.targetRow},${block.col}] (${block.spacesToFall} spaces)`);
        });
        
        //console.log("=== NEW BLOCKS ===");
        newBlocks.forEach((block, index) => {
            //console.log(`New block ${index}: column ${block.col}, target row ${block.targetRow}, stack index ${block.stackIndex}`);
        });
        
        //console.log("=== STARTING ANIMATION ===");
        this.isAnimating = true; // Set animating to true before starting block falling animation
        this.animateAllBlocksToFinalPositions(allBlocksToMove);
    }
    
    createGridSnapshot() {
        // Create a snapshot of the current grid state to ensure consistent calculations
        const snapshot = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            snapshot[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const blockElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (blockElement && blockElement.dataset.cleared !== 'true' && blockElement.dataset.void !== 'true') {
                    snapshot[row][col] = true; // Block exists and is solid
                } else {
                    snapshot[row][col] = false; // No block or block is cleared/void
                }
            }
        }
        return snapshot;
    }
    
    calculateSpacesToFallFromSnapshot(row, col, gridSnapshot) {
        // Calculate spaces to fall using a consistent grid snapshot
        let spacesToFall = 0;
        for (let checkRow = row + 1; checkRow < this.GRID_SIZE; checkRow++) {
            if (!gridSnapshot[checkRow] || !gridSnapshot[checkRow][col]) {
                // Space is empty (no block or block is cleared/void)
                spacesToFall++;
            }
            // If gridSnapshot[checkRow][col] is true, there's a solid block - stop falling
        }
        return spacesToFall;
    }
    
    calculateSpacesToFall(row, col, clearedInColumn) {
        let spacesToFall = 0;
        for (let checkRow = row + 1; checkRow < this.GRID_SIZE; checkRow++) {
            const blockAtCheckRow = document.querySelector(`[data-row="${checkRow}"][data-col="${col}"]`);
            // A space is empty if: no block exists, block is cleared, block is void, OR block is a bonus box that was cleared
            if (!blockAtCheckRow || blockAtCheckRow.dataset.cleared === 'true' || blockAtCheckRow.dataset.void === 'true') {
                spacesToFall++;
            }
            // Note: Bonus boxes (both white 'w' and grey 'g') that are NOT cleared are treated as filled spaces
            // and will prevent blocks from falling through them
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
                
                //console.log(`Calculating missing blocks for block at row ${currentRow}, col ${col}`);
                
                for (let row = currentRow + 1; row < this.GRID_SIZE; row++) {
                    const blockAtRow = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    // Only count as missing if there's no block OR if the block is cleared/void
                    if (!blockAtRow || blockAtRow.dataset.cleared === 'true' || blockAtRow.dataset.void === 'true') {
                        missingBlocksBelow++;
                        // //console.log(`Row ${row} is missing (cleared: ${blockAtRow?.dataset.cleared}, void: ${blockAtRow?.dataset.void})`);
                    } else {
                        // //console.log(`Row ${row} has block: ${blockAtRow.dataset.color}`);
                    }
                }
                
                //console.log(`Block at [${currentRow},${col}] needs to fall ${missingBlocksBelow} spaces`);
                
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
                    //console.log(`Destroying removed jewel at [${jewel.dataset.row},${jewel.dataset.col}]`);
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
            //console.log("=== FINAL CLEANUP ===");
            
            // Count all jewels to verify we have exactly 81
            const finalJewels = document.querySelectorAll('.jewel');
            //console.log(`Total jewels: ${finalJewels.length} (should be 81)`);
            
            if (finalJewels.length !== 81) {
                //console.error(`ERROR: Expected 81 jewels, found ${finalJewels.length}`);
                
                // Debug: Show what jewels we have
                //console.log("=== JEWEL INVENTORY ===");
                finalJewels.forEach((jewel, index) => {
                    const row = jewel.dataset.row;
                    const col = jewel.dataset.col;
                    const color = jewel.dataset.color;
                    const cleared = jewel.dataset.cleared;
                    const isNew = jewel.dataset.isNew;
                    const voided = jewel.dataset.void;
                    
                    //console.log(`Jewel ${index}: [${row},${col}] = ${color} (cleared: ${cleared}, new: ${isNew}, void: ${voided})`);
                });
            }
            
            // Verify each jewel has proper data attributes
            finalJewels.forEach((jewel, index) => {
                const row = parseInt(jewel.dataset.row);
                const col = parseInt(jewel.dataset.col);
                const color = jewel.dataset.color;
                
                if (row < 0 || row >= 9 || col < 0 || col >= 9) {
                    //console.error(`Jewel ${index}: Invalid position [${row},${col}]`);
                }
                if (!color) {
                    //console.error(`Jewel ${index}: Missing color`);
                }
            });
            
            // CRITICAL: Check for cascade matches after blocks have fallen
            //console.log("=== CHECKING FOR CASCADE MATCHES ===");
            
            // Log bonus boxes before cascade checking
            const bonusBoxesBeforeCascade = document.querySelectorAll('.jewel[data-bonus-box="true"]');
            //console.log(`Bonus boxes before cascade check: ${bonusBoxesBeforeCascade.length}`);
            bonusBoxesBeforeCascade.forEach((bonusBox, index) => {
                //console.log(`Bonus box ${index}: [${bonusBox.dataset.row},${bonusBox.dataset.col}] - color: ${bonusBox.dataset.color}`);
            });
            
            this.checkForCascadeMatches();
            
            // Reset animation flag to allow new moves
            this.isAnimating = false;
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
        //console.log(`Found ${allJewels.length} total jewels in DOM`);
        
        let validJewels = 0;
        allJewels.forEach((jewelElement, index) => {
            // Skip void/eliminated jewels
            if (jewelElement.dataset.void === 'true' || jewelElement.dataset.cleared === 'true') {
                //console.log(`Skipping void/cleared jewel ${index}`);
                return;
            }
            
            const row = parseInt(jewelElement.dataset.row);
            const col = parseInt(jewelElement.dataset.col);
            const colorLetter = jewelElement.dataset.color;
            
            // //console.log(`Valid jewel ${index}: [${row},${col}] = ${colorLetter}`);
            validJewels++;
            
            if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
                const jewelTypeIndex = this.jewelLetters.indexOf(colorLetter);
                
                if (jewelTypeIndex !== -1) {
                    this.grid[row][col] = jewelTypeIndex;
                    // //console.log(`Set grid[${row}][${col}] = ${jewelTypeIndex} (${colorLetter})`);
                } else {
                    // //console.error(`Invalid color letter: ${colorLetter}`);
                }
            } else {
                // //console.error(`Invalid position: [${row},${col}]`);
            }
        });
        
        // //console.log(`Processed ${validJewels} valid jewels`);
        
        //console.log("=== FINAL GRID STATE ===");
        for (let row = 0; row < this.GRID_SIZE; row++) {
            let rowStr = "";
            for (let col = 0; col < this.GRID_SIZE; col++) {
                rowStr += this.grid[row][col] + " ";
            }
            //console.log(`Row ${row}: ${rowStr}`);
        }
    }

    checkForCascadeMatches() {
        //console.log("=== CHECKING FOR CASCADE MATCHES ===");
        
        // Log bonus boxes before finding matches
        const bonusBoxesBeforeMatches = document.querySelectorAll('.jewel[data-bonus-box="true"]');
        //console.log(`Bonus boxes before finding matches: ${bonusBoxesBeforeMatches.length}`);
        bonusBoxesBeforeMatches.forEach((bonusBox, index) => {
            //console.log(`Bonus box ${index}: [${bonusBox.dataset.row},${bonusBox.dataset.col}] - color: ${bonusBox.dataset.color}`);
        });
        
        const { matches, bonusBoxes } = this.findMatches(false); // No bonus boxes in cascade matches
        
        //console.log(`Cascade matches found: ${matches.length}`);
        matches.forEach((match, index) => {
            const element = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
            if (element) {
                //console.log(`Cascade match ${index}: [${match.row},${match.col}] = ${element.dataset.color} (bonusBox: ${element.dataset.bonusBox})`);
            }
        });
        
        if (matches.length > 0) {
            //console.log(`Found ${matches.length} cascade matches! Processing...`);
            this.processMatches(bonusBoxes);
        } else {
            //console.log("No cascade matches found. Running repair and ending turn.");
            // Run repair function at the end of turn
            this.repairGrid();
        }
    }
    
    repairGrid() {
        console.log("=== RUNNING GRID REPAIR ===");
        
        // Check for overlapping blocks
        const overlappingBlocks = this.findOverlappingBlocks();
        if (overlappingBlocks.length > 0) {
            console.log(`Found ${overlappingBlocks.length} overlapping blocks, making them semi-transparent...`);
            this.makeOverlappingBlocksSemiTransparent(overlappingBlocks);
            this.gamePaused = true;
            clearInterval(this.timerInterval);
            return; // Don't continue with repair
        }
        
        // Check for empty spaces and fill them
        const emptySpaces = this.findEmptySpaces();
        if (emptySpaces.length > 0) {
            console.log(`Found ${emptySpaces.length} empty spaces, logging instead of creating new blocks...`);
            this.gamePaused = true;
            clearInterval(this.timerInterval);
            return; // Don't continue with repair
        } else {
            // No empty spaces to fill, finish repair immediately
            this.finishRepair();
        }
    }
    
    findOverlappingBlocks() {
        const overlappingBlocks = [];
        const positions = new Map(); // key: "row-col", value: array of elements at that position
        
        // Find all blocks and group them by position
        const allBlocks = document.querySelectorAll('.jewel');
        allBlocks.forEach(block => {
            const row = parseInt(block.dataset.row);
            const col = parseInt(block.dataset.col);
            const key = `${row}-${col}`;
            
            if (!positions.has(key)) {
                positions.set(key, []);
            }
            positions.get(key).push(block);
        });
        
        // Find positions with multiple blocks
        positions.forEach((blocks, position) => {
            if (blocks.length > 1) {
                overlappingBlocks.push({
                    position: position,
                    blocks: blocks
                });
            }
        });
        
        return overlappingBlocks;
    }
    
    makeOverlappingBlocksSemiTransparent(overlappingBlocks) {
        overlappingBlocks.forEach(overlap => {
            const blocks = overlap.blocks;
            console.log(`Making ${blocks.length} overlapping blocks at position ${overlap.position} semi-transparent`);
            
            // Make all overlapping blocks semi-transparent
            blocks.forEach(block => {
                block.style.opacity = '0.5';
                block.style.border = '2px solid red'; // Add red border to highlight the overlap
            });
        });
    }
    
    findEmptySpaces() {
        const emptySpaces = [];
        
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const blockAtPosition = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!blockAtPosition || blockAtPosition.dataset.cleared === 'true' || blockAtPosition.dataset.void === 'true') {
                    // Don't count bonus boxes as empty spaces
                    if (blockAtPosition && blockAtPosition.dataset.bonusBox === 'true') {
                        continue;
                    }
                    emptySpaces.push({ row, col });
                }
            }
        }
        
        return emptySpaces;
    }
    
    fillEmptySpaces(emptySpaces) {
        const newBlocks = [];
        
        emptySpaces.forEach(emptySpace => {
            const newJewelType = Math.floor(Math.random() * this.JEWEL_TYPES);
            const newBlock = this.createNewBlock(emptySpace.col, newJewelType, 0);
            newBlocks.push(newBlock);
        });
        
        if (newBlocks.length > 0) {
            //console.log(`Created ${newBlocks.length} new blocks to fill empty spaces`);
            
            // Animate the new blocks appearing
            newBlocks.forEach(block => {
                block.element.style.scale = '0';
                gsap.to(block.element, {
                    scale: 1,
                    duration: 0.3,
                    ease: "back.out(1.7)"
                });
            });
            
            // Update the grid after a short delay to ensure animations complete
            setTimeout(() => {
                this.updateGridFromBlockPositions(newBlocks);
                this.finishRepair();
            }, 350);
        } else {
            // No new blocks needed, finish repair immediately
            this.finishRepair();
        }
    }
    
    finishRepair() {
        //console.log("=== REPAIR COMPLETE - READY FOR NEXT TURN ===");
        
        // Clear the newBonusBox flag from all bonus boxes
        const allBonusBoxes = document.querySelectorAll('.jewel[data-bonus-box="true"]');
        allBonusBoxes.forEach(bonusBox => {
            delete bonusBox.dataset.newBonusBox;
            //console.log(`Cleared newBonusBox flag from bonus box at [${bonusBox.dataset.row},${bonusBox.dataset.col}]`);
        });
        
        this.isAnimating = false;
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
        //console.log("=== ALL BLOCKS IN DOM ===");
        const allJewels = document.querySelectorAll('.jewel');
        //console.log(`Total blocks: ${allJewels.length}`);
        
        allJewels.forEach((jewel, index) => {
            // const row = jewel.dataset.row;
            // const col = jewel.dataset.col;
            // const color = jewel.dataset.color;
            // const cleared = jewel.dataset.cleared;
            // const isNew = jewel.dataset.isNew;
            // const voided = jewel.dataset.void;
            // const stackIndex = jewel.dataset.stackIndex;
            
            // //console.log(`Block ${index}: [${row},${col}] = ${color} (cleared: ${cleared}, new: ${isNew}, void: ${voided}, stackIndex: ${stackIndex})`);
            //console.log(index, jewel);
        });
    }

    toggleDebugNumbers() {
        this.debugMode = !this.debugMode;
        //console.log(`Debug numbers ${this.debugMode ? 'enabled' : 'disabled'}`);
        
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
        const existingOverlay = document.getElementById('gridOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        } else {
            this.createGridOverlay();
        }
    }
    
    toggleMask() {
        // Mask functionality disabled for now
        console.log("Mask toggle disabled");
    }



    update(){
        if(this.action==="set up"){
            // Game is set up and running
        }
    }
}
