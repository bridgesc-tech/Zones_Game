console.log("VERSION CHECK: 4");
// Zones - Turn-Based Card Game

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Screen Management
  const gameContainer = document.getElementById('game-container');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Base canvas dimensions (logical size)
  const BASE_WIDTH = 900;
  const BASE_HEIGHT = 700;
  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;

  // Responsive canvas scaling function
  function resizeCanvas() {
    const container = gameContainer;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit container while maintaining aspect ratio
    const scaleX = containerWidth / BASE_WIDTH;
    const scaleY = containerHeight / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1x
    
    // Set display size (CSS)
    canvas.style.width = (BASE_WIDTH * scale) + 'px';
    canvas.style.height = (BASE_HEIGHT * scale) + 'px';
    
    // Keep internal resolution at base size for crisp rendering
    // The canvas will be scaled by CSS
    
    console.log('Canvas resized:', {
      display: `${canvas.style.width} x ${canvas.style.height}`,
      logical: `${canvas.width} x ${canvas.height}`,
      scale: scale.toFixed(2)
    });
  }

  // Initial resize
  resizeCanvas();
  
  // Resize on window resize
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100); // Delay for orientation change to complete
  });

  console.log('Canvas dimensions:', canvas.width, canvas.height);
  console.log('Game container:', gameContainer);

  // Check Firebase availability
  function checkFirebase() {
    const checkFirebaseReady = () => {
      if (typeof db !== 'undefined' && db !== null) {
        firebaseEnabled = true;
        console.log('Firebase ready for Zones Game');
      } else {
        setTimeout(checkFirebaseReady, 100);
      }
    };
    if (window.location.protocol !== 'file:') {
      checkFirebaseReady();
    }
  }
  
  // Wait for Firebase to be ready
  window.addEventListener('firebaseReady', () => {
    checkFirebase();
  });
  
  // Also check immediately in case Firebase is already loaded
  checkFirebase();

  const ZONES = 6; // Number of horizontal zones (rows)
  const SECTIONS = 3; // Number of vertical sections (columns)
  const SLOTS = SECTIONS; // For clarity, SLOTS is the number of columns
  const SIDES = 2; // 0: player, 1: AI

  // Card types
  const CARD_TYPES = {
    ATTACK: 'Attack',
    DEFENSE: 'Defense',
    TRIPLE_BLAST: 'Triple Blast',
    DOUBLE_BLAST: 'Double Blast',
    TAUNT: 'Taunt',
    OVERBLAST: 'Overblast',
    FORTIFY: 'Fortify', // <-- Added
    COUNTER: 'Counter', // <-- Added
    COUNTER_ASSAULT: 'Counter Assault', // <-- Added
    AGILITY: 'Agility', // <-- Added
    SACRIFICE: 'Sacrifice', // <-- Added
    ENDEAVOR: 'Endeavor', // <-- NEW
    EQUALIZE: 'Equalize', // <-- NEW
  };

  // Utility: Remove 'team' property from card objects (for hand/deck, not board)
  function stripTeam(card) {
    if (!card) return card;
    const c = { ...card };
    if ('team' in c) delete c.team;
    return c;
  }

  // Card tooltip descriptions
  const CARD_DESCRIPTIONS = {
    'AttackDefense': 'Deals attack damage to an enemy and provides defense to your character.',
    'Double Blast': 'Deals damage to 2 selected enemies. Great for clearing multiple weak targets.',
    'Triple Blast': 'Deals damage to 3 selected enemies. Excellent for area control and clearing groups.',
    'Taunt': 'Forces all enemies to target this character and gives it +5 defense. Use to protect weaker allies.',
    'Overblast': 'Deals massive damage to a single target but reduces your character to 1 defense. Perfect for finishing off strong enemies.',
    'Fortify': 'Gives a character +10 defense and 2 stacks of taunt for the rest of the battle. Great for tanking.',
    'Counter': 'Negates the next attack to this character and adds attack bonus equal to the damage negated. Defensive strategy card.',
    'Counter Assault': 'Adds 2 stacks of counter and 1 stack of taunt to this character. Powerful defensive card.',
    'Agility': 'Makes a character untargetable for one turn. Use to avoid damage.',
    'Sacrifice': 'Reduces this character to 1 defense, gives it taunt, and gives all other friendly characters +5 defense. Last resort card.',
    'Endeavor': 'Reduces both this character and the selected enemy character to 1 defense. Offensive boost.',
    'Equalize': 'Reduces 2 selected enemies and both friendly characters to 1 defense. Tactical positioning card.'
  };

  // Tooltip system
  let tooltip = null;
  
  function showTooltip(element, text, x, y) {
    hideTooltip();
    
    tooltip = document.createElement('div');
    tooltip.textContent = text;
    tooltip.style.position = 'fixed';
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '12px';
    tooltip.style.maxWidth = '200px';
    tooltip.style.zIndex = '10000';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    tooltip.style.border = '1px solid #555';
    
    document.body.appendChild(tooltip);
    
    // Adjust position if tooltip goes off screen
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = (x - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = (y - rect.height - 10) + 'px';
    }
  }
  
  function hideTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  // Helper to generate a deck with split cards having random values
  function generateDeck() {
    // Default deck: 20 cards
    const baseDeck = [
      // Split cards (AttackDefense)
      { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
      { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
      { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
      { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
      { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
      { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
      { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
      { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
      { type: 'AttackDefense', attackValue: 5, defenseValue: 1 },
      { type: 'AttackDefense', attackValue: 5, defenseValue: 1 },
      // Ability cards
      { type: CARD_TYPES.DOUBLE_BLAST, value: 3 },
      { type: CARD_TYPES.DOUBLE_BLAST, value: 3 },
      { type: CARD_TYPES.TRIPLE_BLAST, value: 2 },
      { type: CARD_TYPES.TRIPLE_BLAST, value: 2 },
      { type: CARD_TYPES.TAUNT, value: 5 },
      { type: CARD_TYPES.AGILITY },
      { type: CARD_TYPES.OVERBLAST },
      { type: CARD_TYPES.FORTIFY },
      { type: CARD_TYPES.COUNTER },
      { type: CARD_TYPES.COUNTER_ASSAULT, value: 2 }, // <-- Added
      { type: CARD_TYPES.SACRIFICE },
      { type: CARD_TYPES.ENDEAVOR }, // <-- Add Endeavor to default deck for testing
      { type: CARD_TYPES.EQUALIZE }, // <-- Add Equalize to default deck for testing
    ];
    // Ensure no 'team' property on any deck card
    return baseDeck.map(card => stripTeam(card));
  }

  // Helper to generate a random AI deck following deck building rules
  function generateAIDeck() {
    const aiDeck = [];
    
    // Generate 10 static split cards (AttackDefense) - same as default deck
    const splitCards = [
      { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
      { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
      { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
      { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
      { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
      { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
      { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
      { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
      { type: 'AttackDefense', attackValue: 5, defenseValue: 1 },
      { type: 'AttackDefense', attackValue: 5, defenseValue: 1 }
    ];
    aiDeck.push(...splitCards);
    
    // Generate 10 ability cards with max 2 copies each
    const abilityCards = [
      CARD_TYPES.DOUBLE_BLAST,
      CARD_TYPES.TRIPLE_BLAST,
      CARD_TYPES.TAUNT,
      CARD_TYPES.OVERBLAST,
      CARD_TYPES.FORTIFY,
      CARD_TYPES.COUNTER,
      CARD_TYPES.COUNTER_ASSAULT,
      CARD_TYPES.AGILITY,
      CARD_TYPES.SACRIFICE,
      CARD_TYPES.ENDEAVOR,
      CARD_TYPES.EQUALIZE
    ];
    
    // Track how many copies of each card type we've added
    const cardCounts = {};
    abilityCards.forEach(cardType => {
      cardCounts[cardType] = 0;
    });
    
    // Add 10 ability cards, ensuring no more than 2 copies of each
    for (let i = 0; i < 10; i++) {
      // Get available cards (those with less than 2 copies)
      const availableCards = abilityCards.filter(cardType => cardCounts[cardType] < 2);
      
      // If we've used up all cards, break (shouldn't happen with 11 card types and 10 slots)
      if (availableCards.length === 0) break;
      
      // Pick a random available card
      const randomCardType = availableCards[Math.floor(Math.random() * availableCards.length)];
      cardCounts[randomCardType]++;
      
      const card = { type: randomCardType };
      
      // Add static values for cards that need them
      if (randomCardType === CARD_TYPES.DOUBLE_BLAST) {
        card.value = 3;
      } else if (randomCardType === CARD_TYPES.TRIPLE_BLAST) {
        card.value = 2;
      } else if (randomCardType === CARD_TYPES.TAUNT) {
        card.value = 5;
      } else if (randomCardType === CARD_TYPES.COUNTER_ASSAULT) {
        card.value = 2;
      }
      
      aiDeck.push(card);
    }
    
    // Ensure no 'team' property on any deck card
    return aiDeck.map(card => stripTeam(card));
  }

  const CARD_LIBRARY = generateDeck();

  // Game state
  let currentPlayer = 0; // 0: player, 1: AI
  let isPlayerTurn = false;
  let selectedCharacter = null;
  let selectedCard = null;
  let selectedTargets = [];
  let deck = [...CARD_LIBRARY];
  let playerHand = [];
  let aiHand = [];
  let player2Hand = [];
  let selectedHandCardIndex = null;
  let firstTurn = true;
  let playerTurns = 0;
  let aiTurns = 0;
  const MAX_TURNS = 20;
  let gameOver = false;
  let playerKnockouts = 0;
  let aiKnockouts = 0;
  let handScrollOffset = 0;
  let handLeftArrowBox = null;
  let handRightArrowBox = null;

  // Board state: [side][zone][section] = card or null
  let board = [
    Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)), // Player
    Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)), // AI
  ];

  // Animation state
  let currentAnimation = null;
  let pendingAnimation = null;

  // Floating text state
  let floatingTexts = [];

  // Animation colors for teams
  const TEAM_COLORS = ['#ff4444', '#44ff44', '#58a6ff']; // Lighter blue for better contrast

  // Track who made the last action
  let lastActionBy = null;

  // Animation state for moving characters
  let movingCharacters = [];

  // Add at the top-level (after other state variables)
  let pendingAdvance = false;

  let testDrawToggle = true; // Add this at the top-level (after other state variables)

  let gameMode = 'pvai'; // 'pvai' (default), 'pvp', or 'online'
  
  // Firebase online multiplayer state
  let gameRoomId = null;
  let myPlayerSide = null; // 0 or 1 - determines which side I am
  let myPlayerName = 'Player';
  let opponentName = 'Opponent';
  let firebaseEnabled = false;
  let gameUnsubscribe = null; // Firebase listener unsubscribe function
  let isLoadingFromFirebase = false; // Flag to prevent recursive Firebase loads

  function drawTargetIcon(ctx, x, y, radius) {
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // New attack animation drawing functions
  function drawFireBlast(ctx, x, y, angle) {
    const length = 55;
    const width = 12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Main flame body
    const gradient = ctx.createLinearGradient(length / 2, 0, -length / 2, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(length / 2, 0); // Tip
    ctx.quadraticCurveTo(0, -width, -length / 2, 0);
    ctx.quadraticCurveTo(0, width, length / 2, 0);
    ctx.fill();
    
    ctx.restore();
  }

  function drawWaterBlast(ctx, x, y) {
    // Water splash effect
    ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, 25, 20, Math.random() * Math.PI * 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 15, Math.random() * Math.PI * 2, 0, 2 * Math.PI);
    ctx.fill();

    // Dripping particles
    for (let i = 0; i < 3; i++) {
        const dX = x + (Math.random() - 0.5) * 25;
        const dY = y + (Math.random() - 0.5) * 20;
        const dSize = Math.random() * 5 + 2;
        ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(dX, dY, dSize, 0, 2 * Math.PI);
        ctx.fill();
    }
  }

  function drawRockBlast(ctx, x, y) {
    const numRocks = 5;
    const groupRadius = 15;
    for (let i = 0; i < numRocks; i++) {
        // Rocks in a static, circular formation
        const angle = (i / numRocks) * (2 * Math.PI);
        const rX = x + groupRadius * Math.cos(angle);
        const rY = y + groupRadius * Math.sin(angle);
        // Use `i` to create stable, varied sizes for the rocks.
        const size = 8 + (i % 3) * 3;
        ctx.fillStyle = '#696969';
        
        ctx.save();
        ctx.translate(rX, rY);
        // A small, fixed rotation for each rock to make it look less square.
        ctx.rotate(i * 0.5);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
    }
  }

  function drawFireHit(ctx, x, y, radius, alpha) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const pRadius = Math.random() * radius;
        const pX = x + pRadius * Math.cos(angle);
        const pY = y + pRadius * Math.sin(angle);
        const pSize = Math.random() * 6 + 2;
        const colors = ['#FF4500', '#FFA500', '#FFD700'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pX, pY, pSize, 0, 2 * Math.PI);
        ctx.fill();
    }
  }

  function drawWaterHit(ctx, x, y, radius, alpha) {
    // Outer splash ring
    ctx.strokeStyle = `rgba(0, 150, 255, ${alpha * 0.7})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Inner splash
    ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawRockHit(ctx, x, y, radius, alpha) {
    const numShards = 8;
    for (let i = 0; i < numShards; i++) {
        const angle = (i / numShards) * 2 * Math.PI;
        const sX = x + radius * Math.cos(angle);
        const sY = y + radius * Math.sin(angle);
        const size = 10 + Math.random() * 5;
        
        ctx.save();
        ctx.translate(sX, sY);
        ctx.rotate(angle);
        ctx.fillStyle = `rgba(105, 105, 105, ${alpha})`;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
    }
  }

  // Animation rendering
  function drawAnimation(delta) {
    if (!currentAnimation) return;
    const headerHeight = 40; // Add header height constant
    if (currentAnimation.type === 'attack') {
      // Draw blast
      const { start, end, color, progress, hitEffect, hitRadius = 0, hitAlpha = 0, attackStyle } = currentAnimation;
      if (!hitEffect) {
        const blastX = start.x + (end.x - start.x) * progress;
        const blastY = start.y + (end.y - start.y) * progress;
        ctx.save();
        
        switch (attackStyle) {
          case 'fire':
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            drawFireBlast(ctx, blastX, blastY, angle);
            break;
          case 'water':
            drawWaterBlast(ctx, blastX, blastY);
            break;
          case 'rocks':
            drawRockBlast(ctx, blastX, blastY);
            break;
          default:
            ctx.beginPath();
            ctx.arc(blastX, blastY, 18, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.fill();
        }

        ctx.restore();
      } else {
        // Draw hit effect at target
        ctx.save();

        switch (attackStyle) {
          case 'fire':
            drawFireHit(ctx, end.x, end.y, hitRadius, hitAlpha);
            break;
          case 'water':
            drawWaterHit(ctx, end.x, end.y, hitRadius, hitAlpha);
            break;
          case 'rocks':
            drawRockHit(ctx, end.x, end.y, hitRadius, hitAlpha);
            break;
          default:
            ctx.beginPath();
            ctx.arc(end.x, end.y, hitRadius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = hitAlpha;
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
            ctx.fill();
        }
        
        ctx.restore();
      }
    } else if (currentAnimation.type === 'multi_attack') {
      currentAnimation.attacks.forEach(attack => {
        if (attack.type === 'attack') { // for now only attacks here
          const { start, end, color, progress, hitEffect, hitRadius = 0, hitAlpha = 0, attackStyle } = attack;
          if (!hitEffect) {
            const blastX = start.x + (end.x - start.x) * progress;
            const blastY = start.y + (end.y - start.y) * progress;
            ctx.save();
            switch (attackStyle) {
              case 'fire':
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                drawFireBlast(ctx, blastX, blastY, angle);
                break;
              case 'water':
                drawWaterBlast(ctx, blastX, blastY);
                break;
              case 'rocks':
                drawRockBlast(ctx, blastX, blastY);
                break;
              default:
                ctx.beginPath();
                ctx.arc(blastX, blastY, 18, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.7;
                ctx.shadowColor = color;
                ctx.shadowBlur = 20;
                ctx.fill();
            }
            ctx.restore();
          } else {
            // Draw hit effect at target
            ctx.save();
            switch (attackStyle) {
              case 'fire':
                drawFireHit(ctx, end.x, end.y, hitRadius, hitAlpha);
                break;
              case 'water':
                drawWaterHit(ctx, end.x, end.y, hitRadius, hitAlpha);
                break;
              case 'rocks':
                drawRockHit(ctx, end.x, end.y, hitRadius, hitAlpha);
                break;
              default:
                ctx.beginPath();
                ctx.arc(end.x, end.y, hitRadius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = hitAlpha;
                ctx.shadowColor = color;
                ctx.shadowBlur = 25;
                ctx.fill();
            }
            ctx.restore();
          }
        }
      });
    } else if (currentAnimation.type === 'defense') {
      // Draw ripple
      const { center, color, radius } = currentAnimation;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Animation update
  function updateAnimation(delta) {
    if (!currentAnimation) return false;
    if (currentAnimation.type === 'attack') {
      currentAnimation.progress += delta * 1.8; // 1.8 = projectile speed (tweak as needed)
      if (currentAnimation.progress >= 1 && !currentAnimation.hitEffect) {
        // Trigger hit effect
        currentAnimation.hitEffect = true;
        currentAnimation.hitRadius = 18;
        currentAnimation.hitAlpha = 1;
      } else if (currentAnimation.hitEffect) {
        currentAnimation.hitRadius += delta * 22; // 22 = hit effect expansion speed
        currentAnimation.hitAlpha -= delta * 1.2; // 1.2 = fade out speed
        if (currentAnimation.hitAlpha <= 0) {
          // Animation done, apply damage
          currentAnimation.onComplete();
          currentAnimation = null;
          // Promote pendingAnimation if exists
          if (pendingAnimation) {
            currentAnimation = pendingAnimation;
            pendingAnimation = null;
          }
        }
      }
    } else if (currentAnimation.type === 'multi_attack') {
      let allSubAttacksDone = true;
      currentAnimation.attacks.forEach(attack => {
        if (attack.completed) return;

        allSubAttacksDone = false; // If any attack is not completed, the whole animation is not done.

        attack.progress += delta * 1.8;
        if (attack.progress >= 1 && !attack.hitEffect) {
          attack.hitEffect = true;
          attack.hitRadius = 18;
          attack.hitAlpha = 1;
        } else if (attack.hitEffect) {
          attack.hitRadius += delta * 22;
          attack.hitAlpha -= delta * 1.2;
          if (attack.hitAlpha <= 0) {
            attack.completed = true; // Mark as completed
            attack.onComplete();
          }
        }
      });

      // After checking all, see if all have been marked completed.
      const allDone = currentAnimation.attacks.every(a => a.completed);

      if (allDone) {
        currentAnimation = null;
        // Promote pendingAnimation if exists
        if (pendingAnimation) {
          currentAnimation = pendingAnimation;
          pendingAnimation = null;
        }
      }
      return true;
    } else if (currentAnimation.type === 'defense') {
      // Double out pulse (expand, expand)
      if (typeof currentAnimation.pulseCount === 'undefined') currentAnimation.pulseCount = 0;
      currentAnimation.pulseTime += delta;
      let t = Math.min(currentAnimation.pulseTime / currentAnimation.pulseDuration, 1);
      // Out pulse: ease from 25 to 50
      let ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
      currentAnimation.radius = 25 + (50 - 25) * ease;
      if (t >= 1) {
        currentAnimation.pulseCount++;
        if (currentAnimation.pulseCount < 2) {
          currentAnimation.pulseTime = 0; // Start next pulse
        } else {
          currentAnimation.onComplete();
          currentAnimation = null;
          if (pendingAnimation) {
            currentAnimation = pendingAnimation;
            pendingAnimation = null;
          }
        }
      }
      return true;
    }
    return true;
  }

  // Create Start Turn button
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Turn';
  startButton.style.position = 'absolute';
  startButton.style.right = '20px';
  startButton.style.top = '50%';
  startButton.style.transform = 'translateY(-50%)';
  startButton.style.padding = '10px 20px';
  startButton.style.fontSize = '16px';
  startButton.style.backgroundColor = '#4CAF50';
  startButton.style.color = 'white';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '5px';
  startButton.style.cursor = 'pointer';
  startButton.style.zIndex = '1000';
  gameContainer.appendChild(startButton);

  // Place initial players on the board
  // Player characters in zones 3 (row 3), sections 0,1,2
  board[0][3][0] = { team: 0, def: 5 }; // Player Red, left
  board[0][3][1] = { team: 1, def: 5 }; // Player Green, center
  board[0][3][2] = { team: 2, def: 5 }; // Player Blue, right
  // AI characters in zone 2 (row 2), sections 0,1,2
  board[1][2][0] = { team: 0, def: 5 }; // AI Red, left
  board[1][2][1] = { team: 1, def: 5 }; // AI Green, center
  board[1][2][2] = { team: 2, def: 5 }; // AI Blue, right

  console.log('Board initialized:', board);

  // Add click handlers
  startButton.onclick = function() {
    console.log('Start Turn clicked');
    startPlayerTurn();
    if (startButton && startButton.parentNode) {
      startButton.parentNode.removeChild(startButton);
    }
  };
  // Touch event handlers that convert touch to mouse-like events
  function handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      // Create a synthetic mouse event
      const syntheticEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        pageX: touch.pageX,
        pageY: touch.pageY
      };
      handleCanvasClick(syntheticEvent);
    }
  }

  function handleTouchMove(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const syntheticEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        pageX: touch.pageX,
        pageY: touch.pageY
      };
      handleCanvasMouseMove(syntheticEvent);
    }
  }

  // Mouse events
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

  function drawCardFromDeck() {
    if (deck.length === 0) {
      deck = [...CARD_LIBRARY];
    }
    const cardIndex = Math.floor(Math.random() * deck.length);
    const card = deck.splice(cardIndex, 1)[0];
    playerHand.push(stripTeam(card)); // Ensure no team property in hand
    console.log('Card drawn:', card);
    return;
  }

  function startPlayerTurn() {
    if (gameOver) return;
    if (gameMode === 'pvai') {
    isPlayerTurn = true;
    } else if (gameMode === 'pvp') {
      if (firstTurn) {
        isPlayerTurn = true; // Always start with Player 1
      }
      // Do not toggle isPlayerTurn here; toggling is handled in endTurn
    }
    console.log('Starting player turn');
    selectedCharacter = null;
    selectedCard = null;
    selectedTargets = [];
    selectedHandCardIndex = null; // Reset the selected hand card index
    startButton.disabled = true;
    startButton.style.backgroundColor = '#cccccc';
    firstTurn = false;
    lastActionBy = isPlayerTurn ? 'player' : 'player2';
    // Remove the start turn button from view after the first turn
    if (startButton && startButton.parentNode) {
      startButton.parentNode.removeChild(startButton);
    }
    // Remove agility buff at the start of the player's turn
    for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
            const char = board[isPlayerTurn ? 0 : 1][zone][section];
            if (char && char.agility) {
                char.agility--;
                if (char.agility <= 0) {
                    delete char.agility;
                }
            }
        }
    }
    // --- New: Check for playable cards ---
    setTimeout(() => {
      if (!hasPlayableCard()) {
        addFloatingText(canvas.width / 2, canvas.height / 2, 'No valid cards to play!', '#FFD700', () => {
          endTurn();
        }, {
          align: 'center',
          fontSize: 'bold 32px Arial',
          duration: 60,
          isStatic: true
        });
      }
    }, 300);
  }

  // Returns true if the player has any playable card given the current board state
  function hasPlayableCard() {
    // PvP: check correct hand
    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
    // Check for any non-attack card
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      // If it's not an attack or split card, assume it's always playable
      if (
        card.type !== 'Attack' &&
        card.type !== 'AttackDefense' &&
        card.type !== CARD_TYPES.DOUBLE_BLAST &&
        card.type !== CARD_TYPES.TRIPLE_BLAST &&
        card.type !== CARD_TYPES.OVERBLAST &&
        card.type !== CARD_TYPES.AGILITY &&
        card.type !== CARD_TYPES.ENDEAVOR &&
        card.type !== CARD_TYPES.EQUALIZE
      ) {
        return true;
      }
    }
    // If only attack cards, check if any enemy is targetable
    let canTarget = false;
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        const enemy = board[1][zone][section];
        if (enemy && !enemy.agility) {
          canTarget = true;
        }
      }
    }
    return canTarget;
  }

  function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Hand arrow click detection (always allow)
    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
    const cardSpacing = 60;
    const visibleWidth = canvas.width - 80;
    const maxVisible = Math.floor(visibleWidth / cardSpacing);
    if (handLeftArrowBox && x >= handLeftArrowBox.x && x <= handLeftArrowBox.x + handLeftArrowBox.w && y >= handLeftArrowBox.y && y <= handLeftArrowBox.y + handLeftArrowBox.h) {
      handScrollOffset = Math.max(0, handScrollOffset - maxVisible);
      drawBoard();
      return;
    }
    if (handRightArrowBox && x >= handRightArrowBox.x && x <= handRightArrowBox.x + handRightArrowBox.w && y >= handRightArrowBox.y && y <= handRightArrowBox.y + handRightArrowBox.h) {
      handScrollOffset = Math.min(handScrollOffset + maxVisible, hand.length - maxVisible);
      drawBoard();
      return;
    }

    // Prevent input if it's not the player's turn
    if (gameOver) return;
    if (gameMode === 'pvai' && !isPlayerTurn) return;
    if (gameMode === 'online' && myPlayerSide !== null) {
      // In online mode, check if it's my turn
      const isMyTurn = (isPlayerTurn && myPlayerSide === 0) || (!isPlayerTurn && myPlayerSide === 1);
      if (!isMyTurn) return;
    }
    if (gameMode === 'pvp' && !isPlayerTurn) return;
    const sectionWidth = canvas.width / SECTIONS;
    const playAreaHeight = canvas.height - 100;
    const zoneHeight = playAreaHeight / ZONES;
    for (let side = 0; side < SIDES; side++) {
      for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
          const card = board[side][zone][section];
          if (card) {
            const cardX = section * sectionWidth + sectionWidth / 2 - 25;
            // Clamp Y so clickable area is always within play area
            const headerHeight = 40;
            const minY = headerHeight + 2;
            const maxY = canvas.height - 100 - 2 - 70; // 70 is card height
            let cardY = zone * zoneHeight + zoneHeight / 2 - 35 + headerHeight;
            cardY = Math.max(minY, Math.min(cardY, maxY));
            if (x >= cardX && x <= cardX + 50 && y >= cardY && y <= cardY + 70) {
              handleCharacterClick(side, zone, section);
              return;
            }
          }
        }
      }
    }
    // Only check for hand card clicks if a character is selected
    if (selectedCharacter || (selectedCard && (selectedCard.type === CARD_TYPES.DOUBLE_BLAST || selectedCard.type === CARD_TYPES.TRIPLE_BLAST))) {
      const cardSpacing = 60;
      const visibleWidth = canvas.width - 80;
      const maxVisible = Math.floor(visibleWidth / cardSpacing);
      const handX = 40;
      const handY = canvas.height - 70;
      for (let i = 0; i < maxVisible; i++) {
        const cardIndex = handScrollOffset + i;
        if (cardIndex >= hand.length) break;
        const cardX = handX + i * cardSpacing;
      if (x >= cardX && x <= cardX + 50 && y >= handY && y <= handY + 70) {
          handleCardClick(cardIndex);
        return;
      }
      }
    }
  }

  function handleCanvasMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if hovering over a hand card
    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
    const cardSpacing = 60;
    const visibleWidth = canvas.width - 80;
    const maxVisible = Math.floor(visibleWidth / cardSpacing);
    const handX = 40;
    const handY = canvas.height - 70;
    
    for (let i = 0; i < maxVisible; i++) {
      const cardIndex = handScrollOffset + i;
      if (cardIndex >= hand.length) break;
      const cardX = handX + i * cardSpacing;
      if (x >= cardX && x <= cardX + 50 && y >= handY && y <= handY + 70) {
        const card = hand[cardIndex];
        if (card && CARD_DESCRIPTIONS[card.type]) {
          showTooltip(canvas, CARD_DESCRIPTIONS[card.type], event.pageX + 10, event.pageY - 10);
        }
        return;
      }
    }
    
    // If not hovering over a hand card, hide tooltip
    hideTooltip();
  }
  
  function handleCanvasMouseLeave(event) {
    hideTooltip();
  }

  function countEnemyCharacters() {
    let count = 0;
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        if (board[1][zone][section]) { // Side 1 is AI/enemy
          count++;
        }
      }
    }
    return count;
  }

  function handleCharacterClick(side, zone, section) {
    // Prevent input during animation or character movement
    if (currentAnimation || movingCharacters.length > 0) {
      return;
    }
    const headerHeight = 40; // Add header height constant
    if (!selectedCard) {
      // Only restrict the first selection (your own character) in PvP and PvAI
      if (
        (gameMode === 'pvp' && side !== (isPlayerTurn ? 0 : 1)) ||
        (gameMode === 'pvai' && side !== 0)
      ) {
        return;
      }
      selectedCharacter = { side, zone, section };
      selectedTargets = [];
      // Sync to Firebase for online mode
      if (gameMode === 'online' && firebaseEnabled) {
        syncGameStateToFirebase();
      }
      drawBoard();
    } else {
      const isMultiBlast = selectedCard.type === CARD_TYPES.DOUBLE_BLAST || selectedCard.type === CARD_TYPES.TRIPLE_BLAST;
      // Determine which side is the enemy for targeting
      const enemySide = gameMode === 'pvp' ? (isPlayerTurn ? 1 : 0) : 1;
      // Only restrict targeting if player is targeting enemy
      const tauntingOpponent = findTauntingCharacter(enemySide);
      if (
        side === enemySide &&
        tauntingOpponent &&
        !selectedTargets.some(t => board[t.side][t.zone][t.section] === tauntingOpponent) &&
        board[side][zone][section] !== tauntingOpponent
      ) {
        // A taunt is active and the taunter hasn't been selected yet; must select it first
        console.log("Invalid target: A taunt is active elsewhere.");
        return;
      }

      // Double/Triple Blast Logic
      if (side === enemySide && isMultiBlast) {
        const target = board[side][zone][section];
        if (target && target.agility) {
          // Cannot target a character with agility
          addFloatingText(x, y - 20, 'Agile!', '#ffcc00');
          return;
        }
        if (target) {
          // Avoid adding duplicates
          const isAlreadySelected = selectedTargets.some(t => t.side === side && t.zone === zone && t.section === section);
          if (isAlreadySelected) return;

          selectedTargets.push({ side, zone, section });

          const totalEnemyCharacters = countEnemyCharacters();
          const maxTargets = selectedCard.type === CARD_TYPES.TRIPLE_BLAST ? 3 : 2;

          // Count valid (non-agile) enemy characters
          let validTargets = 0;
          for (let z = 0; z < ZONES; z++) {
            for (let s = 0; s < SECTIONS; s++) {
              const c = board[1][z][s];
              if (c && !c.agility) validTargets++;
            }
          }

          if (
            selectedTargets.length === maxTargets ||
            selectedTargets.length === validTargets
          ) {
            const attacker = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
            const attackerPos = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
            const color = TEAM_COLORS[attacker.team];

            let attackStyle = 'blast';
            if (attacker.team === 0) attackStyle = 'fire';
            else if (attacker.team === 1) attackStyle = 'rocks';
            else if (attacker.team === 2) attackStyle = 'water';

            if (selectedTargets.length === 1) {
              // Single target Multi-Blast
              let damage = selectedCard.value;
              if (attacker && attacker.tempAttackBoost) {
                damage += attacker.tempAttackBoost;
                delete attacker.tempAttackBoost;
              }

              const targetRef = selectedTargets[0];
              const targetChar = board[targetRef.side][targetRef.zone][targetRef.section];
              const targetPos = getCharacterPosition(targetRef.side, targetRef.zone, targetRef.section, headerHeight);
              currentAnimation = {
                type: 'attack',
                attackStyle,
                start: attackerPos,
                end: targetPos,
                color,
                progress: 0,
                onComplete: () => {
                  addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
                  applyDamage(targetChar, damage, () => {
                    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                    hand.splice(hand.indexOf(selectedCard), 1);
                    selectedHandCardIndex = null;
                    selectedCard = null;
                    selectedCharacter = null;
                    selectedTargets = [];
          endTurn();
                  });
                }
              };
              return;
            }

            let animationsDone = 0;
            const onSingleAttackComplete = (boostConsumed) => {
              animationsDone++;
              if (animationsDone === selectedTargets.length) {
                // Last attack, delete the boost if it hasn't been
                if (attacker.tempAttackBoost && !boostConsumed) {
                  delete attacker.tempAttackBoost;
                }
                const attackingSide = selectedCharacter.side;
                checkAndAdvanceTeam(attackingSide, () => {
                  const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                  hand.splice(hand.indexOf(selectedCard), 1);
                  selectedHandCardIndex = null;
                  selectedCard = null;
                  selectedCharacter = null;
                  selectedTargets = [];
                  endTurn();
                });
              }
            };

            const attacks = selectedTargets.map((targetRef, index) => {
              const targetChar = board[targetRef.side][targetRef.zone][targetRef.section];
              const targetPos = getCharacterPosition(targetRef.side, targetRef.zone, targetRef.section, headerHeight);
              return {
                type: 'attack',
                attackStyle,
                start: attackerPos,
                end: targetPos,
                color,
                progress: 0,
                onComplete: () => {
                  let damage = selectedCard.value;
                  if (index === 0 && attacker && attacker.tempAttackBoost) {
                    damage += attacker.tempAttackBoost;
                    delete attacker.tempAttackBoost;
                  }
                  addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
                  applyDamage(targetChar, damage, () => onSingleAttackComplete(false));
                }
              };
            });

            currentAnimation = {
              type: 'multi_attack',
              attacks,
            };
          }
        }
      }
      // Attack card or split card: select enemy target
      else if (side === enemySide && (selectedCard.type === 'Attack' || selectedCard.type === 'AttackDefense' || selectedCard.type === CARD_TYPES.OVERBLAST || selectedCard.type === CARD_TYPES.AGILITY)) {
        const target = board[side][zone][section];
        if (target && target.agility) {
          // Cannot target a character with agility
          addFloatingText(x, y - 20, 'Agile!', '#ffcc00');
          return;
        }
        if (target) {
          const attacker = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
          const attackerPos = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
          const targetPos = getCharacterPosition(side, zone, section, headerHeight);
          const color = TEAM_COLORS[attacker.team];
          
          let attackStyle = 'blast';
          if (attacker.team === 0) attackStyle = 'fire';
          else if (attacker.team === 1) attackStyle = 'rocks';
          else if (attacker.team === 2) attackStyle = 'water';

          // === RESTORE: Agility card applies agility buff after attack ===
          if (selectedCard.type === CARD_TYPES.AGILITY) {
            const attackValue = selectedCard.type === CARD_TYPES.AGILITY ? 5 : selectedCard.value;
            const cardType = selectedCard.type;
            currentAnimation = {
              type: 'attack',
              attackStyle,
              start: attackerPos,
              end: targetPos,
              color,
              progress: 0,
              onComplete: () => {
                let damage = attackValue;
                const attackerChar = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
                if (attackerChar && attackerChar.tempAttackBoost) {
                  damage += attackerChar.tempAttackBoost;
                  delete attackerChar.tempAttackBoost;
                }
                const finishTurnAction = () => {
                  if (cardType === CARD_TYPES.AGILITY) {
                    attacker.agility = 1;
                    addFloatingText(attackerPos.x + 40, attackerPos.y - 10, `Agility!`, '#ffcc00', endTurn);
                  } else {
                    endTurn();
                  }
                  const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                  hand.splice(hand.indexOf(selectedCard), 1);
                  selectedHandCardIndex = null;
                  selectedCard = null;
                  selectedCharacter = null;
                };
                addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
                applyDamage(target, damage, finishTurnAction);
              }
            };
          }
          // === END RESTORE ===
          else if (side === enemySide && selectedCard.type === 'AttackDefense') {
            // Split card: use the card's attackValue and defenseValue
            let atkValue = selectedCard.attackValue;
            const defValue = selectedCard.defenseValue;
            const character = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
            const attackerTeam = character.team;
            if (character && character.tempAttackBoost) {
              atkValue += character.tempAttackBoost;
              delete character.tempAttackBoost;
            }

            // First, do the attack animation
            currentAnimation = {
              type: 'attack',
              attackStyle,
              start: attackerPos,
              end: targetPos,
              color,
              progress: 0,
              onComplete: () => {
                addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${atkValue}`, '#ff4444');
                applyDamage(target, atkValue, () => {
                  // After ALL pushbacks/advances, do defense animation
                  let newCharacterPos = null;
                  let newCharacter = null;
                  // Find the first character on the player's side with the same team as the attacker
                  for (let zone = 0; zone < ZONES; zone++) {
                    for (let section = 0; section < SECTIONS; section++) {
                      const c = board[selectedCharacter.side][zone][section];
                      if (c && c.team === attackerTeam) {
                        newCharacterPos = getCharacterPosition(selectedCharacter.side, zone, section, headerHeight);
                        newCharacter = c;
                        break;
                      }
                    }
                    if (newCharacterPos) break;
                  }
                  if (newCharacterPos && newCharacter) {
                    pendingAnimation = {
                      type: 'defense',
                      center: newCharacterPos,
                      color,
                      radius: 25,
                      pulseTime: 0,
                      pulseDuration: 0.6,
                      onComplete: () => {
                        applyDefenseBoost(newCharacter, defValue);
                        const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                        hand.splice(hand.indexOf(selectedCard), 1);
                        selectedHandCardIndex = null;
                        selectedCard = null;
                        selectedCharacter = null;
                        addFloatingText(newCharacterPos.x + 40, newCharacterPos.y - 10, `+${defValue}`, '#44ff44', endTurn);
                      }
                    };
                  } else {
                    // Character not on board, show message and end turn
                    addFloatingText(canvas.width / 2, canvas.height / 2, 'No Defense (KO)', '#888', () => {
                      const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                      hand.splice(hand.indexOf(selectedCard), 1);
                      selectedHandCardIndex = null;
                      selectedCard = null;
                      selectedCharacter = null;
                      endTurn();
                    }, {
                      align: 'center',
                      fontSize: 'bold 32px Arial',
                      duration: 60,
                      isStatic: true
                    });
                  }
                });
              }
            };
          } else if (selectedCard.type === CARD_TYPES.OVERBLAST) {
            currentAnimation = {
              type: 'attack',
              attackStyle, // Using character's elemental style
              start: attackerPos,
              end: targetPos,
              color,
              progress: 0,
              onComplete: () => {
                const damage = 50;
                const selfDebuffText = "DEF -> 1";

                // This callback runs after the main attack animation is done
                const onAttackSequenceComplete = () => {
                  // Debuff the attacker
                  attacker.def = 1;
                  addFloatingText(attackerPos.x - 20, attackerPos.y - 20, selfDebuffText, '#ff4444', () => {
                    // Then end the turn
                    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                    hand.splice(hand.indexOf(selectedCard), 1);
                    selectedHandCardIndex = null;
                    selectedCard = null;
                    selectedCharacter = null;
                    endTurn();
                  });
                };

                addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
                // The onAttackSequenceComplete callback will be called by applyDamage, after any pushbacks/advances
                applyDamage(target, damage, onAttackSequenceComplete);
              }
            };
          } else if (selectedCard.type === CARD_TYPES.AGILITY) {
            // AGILITY: Deal 5 damage, then apply agility buff to attacker
            currentAnimation = {
              type: 'attack',
              attackStyle: (attacker.team === 0) ? 'fire' : (attacker.team === 1) ? 'rocks' : (attacker.team === 2) ? 'water' : 'blast',
              start: attackerPos,
              end: targetPos,
              color: '#ff4444',
              progress: 0,
              onComplete: () => {
                addFloatingText(targetPos.x + 40, targetPos.y - 10, `-5`, '#ff4444');
                applyDamage(target, 5, () => {
                  attacker.agility = 1;
                  const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                  hand.splice(hand.indexOf(selectedCard), 1);
                  selectedHandCardIndex = null;
                  selectedCard = null;
                  selectedCharacter = null;
                  addFloatingText(attackerPos.x + 40, attackerPos.y - 10, `Agility!`, '#ff4444', endTurn);
                });
              }
            };
          }
        }
      }
      // Endeavor card: set both target and user DEF to 1
      else if (side === enemySide && selectedCard.type === CARD_TYPES.ENDEAVOR) {
        const target = board[side][zone][section];
        if (target) {
          const attacker = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
          const attackerPos = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
          const targetPos = getCharacterPosition(side, zone, section, headerHeight);
          const color = TEAM_COLORS[attacker.team];
          currentAnimation = {
            type: 'attack',
            attackStyle: (attacker.team === 0) ? 'fire' : (attacker.team === 1) ? 'rocks' : (attacker.team === 2) ? 'water' : 'blast',
            start: attackerPos,
            end: targetPos,
            color,
            progress: 0,
            onComplete: () => {
              // Remove a stack of taunt if present (match applyDamage logic)
              if (target.taunt) {
                if (typeof target.taunt !== 'number') target.taunt = 1;
                target.taunt--;
                if (target.taunt <= 0) delete target.taunt;
              }
              target.def = 1;
              attacker.def = 1;
              addFloatingText(targetPos.x + 40, targetPos.y - 10, 'DEF 1', '#ff4444');
              addFloatingText(attackerPos.x + 40, attackerPos.y - 10, 'DEF 1', '#ff4444', () => {
                const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                hand.splice(hand.indexOf(selectedCard), 1);
                selectedHandCardIndex = null;
                selectedCard = null;
                selectedCharacter = null;
                endTurn();
              });
            }
          };
        }
      }
      // Equalize card: allow selecting up to 2 enemy targets (no effect)
      else if (side === enemySide && selectedCard.type === CARD_TYPES.EQUALIZE) {
        const target = board[side][zone][section];
        if (target && target.agility) {
          addFloatingText(x, y - 20, 'Agile!', '#ffcc00');
          return;
        }
        if (target) {
          // Avoid adding duplicates
          const isAlreadySelected = selectedTargets.some(t => t.side === side && t.zone === zone && t.section === section);
          if (isAlreadySelected) return;

          selectedTargets.push({ side, zone, section });

          // Count valid (non-agile) enemy characters
          let validTargets = 0;
          for (let z = 0; z < ZONES; z++) {
            for (let s = 0; s < SECTIONS; s++) {
              const c = board[1][z][s];
              if (c && !c.agility) validTargets++;
            }
          }

          const maxTargets = 2;
          if (
            selectedTargets.length === maxTargets ||
            selectedTargets.length === validTargets
          ) {
            const attacker = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
            const attackerPos = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
            const color = TEAM_COLORS[attacker.team];

            let attackStyle = 'blast';
            if (attacker.team === 0) attackStyle = 'fire';
            else if (attacker.team === 1) attackStyle = 'rocks';
            else if (attacker.team === 2) attackStyle = 'water';

            let animationsDone = 0;
            const onSingleAttackComplete = () => {
              animationsDone++;
              if (animationsDone === selectedTargets.length) {
                // After both enemy animations, set other two characters on the attacker's side DEF to 1
                const attackerKey = `${selectedCharacter.side},${selectedCharacter.zone},${selectedCharacter.section}`;
                for (let zone = 0; zone < ZONES; zone++) {
                  for (let section = 0; section < SECTIONS; section++) {
                    const char = board[selectedCharacter.side][zone][section];
                    if (char && `${selectedCharacter.side},${zone},${section}` !== attackerKey) {
                      char.def = 1;
                      const pos = getCharacterPosition(selectedCharacter.side, zone, section, headerHeight);
                      addFloatingText(pos.x + 40, pos.y - 10, 'DEF 1', '#ff4444');
                    }
                  }
                }
                // Now remove the card and end the turn
                const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
                hand.splice(hand.indexOf(selectedCard), 1);
                selectedHandCardIndex = null;
                selectedCard = null;
                selectedCharacter = null;
                selectedTargets = [];
                endTurn();
              }
            };

            const attacks = selectedTargets.map((targetRef) => {
              const targetChar = board[targetRef.side][targetRef.zone][targetRef.section];
              const targetPos = getCharacterPosition(targetRef.side, targetRef.zone, targetRef.section, headerHeight);
              return {
                type: 'attack',
                attackStyle,
                start: attackerPos,
                end: targetPos,
                color,
                progress: 0,
                onComplete: () => {
                  targetChar.def = 1;
                  addFloatingText(targetPos.x + 40, targetPos.y - 10, 'DEF 1', '#ff4444', onSingleAttackComplete);
                }
              };
            });

            currentAnimation = {
              type: 'multi_attack',
              attacks,
            };
          }
        }
      }
    }
  }

  function handleCardClick(cardIndex) {
    // PvP: use correct hand
    const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
    const headerHeight = 40; // Add header height constant
    if (selectedCharacter) {
      selectedCard = hand[cardIndex];
      selectedHandCardIndex = cardIndex;
      selectedTargets = [];
      // Sync to Firebase for online mode
      if (gameMode === 'online' && firebaseEnabled) {
        syncGameStateToFirebase();
      }
      // Endeavor card logic
      if (selectedCard.type === CARD_TYPES.ENDEAVOR) {
        // Wait for user to select a target (handled in handleCharacterClick)
        drawBoard();
        return;
      }
      // Sacrifice card logic
      if (selectedCard.type === CARD_TYPES.SACRIFICE) {
        const character = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
        if (character) {
          // Remove all taunt from friendly characters before applying new taunt
          for (let z = 0; z < ZONES; z++) {
            for (let s = 0; s < SECTIONS; s++) {
              if (
                !(z === selectedCharacter.zone && s === selectedCharacter.section) &&
                board[selectedCharacter.side][z][s] &&
                board[selectedCharacter.side][z][s].taunt
              ) {
                delete board[selectedCharacter.side][z][s].taunt;
              }
            }
          }
          // Set DEF to 1 and give taunt
          character.def = 1;
          if (character.taunt && typeof character.taunt === 'number') {
            character.taunt += 1;
          } else {
            character.taunt = 1;
          }
          // Give +5 DEF to all other friendly characters (any zone)
          for (let zone = 0; zone < ZONES; zone++) {
            for (let section = 0; section < SECTIONS; section++) {
              // Skip the selected character
              if (zone === selectedCharacter.zone && section === selectedCharacter.section) continue;
              const otherChar = board[selectedCharacter.side][zone][section];
              if (otherChar) {
                applyDefenseBoost(otherChar, 5);
                const pos = getCharacterPosition(selectedCharacter.side, zone, section, headerHeight);
                addFloatingText(pos.x + 40, pos.y - 10, `+5`, '#44ff44');
              }
            }
          }
          // Floating text for sacrifice
          const pos = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
          addFloatingText(pos.x + 40, pos.y - 10, `DEF 1`, '#ff4444');
          addFloatingText(pos.x + 40, pos.y + 10, `Taunt!`, '#FFD700', () => {
            const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
            hand.splice(hand.indexOf(selectedCard), 1);
        selectedHandCardIndex = null;
            selectedCard = null;
            selectedCharacter = null;
        endTurn();
          });
        }
        drawBoard();
        return;
      }
    }
    if (
      selectedCard.type === 'Defense' ||
      selectedCard.type === 'Taunt' ||
      selectedCard.type === CARD_TYPES.FORTIFY ||
      selectedCard.type === CARD_TYPES.COUNTER_ASSAULT || // <-- Added
      selectedCard.type === CARD_TYPES.COUNTER
      // REMOVED AGILITY from this block
    ) {
      const character = board[selectedCharacter.side][selectedCharacter.zone][selectedCharacter.section];
      const center = getCharacterPosition(selectedCharacter.side, selectedCharacter.zone, selectedCharacter.section, headerHeight);
      let boost = selectedCard.value;
      const color = TEAM_COLORS[character.team];
      currentAnimation = {
        type: 'defense',
        center,
        color,
        radius: 25,
        pulseTime: 0,
        pulseDuration: 0.6,
        onComplete: () => {
          if (selectedCard && character) {
            if (selectedCard.type === CARD_TYPES.FORTIFY) {
              applyDefenseBoost(character, 10);
              // Remove all taunt from friendly characters except the selected one
              for (let z = 0; z < ZONES; z++) {
                for (let s = 0; s < SECTIONS; s++) {
                  if (
                    !(z === selectedCharacter.zone && s === selectedCharacter.section) &&
                    board[selectedCharacter.side][z][s] &&
                    board[selectedCharacter.side][z][s].taunt
                  ) {
                    delete board[selectedCharacter.side][z][s].taunt;
                  }
                }
              }
              // Stack taunt: add 2
              if (character.taunt && typeof character.taunt === 'number') {
                character.taunt += 2;
    } else {
                character.taunt = 2;
              }
              boost = 10;
            } else if (selectedCard.type === CARD_TYPES.COUNTER) {
              if (character.counter && character.counter > 0) {
                character.counter += 1;
              } else {
                character.counter = 1;
              }
              const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
              hand.splice(hand.indexOf(selectedCard), 1);
              selectedHandCardIndex = null;
              selectedCard = null;
              selectedCharacter = null;
              addFloatingText(center.x + 40, center.y - 10, `Counter`, '#ff4444', endTurn);
              return;
            } else if (selectedCard.type === CARD_TYPES.COUNTER_ASSAULT) {
              character.def = 1;
              character.counter = 2;
              // Remove all taunt from friendly characters except the selected one
              for (let z = 0; z < ZONES; z++) {
                for (let s = 0; s < SECTIONS; s++) {
                  if (
                    !(z === selectedCharacter.zone && s === selectedCharacter.section) &&
                    board[selectedCharacter.side][z][s] &&
                    board[selectedCharacter.side][z][s].taunt
                  ) {
                    delete board[selectedCharacter.side][z][s].taunt;
                  }
                }
              }
              // Stack taunt: add 1
              if (character.taunt && typeof character.taunt === 'number') {
                character.taunt += 1;
              } else {
                character.taunt = 1;
              }
              const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
              hand.splice(hand.indexOf(selectedCard), 1);
              selectedHandCardIndex = null;
              selectedCard = null;
              selectedCharacter = null;
              addFloatingText(center.x + 40, center.y - 10, `Counter x2`, '#3399ff', () => {
                addFloatingText(center.x + 40, center.y + 10, `Taunt!`, '#FFD700', endTurn);
              });
              return;
            } else {
              applyDefenseBoost(character, boost);
            }

            if (selectedCard.type === 'Taunt') {
              // Remove all taunt (and stacks) from all friendly characters except the selected one
              for (let z = 0; z < ZONES; z++) {
                for (let s = 0; s < SECTIONS; s++) {
                  if (
                    !(z === selectedCharacter.zone && s === selectedCharacter.section) &&
                    board[selectedCharacter.side][z][s] &&
                    board[selectedCharacter.side][z][s].taunt
                  ) {
                    delete board[selectedCharacter.side][z][s].taunt;
                  }
                }
              }
              // Stack taunt on the selected character
              if (character.taunt && typeof character.taunt === 'number') {
                character.taunt += 1;
              } else {
                character.taunt = 1;
              }
            }

            const hand = gameMode === 'pvp' ? (isPlayerTurn ? playerHand : player2Hand) : playerHand;
            hand.splice(hand.indexOf(selectedCard), 1);
            selectedHandCardIndex = null;
            selectedCard = null;
            selectedCharacter = null;
            // Sync to Firebase for online mode
            if (gameMode === 'online' && firebaseEnabled) {
              syncGameStateToFirebase();
            }
            addFloatingText(center.x + 40, center.y - 10, `+${boost}`, '#44ff44', endTurn);
          }
        }
      };
    }
    drawBoard();
  }

  function checkAndAdvanceTeam(attackingSide, onAdvanceComplete = null) {
    // Find most forward character positions for both teams
    let playerForwardZone = ZONES - 1;
    let aiForwardZone = 0;

    // Find player's most forward position
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        if (board[0][zone][section]) {
          playerForwardZone = Math.min(playerForwardZone, zone);
        }
      }
    }

    // Find AI's most forward position
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        if (board[1][zone][section]) {
          aiForwardZone = Math.max(aiForwardZone, zone);
        }
      }
    }

    // Check if there's an empty zone between the teams
    let hasEmptyZone = false;
    let startZone, endZone;
    
    if (attackingSide === 0) { // Player attacked
      startZone = playerForwardZone;
      endZone = aiForwardZone;
    } else { // AI attacked
      startZone = aiForwardZone;
      endZone = playerForwardZone;
    }

    // Check each zone between the teams for emptiness
    for (let zone = Math.min(startZone, endZone) + 1; zone < Math.max(startZone, endZone); zone++) {
      let zoneIsEmpty = true;
      for (let section = 0; section < SECTIONS; section++) {
        if (board[0][zone][section] || board[1][zone][section]) {
          zoneIsEmpty = false;
          break;
        }
      }
      if (zoneIsEmpty) {
        hasEmptyZone = true;
        break;
      }
    }

    // If there's an empty zone, advance the attacking team
    if (hasEmptyZone) {
      addFloatingText(canvas.width / 2, canvas.height / 2, "Zone Advance", "#FFD700", () => {
        let charactersToMove = [];
        
        // Collect all characters from the attacking team
        for (let zone = 0; zone < ZONES; zone++) {
          for (let section = 0; section < SECTIONS; section++) {
            if (board[attackingSide][zone][section]) {
              charactersToMove.push({
                startZone: zone,
                section: section,
                character: board[attackingSide][zone][section]
              });
            }
          }
        }

        if (charactersToMove.length === 0) {
          if (onAdvanceComplete) onAdvanceComplete();
          return;
        }

        let movedCount = 0;
        const totalToMove = charactersToMove.length;
        const onCharMoveComplete = () => {
          movedCount++;
          if (movedCount === totalToMove) {
            // Wait 2 seconds before proceeding to the next action
            setTimeout(() => {
              if (onAdvanceComplete) onAdvanceComplete();
            }, 2000);
          }
        };

        // Move all characters forward one zone
        for (let charMove of charactersToMove) {
          let newZone = attackingSide === 0 ? charMove.startZone - 1 : charMove.startZone + 1;
          if (newZone >= 0 && newZone < ZONES) {
            animateCharacterMove(
              charMove.startZone,
              charMove.section,
              newZone,
              charMove.section,
              attackingSide,
              charMove.character,
              onCharMoveComplete
            );
            board[attackingSide][charMove.startZone][charMove.section] = null;
          }
        }
      }, {
        align: 'center',
        fontSize: 'bold 48px Arial',
        duration: 120, // frames to stay on screen (approx. 2 seconds)
        isStatic: true
      });
    } else {
      if (onAdvanceComplete) onAdvanceComplete();
    }
  }

  function calculateScores() {
    let playerScore = 0;
    let aiScore = 0;
    const KNOCKOUT_PENALTY = 3;

    // Player: starting zone 3. Score = 3 - current_zone
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        if (board[0][zone][section]) {
          playerScore += (3 - zone);
        }
      }
    }
    // AI: starting zone 2. Score = current_zone - 2
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        if (board[1][zone][section]) {
          aiScore += (zone - 2);
        }
      }
    }

    // Apply knockout penalties
    playerScore -= (playerKnockouts * KNOCKOUT_PENALTY);
    aiScore -= (aiKnockouts * KNOCKOUT_PENALTY);

    return { playerScore, aiScore };
  }

  function resolvePushBackAbilities(onComplete) {
    const charactersToResolve = [];
    for (let side = 0; side < SIDES; side++) {
        for (let zone = 0; zone < ZONES; zone++) {
            for (let section = 0; section < SECTIONS; section++) {
                const char = board[side][zone][section];
                if (char && char.justPushedBack) {
                    charactersToResolve.push({char, side, zone, section});
                }
            }
        }
    }

    if (charactersToResolve.length === 0) {
        if (onComplete) onComplete();
        return;
    }

    function processNextAbility() {
        if (charactersToResolve.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const item = charactersToResolve.shift(); // Get the first character
        const { char, side, zone, section } = item;
        
        delete char.justPushedBack;

        // Team 1 (Green) gets +2 defense when pushed back
        if (char.team === 1) {
            const pos = getCharacterPosition(side, zone, section, 40);
            const color = TEAM_COLORS[char.team];
            
            currentAnimation = {
                type: 'defense',
                center: pos,
                color: color,
                radius: 25,
                pulseTime: 0,
                pulseDuration: 0.6,
                onComplete: () => {
                    char.def += 2;
                    addFloatingText(pos.x + 40, pos.y - 10, `+2 Def`, '#44ff44', processNextAbility);
                }
            };
        } else if (char.team === 0) { // Team 0 (Red) gets +2 temporary attack
            const pos = getCharacterPosition(side, zone, section, 40);
            const color = TEAM_COLORS[char.team];

            currentAnimation = {
                type: 'defense', // Using defense ripple for a general "buff" animation
                center: pos,
                color: color,
                radius: 25,
                pulseTime: 0,
                pulseDuration: 0.6,
                onComplete: () => {
                    char.tempAttackBoost = 2;
                    addFloatingText(pos.x + 40, pos.y - 10, `+2 Atk`, '#ff4444', processNextAbility);
                }
            };
        } else if (char.team === 2) { // Team 2 (Blue) gets +1 def and +1 temp atk
            const pos = getCharacterPosition(side, zone, section, 40);
            const color = TEAM_COLORS[char.team];

            currentAnimation = {
                type: 'defense',
                center: pos,
                color: color,
                radius: 25,
                pulseTime: 0,
                pulseDuration: 0.6,
                onComplete: () => {
                    char.def += 1;
                    char.tempAttackBoost = 1;
                    // Show two floating texts, one after another
                    addFloatingText(pos.x + 40, pos.y - 10, `+1 Def`, '#44ff44', () => {
                        addFloatingText(pos.x + 40, pos.y + 20, `+1 Atk`, '#ff4444', processNextAbility);
                    });
                }
            };
        } else {
            // Other characters have no ability yet, so process the next one
            processNextAbility();
        }
    }

    processNextAbility(); // Start the sequential processing
  }

  function endGame(message) {
    if (gameOver) return;
    gameOver = true;
    endGameMessage.textContent = message;
    endGameScreen.style.visibility = 'visible';
  }

  function checkWinConditions() {
    if (gameOver) return true;

    // 1. Elimination
    let playerCharCount = 0;
    let aiCharCount = 0;
    for (let side = 0; side < SIDES; side++) {
      for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
          if (board[side][zone][section]) {
            if (side === 0) playerCharCount++;
            else aiCharCount++;
          }
        }
      }
    }

    if (playerCharCount === 0) {
      endGame("AI Wins by Knockout!");
      return true;
    }
    if (aiCharCount === 0) {
      endGame("Player Wins by Knockout!");
      return true;
    }

    // 2. Turn limit
    if (playerTurns >= MAX_TURNS && aiTurns >= MAX_TURNS) {
      const { playerScore, aiScore } = calculateScores();
      if (playerScore > aiScore) {
        endGame("Player Wins by Position!");
      } else if (aiScore > playerScore) {
        endGame("AI Wins by Position!");
      } else {
        endGame("Draw!");
      }
      return true;
    }
    return false;
  }

  function applyDamage(target, damage, onAllAnimationsComplete = null) {
    // Agility ability: triggers before damage is applied
    if (target.agility) {
      target.tempAttackBoost = (target.tempAttackBoost || 0) + damage;
      delete target.agility;
      // Get target position for floating text
      let targetPos = null;
      for (let side = 0; side < SIDES; side++) {
        for (let zone = 0; zone < ZONES; zone++) {
          for (let section = 0; section < SECTIONS; section++) {
            if (board[side][zone][section] === target) {
              targetPos = getCharacterPosition(side, zone, section, 40);
            }
          }
        }
      }
      if (targetPos) {
        addFloatingText(targetPos.x + 40, targetPos.y - 10, `Agility! +${damage} Atk`, '#ffcc00', onAllAnimationsComplete);
      } else if (onAllAnimationsComplete) {
        onAllAnimationsComplete();
      }
      return;
    }

    // Counter ability: triggers before damage is applied
    if (target.counter && target.counter > 0) {
      target.tempAttackBoost = (target.tempAttackBoost || 0) + damage;
      target.counter--;
      if (target.counter <= 0) delete target.counter;
      // Remove taunt here as well (first time attacked, even if countered)
      if (target.taunt) {
        if (typeof target.taunt !== 'number') target.taunt = 1;
        target.taunt--;
        if (target.taunt <= 0) delete target.taunt;
      }
      // Get target position for floating text
      let targetPos = null;
      for (let side = 0; side < SIDES; side++) {
        for (let zone = 0; zone < ZONES; zone++) {
          for (let section = 0; section < SECTIONS; section++) {
            if (board[side][zone][section] === target) {
              targetPos = getCharacterPosition(side, zone, section, 40);
            }
          }
        }
      }
      if (targetPos) {
        addFloatingText(targetPos.x + 40, targetPos.y - 10, `Counter! +${damage} Atk`, '#ff4444', onAllAnimationsComplete);
      } else if (onAllAnimationsComplete) {
        onAllAnimationsComplete();
      }
      return;
    }

    target.def = Math.max(0, target.def - damage);

    // Remove taunt only after taking damage (not countered)
    if (target.taunt) {
      if (typeof target.taunt !== 'number') target.taunt = 1;
      target.taunt--;
      if (target.taunt <= 0) delete target.taunt;
    }

    if (target.def === 0) {
      // Check for elimination immediately
      checkWinConditions();

      // Find the character's position and the attacking side
      let found = false;
      let attackingSide = null;
      
      for (let side = 0; side < SIDES; side++) {
        for (let zone = 0; zone < ZONES; zone++) {
          for (let section = 0; section < SECTIONS; section++) {
            if (board[side][zone][section] === target) {
              found = true;
              attackingSide = 1 - side; // If target is on side 0, attacker is 1, and vice versa
              
              // Determine new zone (row), keep same section
              let newZone = side === 0 ? zone + 1 : zone - 1;
              if (newZone >= 0 && newZone < ZONES) {
                // Create a new character object to avoid reference issues
                const newCharacter = { ...target, def: 5 };
                
                // Apply color bonuses immediately when pushed back
                if (newCharacter.team === 0) { // Red gets +2 attack
                  newCharacter.tempAttackBoost = 2;
                } else if (newCharacter.team === 1) { // Green gets +2 defense
                  newCharacter.def += 2;
                } else if (newCharacter.team === 2) { // Blue gets +1 attack and +1 defense
                  newCharacter.tempAttackBoost = 1;
                  newCharacter.def += 1;
                }
                
                // Do NOT decrement taunt here; it was already decremented above
                animateCharacterMove(zone, section, newZone, section, side, newCharacter, () => {
                  checkAndAdvanceTeam(attackingSide, onAllAnimationsComplete);
                });
                board[side][zone][section] = null;
              } else {
                if (side === 0) { // Player's character knocked out
                  playerKnockouts++;
                } else { // AI's character knocked out
                  aiKnockouts++;
                }
                board[side][zone][section] = null;
                // If character is pushed off board, show "Knock Out" then check for advance
                addFloatingText(canvas.width / 2, canvas.height / 2, "Knock Out", "#FF8C00", () => {
                  checkAndAdvanceTeam(attackingSide, onAllAnimationsComplete);
                }, {
                  align: 'center',
                  fontSize: 'bold 48px Arial',
                  duration: 120, // approx 2 seconds
                  isStatic: true
                });
              }
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (!found) {
          // Character was defeated but not found on board (shouldn't happen)
          if (onAllAnimationsComplete) onAllAnimationsComplete();
      }
    } else {
        // Not defeated, just damaged. All animations are done.
        if (onAllAnimationsComplete) onAllAnimationsComplete();
    }
  }

  function applyDefenseBoost(character, boost) {
    character.def += boost;
  }

  function endTurn() {
    if (gameOver) return;
    // Clear any leftover temp attack boosts for the player
    for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
            const char = board[isPlayerTurn ? 0 : 1][zone][section];
            if (char && char.tempAttackBoost) {
                delete char.tempAttackBoost;
            }
        }
    }
    console.log('Ending player turn');
    if (isPlayerTurn) playerTurns++;
    else aiTurns++;
    if (checkWinConditions()) {
      // Sync final state for online mode
      if (gameMode === 'online' && firebaseEnabled) {
        syncGameStateToFirebase();
      }
      return;
    }

    isPlayerTurn = !isPlayerTurn;
    selectedCharacter = null;
    selectedCard = null;
    selectedTargets = [];
    startButton.disabled = false;
    startButton.style.backgroundColor = '#4CAF50';
    
    // Sync to Firebase for online mode
    if (gameMode === 'online' && firebaseEnabled) {
      syncGameStateToFirebase();
    }
    
    // PvP: alternate turns, no AI
    if (gameMode === 'pvp') {
      setTimeout(startPlayerTurn, 200);
    } else if (gameMode === 'online') {
      // Online mode: wait for opponent's turn, don't start AI
      setTimeout(startPlayerTurn, 200);
    } else {
      // Start AI turn after a short delay, but only if not firstTurn
      if (!firstTurn) {
        setTimeout(startAITurn, 200);
      }
    }
  }

  function endAITurn() {
    if (gameOver) return;
    // Clear any leftover temp attack boosts for the AI
    for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
            const char = board[1][zone][section];
            if (char && char.tempAttackBoost) {
                delete char.tempAttackBoost;
            }
        }
    }
    console.log('Ending AI turn');
    aiTurns++;
    if (checkWinConditions()) return;

    // Start Player's turn
    if (!firstTurn) {
      startPlayerTurn();
    } else {
      startButton.disabled = false;
      startButton.style.backgroundColor = '#4CAF50';
    }
  }

  function startAITurn() {
    if (gameOver) return;
    if (gameMode === 'pvp') return; // PvP: skip AI logic

    // 1. Find all AI characters on the board
    let aiChars = [];
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        const char = board[1][zone][section];
        if (char) {
          aiChars.push({ char, pos: { side: 1, zone, section } });
        }
      }
    }
    if (aiChars.length === 0) {
      endAITurn();
      return;
    }

    // 2. Find all player characters on the board
    let playerChars = [];
    let leadmostZone = ZONES;
    let tauntChars = [];
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        const char = board[0][zone][section];
        if (char) {
          // Skip characters with agility (AI cannot target them)
          if (char.agility) continue;
          playerChars.push({ char, pos: { side: 0, zone, section } });
          if (zone < leadmostZone) leadmostZone = zone;
          if (char.taunt) tauntChars.push({ char, pos: { side: 0, zone, section } });
        }
      }
    }
    if (playerChars.length === 0) {
      endAITurn();
      return;
    }
    // If any taunt character exists, only target taunt characters
    if (tauntChars.length > 0) {
      playerChars = tauntChars;
    }

    // 3. Find all possible (aiChar, card, target(s)) attack and defense moves and score them
    let bestMove = null;
    let bestScore = -Infinity;
    let bestMoveData = null;

    // Find most forward AI zone with at least one character
    let aiMostForwardZone = -1;
    let aiMostForwardCount = 0;
    for (let zone = 0; zone < ZONES; zone++) {
      let count = 0;
      for (let section = 0; section < SECTIONS; section++) {
        if (board[1][zone][section]) count++;
      }
      if (count > 0) {
        aiMostForwardZone = zone;
        aiMostForwardCount = count;
        break;
      }
    }

    for (let ai of aiChars) {
      for (let i = 0; i < aiHand.length; i++) {
        const card = aiHand[i];
        // --- DEFENSE MOVES ---
        let isDefense = false;
        let boost = 0;
        if (card.type === 'Defense') {
          isDefense = true;
          boost = card.value || 1;
        } else if (card.type === CARD_TYPES.TAUNT) {
          isDefense = true;
          boost = card.value || 5;
        } else if (card.type === CARD_TYPES.FORTIFY) {
          isDefense = true;
          boost = 10;
        } else if (card.type === CARD_TYPES.COUNTER) {
          isDefense = true;
          boost = 0;
        } else if (card.type === CARD_TYPES.COUNTER_ASSAULT) {
          isDefense = true;
          boost = 0;
        }
        if (isDefense) {
          let score = 0;
          if (ai.pos.zone === aiMostForwardZone && aiMostForwardCount === 1) score += 1000;
          if (ai.char.def <= 3) score += 500;
          if (ai.pos.zone === aiMostForwardZone) score += 100;
          score += boost;
          if ((card.type === CARD_TYPES.COUNTER || card.type === CARD_TYPES.COUNTER_ASSAULT) && (ai.char.def <= 3 || (ai.pos.zone === aiMostForwardZone && aiMostForwardCount === 1))) {
            score += 400;
          }
          if (score > bestScore) {
            bestScore = score;
            bestMove = { ai, cardIndex: i, card, targets: [ai] };
            bestMoveData = { score, ai, card };
          }
        }
        // --- ATTACK MOVES ---
        let damage = 0;
        let isAttack = false;
        if (card.type === 'Attack') {
          damage = card.value || 1;
          isAttack = true;
        } else if (card.type === 'AttackDefense') {
          damage = card.attackValue;
          isAttack = true;
        } else if (card.type === CARD_TYPES.OVERBLAST) {
          damage = 50;
          isAttack = true;
        } else if (card.type === CARD_TYPES.AGILITY) {
          damage = 5;
          isAttack = true;
        } else if (card.type === CARD_TYPES.ENDEAVOR) {
          isAttack = true;
        }
        if (isAttack) {
          for (let p of playerChars) {
            let overkill = 0;
            let score = 0;
            let bonuses = 0;
            let willKnockout = false;
            let willPushback = false;
            if (card.type === CARD_TYPES.ENDEAVOR) {
              overkill = p.char.def - 1;
              willPushback = (p.char.def > 1);
              willKnockout = (p.char.def === 1);
            } else {
              overkill = damage - p.char.def;
              willPushback = (damage === p.char.def);
              willKnockout = (p.pos.zone === ZONES - 1 && damage >= p.char.def);
            }
            if (p.pos.zone === leadmostZone) bonuses += 1000;
            if (willPushback) bonuses += 500;
            if (willKnockout) bonuses += 200;
            score = -Math.abs(overkill) + bonuses;
            if (score > bestScore) {
              bestScore = score;
              bestMove = { ai, cardIndex: i, card, targets: [p] };
              bestMoveData = { overkill, damage, target: p, bonuses };
            }
          }
        }
        // --- Multi-target attacks ---
        if (card.type === CARD_TYPES.DOUBLE_BLAST || card.type === CARD_TYPES.TRIPLE_BLAST || card.type === CARD_TYPES.EQUALIZE) {
          let numTargets = card.type === CARD_TYPES.TRIPLE_BLAST ? 3 : 2;
          let combos = [];
          // Only use non-agile targets for combos
          function k_combinations(set, k) {
            if (k === 0) return [[]];
            if (set.length === 0) return [];
            let [first, ...rest] = set;
            let withFirst = k_combinations(rest, k - 1).map(c => [first, ...c]);
            let withoutFirst = k_combinations(rest, k);
            return withFirst.concat(withoutFirst);
          }
          // Filter out any targets with agility (should already be filtered, but double check)
          const nonAgileTargets = playerChars.filter(p => !p.char.agility);
          combos = k_combinations(nonAgileTargets, Math.min(numTargets, nonAgileTargets.length));
          for (let combo of combos) {
            let totalScore = 0;
            for (let p of combo) {
              let dmg = card.value || 1;
              let overkill = dmg - p.char.def;
              let bonuses = 0;
              let willPushback = (dmg === p.char.def);
              let willKnockout = (p.pos.zone === ZONES - 1 && dmg >= p.char.def);
              if (p.pos.zone === leadmostZone) bonuses += 1000;
              if (willPushback) bonuses += 500;
              if (willKnockout) bonuses += 200;
              totalScore += -Math.abs(overkill) + bonuses;
            }
            if (totalScore > bestScore) {
              bestScore = totalScore;
              bestMove = { ai, cardIndex: i, card, targets: combo };
              bestMoveData = { totalScore, targets: combo };
            }
          }
        }
      }
    }

    // 4. If no move found, fallback to old logic (first aiChar, first card, first target)
    if (!bestMove) {
      let aiChar = aiChars[0];
      let cardIndex = 0;
      let card = aiHand[cardIndex];
      let target = playerChars[0];
      aiHand.splice(cardIndex, 1);
      endAITurn();
      return;
    }

    // 5. Execute the best move
    aiHand.splice(bestMove.cardIndex, 1);
    const ai = bestMove.ai;
    const card = bestMove.card;
    const targets = bestMove.targets;
    const attacker = ai.char;
    const attackerPos = getCharacterPosition(ai.pos.side, ai.pos.zone, ai.pos.section, 40);
    const color = TEAM_COLORS[attacker.team];
    let attackStyle = 'blast';
    if (attacker.team === 0) attackStyle = 'fire';
    else if (attacker.team === 1) attackStyle = 'rocks';
    else if (attacker.team === 2) attackStyle = 'water';

    // DEFENSE MOVES
    if (card.type === 'Defense' || card.type === CARD_TYPES.TAUNT || card.type === CARD_TYPES.FORTIFY || card.type === CARD_TYPES.COUNTER || card.type === CARD_TYPES.COUNTER_ASSAULT) {
      const target = targets[0].char;
      const center = getCharacterPosition(ai.pos.side, ai.pos.zone, ai.pos.section, 40);
      let boost = card.value || 1;
      if (card.type === CARD_TYPES.FORTIFY) boost = 10;
      if (card.type === CARD_TYPES.TAUNT) boost = card.value || 5;
      currentAnimation = {
        type: 'defense',
        center,
        color,
        radius: 25,
        pulseTime: 0,
        pulseDuration: 0.6,
        onComplete: () => {
          if (card.type === CARD_TYPES.FORTIFY) {
            applyDefenseBoost(target, 10);
            // Remove all taunt from friendly characters except the selected one
            for (let z = 0; z < ZONES; z++) {
              for (let s = 0; s < SECTIONS; s++) {
                if (!(z === ai.pos.zone && s === ai.pos.section) && board[1][z][s] && board[1][z][s].taunt) {
                  delete board[1][z][s].taunt;
                }
              }
            }
            // Stack taunt: add 2
            if (target.taunt && typeof target.taunt === 'number') {
              target.taunt += 2;
            } else {
              target.taunt = 2;
            }
            boost = 10;
          } else if (card.type === CARD_TYPES.COUNTER) {
            if (target.counter && target.counter > 0) {
              target.counter += 1;
            } else {
              target.counter = 1;
            }
            addFloatingText(center.x + 40, center.y - 10, `Counter`, '#ff4444', endAITurn);
            return;
          } else if (card.type === CARD_TYPES.COUNTER_ASSAULT) {
            target.def = 1;
            target.counter = 2;
            // Remove all taunt from friendly characters except the selected one
            for (let z = 0; z < ZONES; z++) {
              for (let s = 0; s < SECTIONS; s++) {
                if (!(z === ai.pos.zone && s === ai.pos.section) && board[1][z][s] && board[1][z][s].taunt) {
                  delete board[1][z][s].taunt;
                }
              }
            }
            // Stack taunt: add 1
            if (target.taunt && typeof target.taunt === 'number') {
              target.taunt += 1;
            } else {
              target.taunt = 1;
            }
            addFloatingText(center.x + 40, center.y - 10, `Counter x2`, '#3399ff', () => {
              addFloatingText(center.x + 40, center.y + 10, `Taunt!`, '#FFD700', endAITurn);
            });
            return;
          } else {
            applyDefenseBoost(target, boost);
          }
          if (card.type === CARD_TYPES.TAUNT) {
            // Remove all taunt (and stacks) from all friendly characters except the selected one
            for (let z = 0; z < ZONES; z++) {
              for (let s = 0; s < SECTIONS; s++) {
                if (!(z === ai.pos.zone && s === ai.pos.section) && board[1][z][s] && board[1][z][s].taunt) {
                  delete board[1][z][s].taunt;
                }
              }
            }
            // Stack taunt on the selected character
            if (target.taunt && typeof target.taunt === 'number') {
              target.taunt += 1;
            } else {
              target.taunt = 1;
            }
          }
          addFloatingText(center.x + 40, center.y - 10, `+${boost}`, '#44ff44', endAITurn);
        }
      };
      return;
    }

    // 4. If no attack move found, fallback to old logic (first aiChar, first card, first target)
    if (!bestMove) {
      // fallback to original logic
      let aiChar = aiChars[0];
      let cardIndex = 0;
      let card = aiHand[cardIndex];
      let target = playerChars[0];
      aiHand.splice(cardIndex, 1);
      endAITurn();
      return;
    }

    // Single-target attacks
    if (targets.length === 1) {
      const target = targets[0].char;
      const targetPos = getCharacterPosition(targets[0].pos.side, targets[0].pos.zone, targets[0].pos.section, 40);
      if (card.type === 'Attack' || card.type === 'AttackDefense' || card.type === CARD_TYPES.OVERBLAST || card.type === CARD_TYPES.AGILITY) {
        let damage = 1;
        if (card.type === 'Attack') damage = card.value || 1;
        else if (card.type === 'AttackDefense') damage = card.attackValue;
        else if (card.type === CARD_TYPES.OVERBLAST) damage = 50;
        else if (card.type === CARD_TYPES.AGILITY) damage = 5;
        // Apply tempAttackBoost if present (like player logic)
        if (attacker && attacker.tempAttackBoost) {
          damage += attacker.tempAttackBoost;
          delete attacker.tempAttackBoost;
        }
        currentAnimation = {
          type: 'attack',
          attackStyle,
          start: attackerPos,
          end: targetPos,
          color,
          progress: 0,
          onComplete: () => {
            addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
            applyDamage(target, damage, () => {
              // If AttackDefense, apply defense boost to AI's character after attack (like player logic)
              if (card.type === 'AttackDefense') {
                const defValue = card.defenseValue;
                const center = attackerPos;
                const aiChar = attacker;
                pendingAnimation = {
                  type: 'defense',
                  center,
                  color,
                  radius: 25,
                  pulseTime: 0,
                  pulseDuration: 0.6,
                  onComplete: () => {
                    applyDefenseBoost(aiChar, defValue);
                    addFloatingText(center.x + 40, center.y - 10, `+${defValue}`, '#44ff44', () => {
                      selectedCard = null;
                      selectedCharacter = null;
                      selectedTargets = [];
                      endAITurn();
                    });
                  }
                };
              } else {
                selectedCard = null;
                selectedCharacter = null;
                selectedTargets = [];
                endAITurn();
              }
            });
          }
        };
        return;
      } else if (card.type === CARD_TYPES.ENDEAVOR) {
        currentAnimation = {
          type: 'attack',
          attackStyle,
          start: attackerPos,
          end: targetPos,
          color,
          progress: 0,
          onComplete: () => {
            // Remove a stack of taunt if present (match applyDamage logic)
            if (target.taunt) {
              if (typeof target.taunt !== 'number') target.taunt = 1;
              target.taunt--;
              if (target.taunt <= 0) delete target.taunt;
            }
            target.def = 1;
            attacker.def = 1;
            addFloatingText(targetPos.x + 40, targetPos.y - 10, 'DEF 1', '#ff4444');
            addFloatingText(attackerPos.x + 40, attackerPos.y - 10, 'DEF 1', '#ff4444', () => {
              selectedCard = null;
              selectedCharacter = null;
              selectedTargets = [];
              endAITurn();
            });
          }
        };
        return;
      }
    }
    // Multi-target attacks (Double Blast, Triple Blast, Equalize)
    if (card.type === CARD_TYPES.DOUBLE_BLAST || card.type === CARD_TYPES.TRIPLE_BLAST || card.type === CARD_TYPES.EQUALIZE) {
      let attacks = targets.map((t, index) => {
        const target = t.char;
        const targetPos = getCharacterPosition(t.pos.side, t.pos.zone, t.pos.section, 40);
        let damage = card.value || 1;
        // For the first attack, apply tempAttackBoost if present (like player logic)
        if (index === 0 && attacker && attacker.tempAttackBoost) {
          damage += attacker.tempAttackBoost;
          delete attacker.tempAttackBoost;
        }
        return {
          type: 'attack',
          attackStyle,
          start: attackerPos,
          end: targetPos,
          color,
          progress: 0,
          onComplete: () => {
            addFloatingText(targetPos.x + 40, targetPos.y - 10, `-${damage}`, '#ff4444');
            applyDamage(target, damage, () => {});
          }
        };
      });
      currentAnimation = {
        type: 'multi_attack',
        attacks,
      };
      // End turn after all attacks
      let checkEnd = setInterval(() => {
        if (!currentAnimation) {
          clearInterval(checkEnd);
          selectedCard = null;
          selectedCharacter = null;
          selectedTargets = [];
          endAITurn();
        }
      }, 100);
      return;
    }
    // Fallback
    endAITurn();
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sectionWidth = canvas.width / SECTIONS;
    const headerHeight = 40; // Reduced header height since we removed the title
    const playAreaHeight = canvas.height - 100 - headerHeight;
    const zoneHeight = playAreaHeight / ZONES;

    // DEBUG: Remove any 'team' property from all playerHand cards
    for (let i = 0; i < playerHand.length; i++) {
      if ('team' in playerHand[i]) {
        delete playerHand[i].team;
      }
    }

    // Draw turn indicator
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    if (!firstTurn) {  // Only show turn indicator after game has started
      let turnText, color, shadow;
      if (gameMode === 'pvp') {
        turnText = isPlayerTurn ? "Player 1's Turn" : "Player 2's Turn";
        color = isPlayerTurn ? '#44ff44' : '#58a6ff';
        shadow = color;
      } else {
        turnText = isPlayerTurn ? "Player's Turn" : "AI's Turn";
        color = isPlayerTurn ? '#44ff44' : '#ff4444';
        shadow = color;
      }
      ctx.fillStyle = color;
      ctx.fillText(turnText, canvas.width / 2, 35);
      ctx.shadowColor = shadow;
      ctx.shadowBlur = 10;
      ctx.fillText(turnText, canvas.width / 2, 35);
    }
    ctx.restore();

    // Draw Turn Counter
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    const turnCounterText = `Turn: ${playerTurns} / ${MAX_TURNS}`;
    ctx.fillText(turnCounterText, canvas.width - 20, 35);
    ctx.restore();

    // Draw horizontal lines for zones, starting below header
    for (let i = 1; i < ZONES; i++) {
      const y = headerHeight + (zoneHeight * i);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
        ctx.strokeStyle = '#fff';
      ctx.lineWidth = (i === 3) ? 4 : 1; // Thicker middle line
      ctx.stroke();
    }

    // Draw a line to separate the header from play area
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(canvas.width, headerHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw a line to separate the hand zone at the bottom
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 100);
    ctx.lineTo(canvas.width, canvas.height - 100);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shade the bottom zone (hand area) light grey
    ctx.save();
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    ctx.restore();

    // Draw cards in slots (play area only)
    for (let side = 0; side < SIDES; side++) {
      for (let zone = 0; zone < ZONES; zone++) {
        for (let section = 0; section < SECTIONS; section++) {
          const card = board[side][zone][section];
          if (card) {
            const isSelectedOnBoard = selectedCharacter &&
              selectedCharacter.side === side && 
              selectedCharacter.zone === zone &&
              selectedCharacter.section === section;
            
            const isMultiSelected = selectedTargets.some(t => t.side === side && t.zone === zone && t.section === section);

            // Adjust y position to account for header
            const pos = getCharacterPosition(side, zone, section, headerHeight);
            drawCard(pos.x, pos.y, card, isSelectedOnBoard || isMultiSelected);
          }
        }
      }
    }
    // Draw moving characters on top
    drawMovingCharacters();
    // Draw player hand in the new bottom zone
    const handX = 40;
    const handY = canvas.height - 70;
    // Only show the player's hand in PvAI mode; in PvP, show the correct hand
    if (gameMode === 'pvp') {
      drawHand(isPlayerTurn ? playerHand : player2Hand, handX, handY);
    } else {
      drawHand(playerHand, handX, handY);
    }
  }

  function drawCard(x, y, card, isSelected = false, isHandSelected = false, customCtx = null) {
    const useCtx = customCtx || ctx;
    if (!card) return; // Guard clause to prevent errors
    // console.log('Drawing card at', x, y, card);
    // Check if this is a board player or a hand card
    if (card.hasOwnProperty('team') && typeof card.team === 'number') {
      // Draw board player
      const colors = ['#ff4444', '#44ff44', '#4444ff']; // Red, Green, Blue
      const colorIndex = card.team;
      useCtx.save();
      // Draw circle centered at (x, y)
      useCtx.beginPath();
      useCtx.arc(x, y, 25, 0, Math.PI * 2);
      useCtx.fillStyle = colors[colorIndex];
      useCtx.fill();
      // Only highlight if selected
      if (isSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.stroke();
      useCtx.restore();
      
      // Draw player stats (only DEF), centered
      useCtx.fillStyle = '#000';
      useCtx.font = '10px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('DEF', x, y - 8);
      useCtx.font = 'bold 20px Arial';
      useCtx.fillText(card.def, x, y + 10);

      // Draw temp attack boost if it exists
      if (card.tempAttackBoost) {
        useCtx.fillStyle = '#ff4444';
        useCtx.font = 'bold 18px Arial';
        useCtx.textAlign = 'left';
        useCtx.fillText(`+${card.tempAttackBoost}`, x - 50, y + 8);
      }

      // Draw taunt icons for taunt stacks
      let buffIconOffset = 0;
      if (card.taunt) {
        const tauntStacks = typeof card.taunt === 'number' ? card.taunt : 1;
        for (let i = 0; i < tauntStacks; i++) {
          drawTargetIcon(useCtx, x + 35 + buffIconOffset, y, 8);
          buffIconOffset += 18;
        }
      }

      // Draw agility icon if agility buff is active (smaller, like other buff icons)
      if (card.agility) {
        useCtx.save();
        useCtx.strokeStyle = '#ffcc00';
        useCtx.lineWidth = 2;
        useCtx.shadowColor = '#ffcc00';
        useCtx.shadowBlur = 4;
        // Draw a small lightning bolt to the right of the character, after taunt icons
        const iconX = x + 35 + buffIconOffset;
        const iconY = y;
        useCtx.beginPath();
        useCtx.moveTo(iconX - 4, iconY - 6);
        useCtx.lineTo(iconX + 2, iconY + 2);
        useCtx.lineTo(iconX - 2, iconY + 2);
        useCtx.lineTo(iconX + 4, iconY + 10);
        useCtx.stroke();
        useCtx.restore();
        buffIconOffset += 18;
      }

      // Draw counter icons for each stack
      if (card.counter && card.counter > 0) {
        for (let i = 0; i < card.counter; i++) {
          const iconX = x + 35 + buffIconOffset;
          const iconY = y;
          useCtx.save();
          useCtx.translate(iconX, iconY);
          useCtx.rotate(-Math.PI / 4);
          useCtx.beginPath();
          useCtx.arc(0, 0, 8, 0, Math.PI * 1.5, false);
          useCtx.strokeStyle = '#3399ff';
          useCtx.lineWidth = 2;
          useCtx.stroke();
          useCtx.beginPath();
          useCtx.moveTo(5, -5);
          useCtx.lineTo(9, -5);
          useCtx.lineTo(5, -1);
          useCtx.stroke();
          useCtx.beginPath();
          useCtx.arc(0, 0, 8, Math.PI, Math.PI * 2.5, false);
          useCtx.stroke();
          useCtx.beginPath();
          useCtx.moveTo(-5, 5);
          useCtx.lineTo(-9, 5);
          useCtx.lineTo(-5, 1);
          useCtx.stroke();
          useCtx.restore();
          buffIconOffset += 18;
        }
      }
    } else if (card.type === 'AttackDefense') {
      // Draw hand card as a box split diagonally red/blue
      useCtx.save();
      // Draw blue triangle (top-left to bottom-right)
      useCtx.beginPath();
      useCtx.moveTo(x, y);
      useCtx.lineTo(x + 50, y);
      useCtx.lineTo(x + 50, y + 70);
      useCtx.closePath();
      useCtx.fillStyle = '#4444ff';
      useCtx.fill();
      // Draw red triangle (bottom-left to top-right)
      useCtx.beginPath();
      useCtx.moveTo(x, y);
      useCtx.lineTo(x, y + 70);
      useCtx.lineTo(x + 50, y + 70);
      useCtx.closePath();
      useCtx.fillStyle = '#ff4444';
      useCtx.fill();

      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
    } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);

      // Draw only the numbers, styled like Taunt
      useCtx.fillStyle = '#fff'; // White text
      useCtx.font = 'bold 28px Arial'; // Match Taunt
      useCtx.textAlign = 'center';
      useCtx.fillText(`${card.attackValue}/${card.defenseValue}`, x + 25, y + 40);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.DOUBLE_BLAST) {
      useCtx.save();
      // Red box
      useCtx.fillStyle = '#ff4444'; // Red for attack
      useCtx.fillRect(x, y, 50, 70);
      // Black line
      useCtx.fillStyle = '#000';
      useCtx.fillRect(x + 24, y, 2, 70);
      
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);

      // Draw '3's, styled like split cards
      useCtx.fillStyle = '#fff';
      useCtx.font = 'bold 28px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('3', x + 12, y + 40);
      useCtx.fillText('3', x + 38, y + 40);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.TRIPLE_BLAST) {
      useCtx.save();
      // Red box
      useCtx.fillStyle = '#ff4444'; // Red for attack
      useCtx.fillRect(x, y, 50, 70);
      // Two Black lines
      useCtx.fillStyle = '#000';
      useCtx.fillRect(x + 16, y, 2, 70);
      useCtx.fillRect(x + 32, y, 2, 70);
      
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);

      // Draw '2's, styled like split cards
      useCtx.fillStyle = '#fff';
      useCtx.font = 'bold 28px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('2', x + 8, y + 40);
      useCtx.fillText('2', x + 25, y + 40);
      useCtx.fillText('2', x + 42, y + 40);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.TAUNT) {
      useCtx.save();
      // Black box (match Fortify)
      useCtx.fillStyle = '#111';
      useCtx.fillRect(x, y, 50, 70);
      
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);

      // Draw card info
      useCtx.fillStyle = '#00FF00'; // Green text (match Fortify)
      useCtx.font = 'bold 28px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('+5', x + 25, y + 40); // Match Fortify/Counter Assault vertical position
      
      drawTargetIcon(useCtx, x + 25, y + 60, 8);

      useCtx.restore();
    } else if (card.type === CARD_TYPES.OVERBLAST) {
      useCtx.save();
      // Draw black triangle (bottom left to top right)
      useCtx.beginPath();
      useCtx.moveTo(x, y + 70); // bottom left
      useCtx.lineTo(x + 50, y); // top right
      useCtx.lineTo(x + 50, y + 70); // bottom right
      useCtx.closePath();
      useCtx.fillStyle = '#000000'; // Black
      useCtx.fill();
      // Draw white triangle (top left to bottom right)
      useCtx.beginPath();
      useCtx.moveTo(x, y); // top left
      useCtx.lineTo(x, y + 70); // bottom left
      useCtx.lineTo(x + 50, y); // top right
      useCtx.closePath();
      useCtx.fillStyle = '#ffffff'; // White
      useCtx.fill();

      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#888'; // Grey border to be visible on white
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);

      // Draw card info: 50 on top, -? on bottom (match Endeavor)
      useCtx.fillStyle = '#ff4444'; // Red text
      useCtx.font = 'bold 20px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('50', x + 25, y + 20);
      useCtx.fillText('-?', x + 25, y + 62);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.FORTIFY) {
      useCtx.save();
      useCtx.fillStyle = '#111'; // Black
      useCtx.fillRect(x, y, 50, 70);
      useCtx.fillStyle = '#00FF00';
      useCtx.font = 'bold 28px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('+10', x + 25, y + 40);
      // Draw two centered taunt icons at the bottom (y+60)
      drawTargetIcon(useCtx, x + 16, y + 60, 8);
      drawTargetIcon(useCtx, x + 34, y + 60, 8);
      useCtx.strokeStyle = '#00FF00';
      useCtx.lineWidth = 2;
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.COUNTER) {
      useCtx.save();
      // Draw card rectangle background (red)
      useCtx.fillStyle = '#ff4444';
      useCtx.fillRect(x, y, 50, 70);
      // Draw smaller yin-yang symbol centered in the card
      const centerX = x + 25;
      const centerY = y + 35;
      const radius = 25; // Large enough to touch card edges
      // Top half (white)
      useCtx.beginPath();
      useCtx.arc(centerX, centerY, radius, 0, Math.PI, false);
      useCtx.fillStyle = '#fff';
      useCtx.fill();
      // Bottom half (black)
      useCtx.beginPath();
      useCtx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
      useCtx.fillStyle = '#111';
      useCtx.fill();
      // Small black circle (top)
      useCtx.beginPath();
      useCtx.arc(centerX, centerY - radius / 2, radius / 4, 0, 2 * Math.PI);
      useCtx.fillStyle = '#111';
      useCtx.fill();
      // Small white circle (bottom)
      useCtx.beginPath();
      useCtx.arc(centerX, centerY + radius / 2, radius / 4, 0, 2 * Math.PI);
      useCtx.fillStyle = '#fff';
      useCtx.fill();
      // Blue '+?' text
      useCtx.fillStyle = '#3399ff';
      useCtx.font = 'bold 32px Arial'; // Match Counter Assault
      useCtx.textAlign = 'center';
      useCtx.fillText('+?', centerX, y + 40);
      // Counter icon: two arrows circling each other (simple version)
      useCtx.save();
      useCtx.translate(centerX, y + 60);
      useCtx.rotate(-Math.PI / 4);
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, 0, Math.PI * 1.5, false); // Match Counter Assault
      useCtx.strokeStyle = '#3399ff';
      useCtx.lineWidth = 2;
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(5, -5);
      useCtx.lineTo(9, -5);
      useCtx.lineTo(5, -1);
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, Math.PI, Math.PI * 2.5, false); // Match Counter Assault
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(-5, 5);
      useCtx.lineTo(-9, 5);
      useCtx.lineTo(-5, 1);
      useCtx.stroke();
      useCtx.restore();
      useCtx.restore();
    } else if (card.type === CARD_TYPES.AGILITY) {
      useCtx.save();
      // Black card background (was white)
      useCtx.fillStyle = '#000';
      useCtx.fillRect(x, y, 50, 70);

      // Large, very thick black lightning bolt (centered, top to bottom)
      useCtx.save();
      useCtx.strokeStyle = '#000';
      useCtx.lineWidth = 10;
      useCtx.shadowColor = 'rgba(0,0,0,0.2)';
      useCtx.shadowBlur = 6;
      useCtx.beginPath();
      useCtx.moveTo(x + 25, y + 2);   // Top center
      useCtx.lineTo(x + 35, y + 28);  // Down right
      useCtx.lineTo(x + 28, y + 28);  // In left
      useCtx.lineTo(x + 38, y + 50);  // Down right
      useCtx.lineTo(x + 22, y + 38);  // Up left
      useCtx.lineTo(x + 30, y + 38);  // Down right
      useCtx.lineTo(x + 20, y + 68);  // Bottom
      useCtx.stroke();
      useCtx.restore();

      // Red '5' text
      useCtx.fillStyle = '#ff4444';
      useCtx.font = 'bold 28px Arial'; // Match Fortify and Taunt
      useCtx.textAlign = 'center';
      useCtx.fillText('5', x + 25, y + 40);

      // Draw small agility icon at the bottom center (like other card icons)
      useCtx.save();
      useCtx.strokeStyle = '#ffcc00';
      useCtx.lineWidth = 2.5;
      useCtx.shadowColor = '#ffcc00';
      useCtx.shadowBlur = 4;
      const iconX = x + 25;
      const iconY = y + 60;
      useCtx.beginPath();
      useCtx.moveTo(iconX - 7, iconY - 6);
      useCtx.lineTo(iconX + 2, iconY + 2);
      useCtx.lineTo(iconX - 2, iconY + 2);
      useCtx.lineTo(iconX + 6, iconY + 12);
      useCtx.stroke();
      useCtx.restore();

      // Highlight logic (same as other hand cards)
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.SACRIFICE) {
      useCtx.save();
      // White chevron on black background (reverse V pattern)
      useCtx.fillStyle = '#000';
      useCtx.fillRect(x, y, 50, 70);
      useCtx.fillStyle = '#fff';
      useCtx.beginPath();
      useCtx.moveTo(x, y + 70);
      useCtx.lineTo(x + 25, y + 20);
      useCtx.lineTo(x + 50, y + 70);
      useCtx.closePath();
      useCtx.fill();
      // Green text
      useCtx.fillStyle = '#44ff44';
      useCtx.font = 'bold 20px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('-?/5-5', x + 25, y + 40);
      // Draw taunt icon
      drawTargetIcon(useCtx, x + 25, y + 60, 8);
      // Highlight logic
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700';
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.COUNTER_ASSAULT) {
      useCtx.save();
      // Left half black, right half white
      useCtx.beginPath();
      useCtx.moveTo(x, y);
      useCtx.lineTo(x + 25, y);
      useCtx.lineTo(x + 25, y + 70);
      useCtx.lineTo(x, y + 70);
      useCtx.closePath();
      useCtx.fillStyle = '#111';
      useCtx.fill();
      useCtx.beginPath();
      useCtx.moveTo(x + 25, y);
      useCtx.lineTo(x + 50, y);
      useCtx.lineTo(x + 50, y + 70);
      useCtx.lineTo(x + 25, y + 70);
      useCtx.closePath();
      useCtx.fillStyle = '#fff';
      useCtx.fill();
      // Blue -? text
      useCtx.fillStyle = '#3399ff';
      useCtx.font = 'bold 32px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('-?', x + 25, y + 40);
      // Two counter icons (bottom left and bottom right)
      // Left icon
      useCtx.save();
      useCtx.translate(x + 10, y + 60);
      useCtx.rotate(-Math.PI / 4);
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, 0, Math.PI * 1.5, false);
      useCtx.strokeStyle = '#3399ff';
      useCtx.lineWidth = 2;
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(5, -5);
      useCtx.lineTo(9, -5);
      useCtx.lineTo(5, -1);
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, Math.PI, Math.PI * 2.5, false);
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(-5, 5);
      useCtx.lineTo(-9, 5);
      useCtx.lineTo(-5, 1);
      useCtx.stroke();
      useCtx.restore();
      // Right icon
      useCtx.save();
      useCtx.translate(x + 40, y + 60);
      useCtx.rotate(-Math.PI / 4);
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, 0, Math.PI * 1.5, false);
      useCtx.strokeStyle = '#3399ff';
      useCtx.lineWidth = 2;
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(5, -5);
      useCtx.lineTo(9, -5);
      useCtx.lineTo(5, -1);
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.arc(0, 0, 8, Math.PI, Math.PI * 2.5, false);
      useCtx.stroke();
      useCtx.beginPath();
      useCtx.moveTo(-5, 5);
      useCtx.lineTo(-9, 5);
      useCtx.lineTo(-5, 1);
      useCtx.stroke();
      useCtx.restore();
      // Taunt icon (center bottom)
      drawTargetIcon(useCtx, x + 25, y + 60, 8);
      // Highlight logic
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700';
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.ENDEAVOR) {
      useCtx.save();
      // White card background
      useCtx.fillStyle = '#fff';
      useCtx.fillRect(x, y, 50, 70);
      // Draw two black rectangles (equal sign)
      useCtx.fillStyle = '#111';
      useCtx.fillRect(x + 10, y + 28, 30, 6);
      useCtx.fillRect(x + 10, y + 38, 30, 6);
      // Red -? at top and bottom
      useCtx.fillStyle = '#ff4444';
      useCtx.font = 'bold 20px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('-?', x + 25, y + 20);
      useCtx.fillText('-?', x + 25, y + 62);
      // Highlight logic
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700';
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else if (card.type === CARD_TYPES.EQUALIZE) {
      useCtx.save();
      // Black card background
      useCtx.fillStyle = '#111';
      useCtx.fillRect(x, y, 50, 70);
      // Draw two white rectangles (equal sign)
      useCtx.fillStyle = '#fff';
      useCtx.fillRect(x + 10, y + 28, 30, 6);
      useCtx.fillRect(x + 10, y + 38, 30, 6);
      // Red -? | -? at top and bottom
      useCtx.fillStyle = '#ff4444';
      useCtx.font = 'bold 18px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText('-? | -?', x + 25, y + 20);
      useCtx.fillText('-? | -?', x + 25, y + 62);
      // Highlight logic
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700';
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      useCtx.restore();
    } else {
      // Draw hand card as a box
      const colors = {
        [CARD_TYPES.ATTACK]: '#ff4444',  // Red for attack
        [CARD_TYPES.DEFENSE]: '#4444ff'  // Blue for defense
      };
      
      useCtx.save();
      // Draw card box
      useCtx.fillStyle = colors[card.type];
      useCtx.fillRect(x, y, 50, 70);
      
      if (isHandSelected) {
        useCtx.strokeStyle = '#FFD700'; // Gold for selected
        useCtx.lineWidth = 3;
        useCtx.shadowColor = '#FFD700';
        useCtx.shadowBlur = 10;
      } else {
        useCtx.strokeStyle = '#fff';
        useCtx.lineWidth = 1;
      }
      useCtx.strokeRect(x, y, 50, 70);
      
      // Draw card info
      useCtx.fillStyle = '#fff';
      useCtx.font = '12px Arial';
      useCtx.textAlign = 'center';
      useCtx.fillText(card.type, x + 25, y + 25);
      useCtx.fillText(card.value, x + 25, y + 45);
      useCtx.restore();
    }
  }

  function drawHand(hand, x, y) {
    const cardWidth = 50;
    const cardSpacing = 60;
    const visibleWidth = canvas.width - 80; // 40px margin on each side
    const maxVisible = Math.floor(visibleWidth / cardSpacing);

    // Clamp scroll offset
    if (handScrollOffset < 0) handScrollOffset = 0;
    if (handScrollOffset > hand.length - maxVisible) handScrollOffset = Math.max(0, hand.length - maxVisible);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#000000';
    let handLabel = 'Your Hand:';
    if (typeof gameMode !== 'undefined' && gameMode === 'pvp') {
      handLabel = isPlayerTurn ? 'Player 1 hand:' : 'Player 2 hand:';
    } else if (typeof gameMode !== 'undefined' && gameMode === 'pvai') {
      handLabel = 'Player 1 hand:';
    }
    ctx.fillText(handLabel, x + 30, y - 10);

    for (let i = 0; i < hand.length; i++) {
      const drawIndex = i - handScrollOffset;
      if (drawIndex >= 0 && drawIndex < maxVisible) {
        if (hand[i]) drawCard(x + drawIndex * cardSpacing, y, hand[i], false, i === selectedHandCardIndex);
      }
    }

    // Draw scroll indicators as large clickable arrows if needed
    handLeftArrowBox = null;
    handRightArrowBox = null;
    if (handScrollOffset > 0) {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(x - 35, y + 35);
      ctx.lineTo(x - 5, y + 15);
      ctx.lineTo(x - 5, y + 55);
      ctx.closePath();
      ctx.fill();
      handLeftArrowBox = { x: x - 40, y: y + 15, w: 35, h: 40 };
    }
    if (handScrollOffset < hand.length - maxVisible) {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(x + maxVisible * cardSpacing + 35, y + 35);
      ctx.lineTo(x + maxVisible * cardSpacing + 5, y + 15);
      ctx.lineTo(x + maxVisible * cardSpacing + 5, y + 55);
      ctx.closePath();
      ctx.fill();
      handRightArrowBox = { x: x + maxVisible * cardSpacing + 5, y: y + 15, w: 35, h: 40 };
    }
  }

  function addFloatingText(x, y, value, color, onComplete, options = {}) {
    floatingTexts.push({
      x,
      y,
      value,
      color,
      opacity: 1,
      timer: 0,
      onComplete,
      align: options.align || 'left',
      fontSize: options.fontSize || 'bold 28px Arial',
      duration: options.duration || 0,
      isStatic: options.isStatic || false
    });
  }

  function drawFloatingTexts() {
    floatingTexts.forEach(text => {
      ctx.save();
      ctx.globalAlpha = text.opacity;
      ctx.font = text.fontSize;
      ctx.fillStyle = text.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.textAlign = text.align;
      ctx.strokeText(text.value, text.x, text.y);
      ctx.fillText(text.value, text.x, text.y);
      ctx.restore();
    });
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const text = floatingTexts[i];
      text.timer++;

      if (text.isStatic) {
        // New logic for static text: wait for duration, then fade
        if (text.timer > text.duration) {
          text.opacity -= 0.05;
        }
      } else {
        // Original logic for moving text
        text.y -= 0.5; // Slower rise
        text.opacity -= 0.01; // Slower fade
      }

      if (text.opacity <= 0) {
        if (text.onComplete) text.onComplete();
        floatingTexts.splice(i, 1);
      }
    }
  }

  function animateCharacterMove(startZone, startSection, endZone, endSection, side, card, onComplete = null) {
    movingCharacters.push({
      startZone,
      startSection,
      endZone,
      endSection,
      side,
      card,
      progress: 0,
      onComplete
    });
  }

  function updateMovingCharacters() {
    for (let i = movingCharacters.length - 1; i >= 0; i--) {
      const mc = movingCharacters[i];
      mc.progress += 0.04; // Slower character movement
      if (mc.progress >= 1) {
        // Place the character in the new board position
        board[mc.side][mc.endZone][mc.endSection] = mc.card;
        if (mc.onComplete) mc.onComplete();
        movingCharacters.splice(i, 1);
      }
    }
    // After all movement is done, if there is a pending animation and no current animation, promote it
    if (movingCharacters.length === 0 && currentAnimation == null && pendingAnimation != null) {
      currentAnimation = pendingAnimation;
      pendingAnimation = null;
    }
  }

  function drawMovingCharacters() {
    const headerHeight = 40; // Add header height constant
    for (const mc of movingCharacters) {
      const startPos = getCharacterPosition(mc.side, mc.startZone, mc.startSection, headerHeight);
      const endPos = getCharacterPosition(mc.side, mc.endZone, mc.endSection, headerHeight);
      const x = startPos.x + (endPos.x - startPos.x) * mc.progress;
      const y = startPos.y + (endPos.y - startPos.y) * mc.progress;
      drawCard(x, y, mc.card, false);
    }
  }

  let lastFrameTime = performance.now();
  function gameLoop(now) {
    if (gameContainer.classList.contains('hidden')) return;
    const delta = Math.min((now - lastFrameTime) / 1000, 0.1); // seconds, clamp to avoid huge jumps
    lastFrameTime = now;
    drawBoard();
    drawAnimation(delta);
    drawFloatingTexts();
    if (currentAnimation) {
      updateAnimation(delta);
    }
    updateMovingCharacters(delta);
    updateFloatingTexts(delta);
    requestAnimationFrame(gameLoop);
  }

  // Initialize the game
  function initGame() {
    console.log('Initializing game');
    // Hide game over screen if it's visible
    // gameOverScreen.classList.add('hidden');
    // Clear any existing cards
    playerHand = [];
    
    // Reset game state
    playerTurns = 0;
    aiTurns = 0;
    gameOver = false;
    firstTurn = true;
    playerKnockouts = 0;
    aiKnockouts = 0;
    
    // Don't reset the deck here - use the selected deck from deck selection
    // deck = [...CARD_LIBRARY]; // REMOVED - this was overriding the selected deck
    
    // Clear the board
    board = [
      Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)), // Player
      Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)), // AI
    ];

    // Place player characters in the bottom three zones (zones 4, 5, 6)
    // Place AI characters in the 3rd zone from the top (zone 3)
    // We'll use slot 1 (middle slot) for each
    board[0][3][0] = { team: 0, def: 5 }; // Player Red, bottom left
    board[0][3][1] = { team: 1, def: 5 }; // Player Green, bottom center
    board[0][3][2] = { team: 2, def: 5 }; // Player Blue, bottom right

    // AI characters in zone 2 (row 2), sections 0,1,2
    board[1][2][0] = { team: 0, def: 5 }; // AI Red, left
    board[1][2][1] = { team: 1, def: 5 }; // AI Green, center
    board[1][2][2] = { team: 2, def: 5 }; // AI Blue, right

    // Draw initial hand (only once)
    // Use the selected deck for player, generate random deck for AI
    playerHand = deck.map(card => stripTeam(card));
    player2Hand = deck.map(card => stripTeam(card));
    aiHand = generateAIDeck(); // Generate random AI deck
    console.log('Initial player hand:', playerHand);
    console.log('Initial Player 2 hand:', player2Hand);
    console.log('Initial AI hand:', aiHand);
    
    // Remove any existing Start Turn button
    let startButton = document.getElementById('start-turn-btn');
    if (startButton) {
      startButton.remove();
    }
    // Remove any existing Help button
    let existingHelpButton = document.getElementById('help-btn');
    if (existingHelpButton) {
      existingHelpButton.remove();
    }
    
    // Create Help button
    helpButton = document.createElement('button');
    helpButton.id = 'help-btn';
    helpButton.textContent = 'Help';
    helpButton.style.position = 'absolute';
    helpButton.style.left = '20px';
    helpButton.style.top = '20px';
    helpButton.style.padding = '10px 20px';
    helpButton.style.fontSize = '16px';
    helpButton.style.backgroundColor = '#2196F3';
    helpButton.style.color = 'white';
    helpButton.style.border = 'none';
    helpButton.style.borderRadius = '5px';
    helpButton.style.cursor = 'pointer';
    helpButton.style.zIndex = '1000';
    gameContainer.appendChild(helpButton);
    helpButton.onclick = function() {
      showHelpWindow();
    };
    
    // Create Start Turn button
    startButton = document.createElement('button');
    startButton.id = 'start-turn-btn';
    startButton.textContent = 'Start Turn';
    startButton.style.position = 'absolute';
    startButton.style.right = '20px';
    startButton.style.top = '50%';
    startButton.style.transform = 'translateY(-50%)';
    startButton.style.padding = '10px 20px';
    startButton.style.fontSize = '16px';
    startButton.style.backgroundColor = '#4CAF50';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.zIndex = '1000';
    gameContainer.appendChild(startButton);
    startButton.onclick = function() {
      console.log('Start Turn clicked');
      startPlayerTurn();
      if (startButton && startButton.parentNode) {
        startButton.parentNode.removeChild(startButton);
      }
    };
  }

  // === MAIN TITLE SCREEN ===
  // Hide game container initially
  gameContainer.classList.add('hidden');

  // Create title screen elements
  const titleScreen = document.createElement('div');
  titleScreen.id = 'title-screen';
  titleScreen.style.position = 'fixed';
  titleScreen.style.top = '0';
  titleScreen.style.left = '0';
  titleScreen.style.width = '100vw';
  titleScreen.style.height = '100vh';
  titleScreen.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
  titleScreen.style.display = 'flex';
  titleScreen.style.flexDirection = 'column';
  titleScreen.style.justifyContent = 'center';
  titleScreen.style.alignItems = 'center';
  titleScreen.style.zIndex = '2000';

  // Title
  const title = document.createElement('div');
  title.textContent = 'Zones';
  title.style.fontFamily = 'Arial Black, Arial, sans-serif';
  title.style.fontSize = '72px';
  title.style.letterSpacing = '8px';
  title.style.color = '#fff';
  title.style.textShadow = '0 0 24px #44ff44, 0 0 8px #000';
  title.style.marginBottom = '60px';
  titleScreen.appendChild(title);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '30px';
  buttonContainer.style.alignItems = 'center';

  // New Game button
  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.style.background = '#4CAF50';
  newGameBtn.style.color = '#fff';
  newGameBtn.style.fontSize = '32px';
  newGameBtn.style.fontWeight = 'bold';
  newGameBtn.style.padding = '18px 60px';
  newGameBtn.style.border = 'none';
  newGameBtn.style.borderRadius = '12px';
  newGameBtn.style.cursor = 'pointer';
  newGameBtn.style.boxShadow = '0 4px 16px #222';
  newGameBtn.onmouseenter = () => newGameBtn.style.background = '#43a047';
  newGameBtn.onmouseleave = () => newGameBtn.style.background = '#4CAF50';
  buttonContainer.appendChild(newGameBtn);

  // Deck Builder button
  const deckBuilderBtn = document.createElement('button');
  deckBuilderBtn.textContent = 'Deck Builder';
  deckBuilderBtn.style.background = '#4CAF50';
  deckBuilderBtn.style.color = '#fff';
  deckBuilderBtn.style.fontSize = '32px';
  deckBuilderBtn.style.fontWeight = 'bold';
  deckBuilderBtn.style.padding = '18px 60px';
  deckBuilderBtn.style.border = 'none';
  deckBuilderBtn.style.borderRadius = '12px';
  deckBuilderBtn.style.cursor = 'pointer';
  deckBuilderBtn.style.boxShadow = '0 4px 16px #222';
  deckBuilderBtn.onmouseenter = () => deckBuilderBtn.style.background = '#43a047';
  deckBuilderBtn.onmouseleave = () => deckBuilderBtn.style.background = '#4CAF50';
  // Placeholder: no action yet
  buttonContainer.appendChild(deckBuilderBtn);

  titleScreen.appendChild(buttonContainer);
  document.body.appendChild(titleScreen);

  // New Game button logic
  newGameBtn.onclick = function() {
    titleScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');
  initGame();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  };
  // === END MAIN TITLE SCREEN ===

  // Create end game message overlay
  const endGameScreen = document.createElement('div');
  endGameScreen.id = 'end-game-screen';
  endGameScreen.style.position = 'fixed';
  endGameScreen.style.top = '0';
  endGameScreen.style.left = '0';
  endGameScreen.style.width = '100vw';
  endGameScreen.style.height = '100vh';
  endGameScreen.style.background = 'rgba(0,0,0,0.8)';
  endGameScreen.style.display = 'flex';
  endGameScreen.style.flexDirection = 'column';
  endGameScreen.style.justifyContent = 'center';
  endGameScreen.style.alignItems = 'center';
  endGameScreen.style.zIndex = '3000';
  endGameScreen.style.color = '#fff';
  endGameScreen.style.fontSize = '48px';
  endGameScreen.style.fontWeight = 'bold';
  endGameScreen.style.textAlign = 'center';
  endGameScreen.style.visibility = 'hidden';

  // End game message text
  const endGameMessage = document.createElement('div');
  endGameMessage.style.marginBottom = '40px';
  endGameScreen.appendChild(endGameMessage);

  // Play Again button
  const playAgainBtn = document.createElement('button');
  playAgainBtn.textContent = 'Play Again';
  playAgainBtn.style.background = '#4CAF50';
  playAgainBtn.style.color = '#fff';
  playAgainBtn.style.fontSize = '32px';
  playAgainBtn.style.fontWeight = 'bold';
  playAgainBtn.style.padding = '18px 60px';
  playAgainBtn.style.border = 'none';
  playAgainBtn.style.borderRadius = '12px';
  playAgainBtn.style.cursor = 'pointer';
  playAgainBtn.style.boxShadow = '0 4px 16px #222';
  playAgainBtn.onmouseenter = () => playAgainBtn.style.background = '#43a047';
  playAgainBtn.onmouseleave = () => playAgainBtn.style.background = '#4CAF50';
  playAgainBtn.onclick = function() {
    endGameScreen.style.visibility = 'hidden';
    initGame();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  };
  endGameScreen.appendChild(playAgainBtn);

  document.body.appendChild(endGameScreen);

  // Helper to get character draw position for 6 zones and 3 sections
  function getCharacterPosition(side, zone, section, headerHeight = 80) {
    const sectionWidth = canvas.width / SECTIONS;
    const playAreaHeight = canvas.height - 100 - headerHeight;
    const zoneHeight = playAreaHeight / ZONES;
    const x = section * sectionWidth + sectionWidth / 2;
    const y = headerHeight + (zone * zoneHeight + zoneHeight / 2);
    return { x, y };
  }

  function findTauntingCharacter(side) {
    for (let zone = 0; zone < ZONES; zone++) {
      for (let section = 0; section < SECTIONS; section++) {
        const char = board[side][zone][section];
        if (char && char.taunt) {
          return char;
        }
      }
    }
    return null;
  }

  // Force correct initial visibility and debug output
  console.log("On load: gameContainer hidden?", gameContainer.classList.contains('hidden'));

  // Deck Builder Modal/Page
  let deckBuilderScreen = null;
  let customDecks = JSON.parse(localStorage.getItem('zones_custom_decks') || '[]');
  
  // Help system
  let helpButton = null;
  
  function showHelpWindow() {
    // Remove existing help window if it exists
    const existingHelp = document.getElementById('help-window');
    if (existingHelp) {
      existingHelp.remove();
    }
    
    // Create help window
    const helpWindow = document.createElement('div');
    helpWindow.id = 'help-window';
    helpWindow.style.position = 'fixed';
    helpWindow.style.top = '50%';
    helpWindow.style.left = '50%';
    helpWindow.style.transform = 'translate(-50%, -50%)';
    helpWindow.style.width = '80%';
    helpWindow.style.maxWidth = '800px';
    helpWindow.style.maxHeight = '80vh';
    helpWindow.style.background = '#222';
    helpWindow.style.border = '3px solid #4CAF50';
    helpWindow.style.borderRadius = '12px';
    helpWindow.style.padding = '24px';
    helpWindow.style.zIndex = '4000';
    helpWindow.style.overflowY = 'auto';
    helpWindow.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.8)';
    
    // Title
    const title = document.createElement('div');
    title.textContent = 'Game Rules';
    title.style.fontSize = '32px';
    title.style.fontWeight = 'bold';
    title.style.color = '#4CAF50';
    title.style.textAlign = 'center';
    title.style.marginBottom = '24px';
    helpWindow.appendChild(title);
    
    // Rules content
    const rulesContent = document.createElement('div');
    rulesContent.style.color = '#fff';
    rulesContent.style.fontSize = '16px';
    rulesContent.style.lineHeight = '1.6';
    rulesContent.innerHTML = `
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Objective</h3>
      <p>Push enemy characters off the back of their side of the board, or have the most forward character positions after turn 20.</p>
      
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Game Board</h3>
      <p>The board has 6 zones (rows), with characters starting in the middle rows and advance towards the enemy.</p>
      
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Turn Structure</h3>
      <p>1. Select a character from your hand<br>
      2. Choose a card to play<br>
      3. Select targets (if required)</p>
      
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Combat</h3>
      <p>When a character's Defense falls below 0, it is pushed backwards one zone and receives a temporary buff based on the character's color:<br>
      <strong>Red:</strong> receives +2 attack bonus<br>
      <strong>Green:</strong> receives +2 Defense Bonus<br>
      <strong>Blue:</strong> receives +1 Attack and +1 Defense Bonus</p>
      
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Zone Advancement</h3>
      <p>When one team's characters have been pushed fully backwards out of a zone, the attacking team's characters will automatically advance forward one zone. If a character is pushed out of their last zone they are removed from the rest of the game.</p>
      
      <h3 style="color: #4CAF50; margin-top: 20px; margin-bottom: 10px;">Abilities</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <canvas id="taunt-icon" width="20" height="20" style="border: none;"></canvas>
          <span><strong>Taunt:</strong> Forces all enemies to target this character and gives it +5 defense. Use to protect weaker allies.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <canvas id="counter-icon" width="20" height="20" style="border: none;"></canvas>
          <span><strong>Counter:</strong> Negates the next attack to this character and adds attack bonus equal to the damage negated. Defensive strategy card.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <canvas id="agility-icon" width="20" height="20" style="border: none;"></canvas>
          <span><strong>Agility:</strong> Makes a character untargetable for one turn. Use to avoid damage.</span>
        </div>
      </div>
    `;
    helpWindow.appendChild(rulesContent);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '16px';
    closeBtn.style.right = '16px';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.background = '#888';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      helpWindow.remove();
    };
    helpWindow.appendChild(closeBtn);
    
    document.body.appendChild(helpWindow);
    
    // Draw the exact same icons used in the game
    // Taunt icon (yellow bullseye)
    const tauntCanvas = document.getElementById('taunt-icon');
    const tauntCtx = tauntCanvas.getContext('2d');
    tauntCtx.save();
    tauntCtx.strokeStyle = '#FFD700';
    tauntCtx.lineWidth = 2;
    // Outer circle
    tauntCtx.beginPath();
    tauntCtx.arc(10, 10, 8, 0, 2 * Math.PI);
    tauntCtx.stroke();
    // Inner circle
    tauntCtx.beginPath();
    tauntCtx.arc(10, 10, 4, 0, 2 * Math.PI);
    tauntCtx.stroke();
    tauntCtx.restore();
    
    // Counter icon (blue circle with arrows)
    const counterCanvas = document.getElementById('counter-icon');
    const counterCtx = counterCanvas.getContext('2d');
    counterCtx.save();
    counterCtx.translate(10, 10);
    counterCtx.rotate(-Math.PI / 4);
    counterCtx.beginPath();
    counterCtx.arc(0, 0, 8, 0, Math.PI * 1.5, false);
    counterCtx.strokeStyle = '#3399ff';
    counterCtx.lineWidth = 2;
    counterCtx.stroke();
    counterCtx.beginPath();
    counterCtx.moveTo(5, -5);
    counterCtx.lineTo(9, -5);
    counterCtx.lineTo(5, -1);
    counterCtx.stroke();
    counterCtx.beginPath();
    counterCtx.arc(0, 0, 8, Math.PI, Math.PI * 2.5, false);
    counterCtx.stroke();
    counterCtx.beginPath();
    counterCtx.moveTo(-5, 5);
    counterCtx.lineTo(-9, 5);
    counterCtx.lineTo(-5, 1);
    counterCtx.stroke();
    counterCtx.restore();
    
    // Agility icon (yellow lightning bolt)
    const agilityCanvas = document.getElementById('agility-icon');
    const agilityCtx = agilityCanvas.getContext('2d');
    agilityCtx.save();
    agilityCtx.strokeStyle = '#ffcc00';
    agilityCtx.lineWidth = 2;
    agilityCtx.shadowColor = '#ffcc00';
    agilityCtx.shadowBlur = 4;
    // Draw lightning bolt
    agilityCtx.beginPath();
    agilityCtx.moveTo(6, 4);
    agilityCtx.lineTo(12, 12);
    agilityCtx.lineTo(8, 12);
    agilityCtx.lineTo(14, 18);
    agilityCtx.stroke();
    agilityCtx.restore();
  }

  function showDeckBuilder() {
    showDeckBuilderWithDeck(null);
  }

  deckBuilderBtn.onclick = showDeckBuilder;

  // Deck Loader Modal
  function showDeckLoader() {
    if (deckBuilderScreen) deckBuilderScreen.remove();
    
    const loaderScreen = document.createElement('div');
    loaderScreen.style.position = 'fixed';
    loaderScreen.style.top = '0';
    loaderScreen.style.left = '0';
    loaderScreen.style.width = '100vw';
    loaderScreen.style.height = '100vh';
    loaderScreen.style.background = 'rgba(0,0,0,0.8)';
    loaderScreen.style.display = 'flex';
    loaderScreen.style.flexDirection = 'column';
    loaderScreen.style.alignItems = 'center';
    loaderScreen.style.justifyContent = 'center';
    loaderScreen.style.zIndex = '4000';

    const container = document.createElement('div');
    container.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    container.style.padding = '40px';
    container.style.borderRadius = '16px';
    container.style.maxWidth = '600px';
    container.style.width = '90%';
    container.style.maxHeight = '80vh';
    container.style.overflowY = 'auto';

    const title = document.createElement('div');
    title.textContent = 'Load Custom Deck';
    title.style.fontSize = '32px';
    title.style.color = '#fff';
    title.style.marginBottom = '24px';
    title.style.textAlign = 'center';
    container.appendChild(title);

    if (customDecks.length === 0) {
      const noDecks = document.createElement('div');
      noDecks.textContent = 'No custom decks saved yet.';
      noDecks.style.color = '#ccc';
      noDecks.style.textAlign = 'center';
      noDecks.style.fontSize = '18px';
      container.appendChild(noDecks);
    } else {
      customDecks.forEach((deck, index) => {
        const deckItem = document.createElement('div');
        deckItem.style.display = 'flex';
        deckItem.style.justifyContent = 'space-between';
        deckItem.style.alignItems = 'center';
        deckItem.style.padding = '12px';
        deckItem.style.marginBottom = '8px';
        deckItem.style.background = '#444';
        deckItem.style.borderRadius = '8px';
        deckItem.style.border = '2px solid transparent';

        const deckName = document.createElement('div');
        deckName.textContent = deck.name;
        deckName.style.color = '#fff';
        deckName.style.fontSize = '18px';
        deckName.style.fontWeight = 'bold';
        deckItem.appendChild(deckName);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.style.padding = '6px 16px';
        editBtn.style.background = '#2196F3';
        editBtn.style.color = '#fff';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '4px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '14px';
        editBtn.onclick = () => {
          loadDeckForEditing(deck);
          loaderScreen.remove();
        };
        buttonContainer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.padding = '6px 16px';
        deleteBtn.style.background = '#f44336';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.onclick = () => {
          if (confirm(`Are you sure you want to delete "${deck.name}"?`)) {
            customDecks.splice(index, 1);
            localStorage.setItem('zones_custom_decks', JSON.stringify(customDecks));
            loaderScreen.remove();
            showDeckLoader(); // Refresh the list
          }
        };
        buttonContainer.appendChild(deleteBtn);

        deckItem.appendChild(buttonContainer);
        container.appendChild(deckItem);
      });
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '24px';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.padding = '10px 32px';
    closeBtn.style.background = '#888';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      loaderScreen.remove();
      // Return to deck builder screen
      showDeckBuilderWithDeck(null);
    };
    container.appendChild(closeBtn);

    loaderScreen.appendChild(container);
    document.body.appendChild(loaderScreen);
  }

  // Load deck for editing
  function loadDeckForEditing(deck) {
    // Close the loader screen
    const loaderScreen = document.querySelector('[style*="z-index: 4000"]');
    if (loaderScreen) loaderScreen.remove();
    
    // Close the current deck builder
    if (deckBuilderScreen) deckBuilderScreen.remove();
    
    // Show the deck builder with the loaded deck
    showDeckBuilderWithDeck(deck);
  }

  // Show deck builder with a pre-loaded deck
  function showDeckBuilderWithDeck(deckToLoad) {
    // Hide title screen
    titleScreen.style.display = 'none';
    
    // Create deck builder screen
    deckBuilderScreen = document.createElement('div');
    deckBuilderScreen.style.position = 'fixed';
    deckBuilderScreen.style.top = '0';
    deckBuilderScreen.style.left = '0';
    deckBuilderScreen.style.width = '100vw';
    deckBuilderScreen.style.height = '100vh';
    deckBuilderScreen.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    deckBuilderScreen.style.display = 'flex';
    deckBuilderScreen.style.flexDirection = 'column';
    deckBuilderScreen.style.alignItems = 'center';
    deckBuilderScreen.style.justifyContent = 'center';
    deckBuilderScreen.style.zIndex = '3500';

    const title = document.createElement('div');
    title.textContent = 'Deck Builder';
    title.style.fontSize = '48px';
    title.style.color = '#fff';
    title.style.marginBottom = '40px';
    deckBuilderScreen.appendChild(title);

    // Deck name input
    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.placeholder = 'Enter deck name';
    nameBox.value = deckToLoad ? deckToLoad.name : '';
    nameBox.style.fontSize = '20px';
    nameBox.style.padding = '12px';
    nameBox.style.marginBottom = '32px';
    nameBox.style.borderRadius = '8px';
    nameBox.style.border = '2px solid #555';
    nameBox.style.background = '#444';
    nameBox.style.color = '#fff';
    nameBox.style.width = '300px';
    deckBuilderScreen.appendChild(nameBox);

    // Split cards section (first 10 cards)
    const splitTitle = document.createElement('div');
    splitTitle.textContent = 'Split Cards (AttackDefense) - 10 cards';
    splitTitle.style.fontSize = '24px';
    splitTitle.style.color = '#fff';
    splitTitle.style.marginBottom = '16px';
    deckBuilderScreen.appendChild(splitTitle);

    const splitContainer = document.createElement('div');
    splitContainer.style.display = 'flex';
    splitContainer.style.flexWrap = 'wrap';
    splitContainer.style.gap = '8px';
    splitContainer.style.marginBottom = '32px';
    splitContainer.style.justifyContent = 'center';

    // Initialize split cards array
    let splitCards = [];
    if (deckToLoad) {
      splitCards = deckToLoad.cards.slice(0, 10);
    } else {
      // Default static split cards
      splitCards = [
        { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
        { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
        { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
        { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
        { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
        { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
        { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
        { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
        { type: 'AttackDefense', attackValue: 5, defenseValue: 1 },
        { type: 'AttackDefense', attackValue: 5, defenseValue: 1 }
      ];
    }

    // Create split card slots
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.style.width = '60px';
      slot.style.height = '80px';
      slot.style.border = '2px dashed #666';
      slot.style.borderRadius = '8px';
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.background = '#333';
      slot.onclick = () => showCardPicker(i, ['AttackDefense'], 1);
      splitContainer.appendChild(slot);
    }
    deckBuilderScreen.appendChild(splitContainer);

    // Custom cards section (last 10 cards)
    const customTitle = document.createElement('div');
    customTitle.textContent = 'Custom Cards - 10 cards';
    customTitle.style.fontSize = '24px';
    customTitle.style.color = '#fff';
    customTitle.style.marginBottom = '16px';
    deckBuilderScreen.appendChild(customTitle);

    const customContainer = document.createElement('div');
    customContainer.style.display = 'flex';
    customContainer.style.flexWrap = 'wrap';
    customContainer.style.gap = '8px';
    customContainer.style.marginBottom = '32px';
    customContainer.style.justifyContent = 'center';

    // Initialize custom cards array
    let customSlots = [];
    if (deckToLoad) {
      customSlots = deckToLoad.cards.slice(10, 20);
    } else {
      customSlots = new Array(10).fill(null);
    }

    // Create custom card slots
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.style.width = '60px';
      slot.style.height = '80px';
      slot.style.border = '2px dashed #666';
      slot.style.borderRadius = '8px';
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.background = '#333';
      slot.onclick = () => showCardPicker(i + 10, Object.values(CARD_TYPES).filter(type => type !== 'Attack' && type !== 'Defense'), 2);
      
      // Add drag and drop functionality
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.style.border = '2px dashed #4CAF50';
        slot.style.background = '#444';
      });
      
      slot.addEventListener('dragleave', (e) => {
        slot.style.border = '2px dashed #666';
        slot.style.background = '#333';
      });
      
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.style.border = '2px dashed #666';
        slot.style.background = '#333';
        
        const draggedSlotIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetSlotIndex = i + 10;
        
        if (draggedSlotIndex !== targetSlotIndex) {
          // Swap the cards
          const draggedCard = customSlots[draggedSlotIndex - 10];
          const targetCard = customSlots[targetSlotIndex - 10];
          
          customSlots[draggedSlotIndex - 10] = targetCard;
          customSlots[targetSlotIndex - 10] = draggedCard;
          
          // Update the display
          updateAllSlots();
        }
      });
      
      customContainer.appendChild(slot);
    }
    deckBuilderScreen.appendChild(customContainer);

    // Update slot displays
    function updateAllSlots() {
      for (let i = 0; i < 10; i++) {
        updateCustomSlot(splitContainer.children[i], i);
      }
      for (let i = 0; i < 10; i++) {
        updateCustomSlot(customContainer.children[i], i + 10);
      }
    }

    // Initialize slot displays
    updateAllSlots();

    // Card picker functionality
    let pickerPopup = null;
    function showCardPicker(slotIdx, allowedTypes, maxCopies) {
      if (pickerPopup) pickerPopup.remove();
      
      pickerPopup = document.createElement('div');
      pickerPopup.style.position = 'fixed';
      pickerPopup.style.top = '50%';
      pickerPopup.style.left = '50%';
      pickerPopup.style.transform = 'translate(-50%, -50%)';
      pickerPopup.style.background = '#333';
      pickerPopup.style.padding = '20px';
      pickerPopup.style.borderRadius = '12px';
      pickerPopup.style.border = '2px solid #555';
      pickerPopup.style.zIndex = '4000';
      pickerPopup.style.maxHeight = '70vh';
      pickerPopup.style.overflowY = 'auto';

      const title = document.createElement('div');
      title.textContent = 'Select Card';
      title.style.color = '#fff';
      title.style.fontSize = '20px';
      title.style.marginBottom = '16px';
      title.style.textAlign = 'center';
      pickerPopup.appendChild(title);

      // Create card options
      allowedTypes.forEach(type => {
        // Count how many copies of this card type are already in the deck
        let currentCount = 0;
        if (slotIdx < 10) {
          // For split cards, count in splitCards array
          currentCount = splitCards.filter(card => card && card.type === type).length;
        } else {
          // For custom cards, count in customSlots array
          currentCount = customSlots.filter(card => card && card.type === type).length;
        }
        
        // Skip this card if we've already reached the max copies
        if (currentCount >= maxCopies) {
          return;
        }
        
        const cardOption = document.createElement('div');
        cardOption.style.display = 'flex';
        cardOption.style.alignItems = 'center';
        cardOption.style.padding = '8px';
        cardOption.style.marginBottom = '8px';
        cardOption.style.background = '#444';
        cardOption.style.borderRadius = '8px';
        cardOption.style.cursor = 'pointer';
        
        // Add hover tooltip for card descriptions
        cardOption.addEventListener('mouseenter', (e) => {
          const description = CARD_DESCRIPTIONS[type] || 'No description available';
          showTooltip(cardOption, description, e.clientX, e.clientY);
        });
        
        cardOption.addEventListener('mouseleave', () => {
          hideTooltip();
        });
        
        cardOption.addEventListener('mousemove', (e) => {
          if (tooltip) {
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = e.clientY + 'px';
          }
        });
        
        cardOption.onclick = () => {
          let newCard;
          if (type === 'AttackDefense') {
            newCard = {
              type: 'AttackDefense',
              attackValue: Math.floor(Math.random() * 3) + 1,
              defenseValue: Math.floor(Math.random() * 3) + 1
            };
          } else {
            newCard = { type };
            if (type === CARD_TYPES.DOUBLE_BLAST || type === CARD_TYPES.TRIPLE_BLAST || 
                type === CARD_TYPES.TAUNT || type === CARD_TYPES.COUNTER_ASSAULT) {
              newCard.value = Math.floor(Math.random() * 3) + 1;
            }
          }
          
          if (slotIdx < 10) {
            splitCards[slotIdx] = newCard;
          } else {
            customSlots[slotIdx - 10] = newCard;
          }
          updateAllSlots();
          pickerPopup.remove();
        };

        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = 60;
        cardCanvas.height = 84;
        const ctx = cardCanvas.getContext('2d');
        const tempCard = type === 'AttackDefense' ? 
          { type: 'AttackDefense', attackValue: 2, defenseValue: 1 } : 
          { type };
        drawCard(0, 0, tempCard, false, false, ctx);
        cardOption.appendChild(cardCanvas);

        const cardName = document.createElement('div');
        cardName.textContent = type;
        cardName.style.color = '#fff';
        cardName.style.marginLeft = '12px';
        cardName.style.fontSize = '16px';
        cardOption.appendChild(cardName);

        pickerPopup.appendChild(cardOption);
      });

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove Card';
      removeBtn.style.width = '100%';
      removeBtn.style.padding = '12px';
      removeBtn.style.marginTop = '16px';
      removeBtn.style.background = '#f44336';
      removeBtn.style.color = '#fff';
      removeBtn.style.border = 'none';
      removeBtn.style.borderRadius = '8px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.onclick = () => {
        if (slotIdx < 10) {
          splitCards[slotIdx] = null;
        } else {
          customSlots[slotIdx - 10] = null;
        }
        updateAllSlots();
        pickerPopup.remove();
      };
      pickerPopup.appendChild(removeBtn);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.width = '100%';
      closeBtn.style.padding = '12px';
      closeBtn.style.marginTop = '8px';
      closeBtn.style.background = '#888';
      closeBtn.style.color = '#fff';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => {
        pickerPopup.remove();
      };
      pickerPopup.appendChild(closeBtn);

      document.body.appendChild(pickerPopup);
    }

    function updateCustomSlot(slot, idx) {
      slot.innerHTML = '';
      const card = idx < 10 ? splitCards[idx] : customSlots[idx - 10];
      if (card) {
        drawCardInDiv(slot, card);
        
        // Add drag functionality to cards in custom slots only
        if (idx >= 10) {
          slot.draggable = true;
          slot.style.cursor = 'grab';
          
          slot.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', idx.toString());
            slot.style.opacity = '0.5';
          });
          
          slot.addEventListener('dragend', (e) => {
            slot.style.opacity = '1';
          });
        }
      }
    }

    function drawCardInDiv(div, card) {
      const c = document.createElement('canvas');
      c.width = 50; c.height = 70;
      const cx = c.getContext('2d');
      drawCard(0, 0, card, false, false, cx);
      div.appendChild(c);
      
      // Add tooltip functionality
      const description = CARD_DESCRIPTIONS[card.type];
      if (description) {
        div.addEventListener('mouseenter', (e) => {
          showTooltip(div, description, e.pageX + 10, e.pageY - 10);
        });
        
        div.addEventListener('mouseleave', () => {
          hideTooltip();
        });
        
        div.addEventListener('mousemove', (e) => {
          if (tooltip) {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY - 10) + 'px';
          }
        });
      }
    }

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '16px';
    buttonContainer.style.marginTop = '32px';
    buttonContainer.style.justifyContent = 'center';

    // Load Deck button
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Deck';
    loadBtn.style.fontSize = '24px';
    loadBtn.style.padding = '12px 40px';
    loadBtn.style.background = '#2196F3';
    loadBtn.style.color = '#fff';
    loadBtn.style.border = 'none';
    loadBtn.style.borderRadius = '8px';
    loadBtn.style.cursor = 'pointer';
    loadBtn.onclick = () => {
      showDeckLoader();
    };
    buttonContainer.appendChild(loadBtn);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Deck';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.padding = '12px 40px';
    saveBtn.style.background = '#4CAF50';
    saveBtn.style.color = '#fff';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '8px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.onclick = () => {
      const name = nameBox.value.trim();
      if (!name) {
        alert('Please enter a deck name.');
        return;
      }
      // Validate deck: must have all 10 custom slots filled
      if (customSlots.some(c => !c)) {
        alert('Please fill all 10 custom card slots.');
        return;
      }
      // Save deck
      const deck = {
        name,
        cards: [...splitCards.map(stripTeam), ...customSlots.map(c => stripTeam({ ...c }))],
      };
      // Remove any existing deck with same name
      customDecks = customDecks.filter(d => d.name !== name);
      customDecks.push(deck);
      localStorage.setItem('zones_custom_decks', JSON.stringify(customDecks));
      alert('Deck saved!');
      deckBuilderScreen.remove();
      if (returnToGameRoomModal) {
        returnToGameRoomModal = false;
        // Reload custom decks and show game room modal
        customDecks = JSON.parse(localStorage.getItem('zones_custom_decks') || '[]');
        showGameRoomModal(null);
      } else {
        titleScreen.style.display = 'flex';
      }
    };
    buttonContainer.appendChild(saveBtn);

    deckBuilderScreen.appendChild(buttonContainer);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.marginTop = '16px';
    backBtn.style.fontSize = '18px';
    backBtn.style.padding = '8px 32px';
    backBtn.style.background = '#888';
    backBtn.style.color = '#fff';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '8px';
    backBtn.style.cursor = 'pointer';
    backBtn.onclick = () => {
      deckBuilderScreen.remove();
      if (returnToGameRoomModal) {
        returnToGameRoomModal = false;
        // Reload custom decks and show game room modal
        customDecks = JSON.parse(localStorage.getItem('zones_custom_decks') || '[]');
        showGameRoomModal(null);
      } else {
        titleScreen.style.display = 'flex';
      }
    };
    deckBuilderScreen.appendChild(backBtn);

    document.body.appendChild(deckBuilderScreen);
  }

  deckBuilderBtn.onclick = showDeckBuilder;

  // Deck Loader Modal
  function showDeckLoader() {
    if (deckBuilderScreen) deckBuilderScreen.remove();
    
    const loaderScreen = document.createElement('div');
    loaderScreen.style.position = 'fixed';
    loaderScreen.style.top = '0';
    loaderScreen.style.left = '0';
    loaderScreen.style.width = '100vw';
    loaderScreen.style.height = '100vh';
    loaderScreen.style.background = 'rgba(0,0,0,0.8)';
    loaderScreen.style.display = 'flex';
    loaderScreen.style.flexDirection = 'column';
    loaderScreen.style.alignItems = 'center';
    loaderScreen.style.justifyContent = 'center';
    loaderScreen.style.zIndex = '4000';

    const container = document.createElement('div');
    container.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    container.style.padding = '40px';
    container.style.borderRadius = '16px';
    container.style.maxWidth = '600px';
    container.style.width = '90%';
    container.style.maxHeight = '80vh';
    container.style.overflowY = 'auto';

    const title = document.createElement('div');
    title.textContent = 'Load Custom Deck';
    title.style.fontSize = '32px';
    title.style.color = '#fff';
    title.style.marginBottom = '24px';
    title.style.textAlign = 'center';
    container.appendChild(title);

    if (customDecks.length === 0) {
      const noDecks = document.createElement('div');
      noDecks.textContent = 'No custom decks saved yet.';
      noDecks.style.color = '#ccc';
      noDecks.style.textAlign = 'center';
      noDecks.style.fontSize = '18px';
      container.appendChild(noDecks);
    } else {
      customDecks.forEach((deck, index) => {
        const deckItem = document.createElement('div');
        deckItem.style.display = 'flex';
        deckItem.style.justifyContent = 'space-between';
        deckItem.style.alignItems = 'center';
        deckItem.style.padding = '12px';
        deckItem.style.marginBottom = '8px';
        deckItem.style.background = '#444';
        deckItem.style.borderRadius = '8px';
        deckItem.style.border = '2px solid transparent';

        const deckName = document.createElement('div');
        deckName.textContent = deck.name;
        deckName.style.color = '#fff';
        deckName.style.fontSize = '18px';
        deckName.style.fontWeight = 'bold';
        deckItem.appendChild(deckName);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.style.padding = '6px 16px';
        editBtn.style.background = '#2196F3';
        editBtn.style.color = '#fff';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '4px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '14px';
        editBtn.onclick = () => {
          loadDeckForEditing(deck);
          loaderScreen.remove();
        };
        buttonContainer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.padding = '6px 16px';
        deleteBtn.style.background = '#f44336';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.onclick = () => {
          if (confirm(`Are you sure you want to delete "${deck.name}"?`)) {
            customDecks.splice(index, 1);
            localStorage.setItem('zones_custom_decks', JSON.stringify(customDecks));
            loaderScreen.remove();
            showDeckLoader(); // Refresh the list
          }
        };
        buttonContainer.appendChild(deleteBtn);

        deckItem.appendChild(buttonContainer);
        container.appendChild(deckItem);
      });
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '24px';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.padding = '10px 32px';
    closeBtn.style.background = '#888';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      loaderScreen.remove();
      // Return to deck builder screen
      showDeckBuilderWithDeck(null);
    };
    container.appendChild(closeBtn);

    loaderScreen.appendChild(container);
    document.body.appendChild(loaderScreen);
  }

  // Load deck for editing
  function loadDeckForEditing(deck) {
    // Close the loader screen
    const loaderScreen = document.querySelector('[style*="z-index: 4000"]');
    if (loaderScreen) loaderScreen.remove();
    
    // Close the current deck builder
    if (deckBuilderScreen) deckBuilderScreen.remove();
    
    // Show the deck builder with the loaded deck
    showDeckBuilderWithDeck(deck);
  }

  // Show deck builder with a pre-loaded deck
  function showDeckBuilderWithDeck(deckToLoad) {
    // Hide title screen
    titleScreen.style.display = 'none';
    
    // Create deck builder screen
    deckBuilderScreen = document.createElement('div');
    deckBuilderScreen.style.position = 'fixed';
    deckBuilderScreen.style.top = '0';
    deckBuilderScreen.style.left = '0';
    deckBuilderScreen.style.width = '100vw';
    deckBuilderScreen.style.height = '100vh';
    deckBuilderScreen.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    deckBuilderScreen.style.display = 'flex';
    deckBuilderScreen.style.flexDirection = 'column';
    deckBuilderScreen.style.alignItems = 'center';
    deckBuilderScreen.style.justifyContent = 'center';
    deckBuilderScreen.style.zIndex = '3500';

    const title = document.createElement('div');
    title.textContent = 'Deck Builder';
    title.style.fontSize = '48px';
    title.style.color = '#fff';
    title.style.marginBottom = '40px';
    deckBuilderScreen.appendChild(title);

    // Deck name input
    const nameBox = document.createElement('input');
    nameBox.type = 'text';
    nameBox.placeholder = 'Enter deck name';
    nameBox.value = deckToLoad ? deckToLoad.name : '';
    nameBox.style.fontSize = '20px';
    nameBox.style.padding = '12px';
    nameBox.style.marginBottom = '32px';
    nameBox.style.borderRadius = '8px';
    nameBox.style.border = '2px solid #555';
    nameBox.style.background = '#444';
    nameBox.style.color = '#fff';
    nameBox.style.width = '300px';
    deckBuilderScreen.appendChild(nameBox);

    // Split cards section (first 10 cards)
    const splitTitle = document.createElement('div');
    splitTitle.textContent = 'Split Cards (AttackDefense) - 10 cards';
    splitTitle.style.fontSize = '24px';
    splitTitle.style.color = '#fff';
    splitTitle.style.marginBottom = '16px';
    deckBuilderScreen.appendChild(splitTitle);

    const splitContainer = document.createElement('div');
    splitContainer.style.display = 'flex';
    splitContainer.style.flexWrap = 'wrap';
    splitContainer.style.gap = '8px';
    splitContainer.style.marginBottom = '32px';
    splitContainer.style.justifyContent = 'center';

    // Initialize split cards array
    let splitCards = [];
    if (deckToLoad) {
      splitCards = deckToLoad.cards.slice(0, 10);
    } else {
      // Default static split cards
      splitCards = [
        { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
        { type: 'AttackDefense', attackValue: 1, defenseValue: 5 },
        { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
        { type: 'AttackDefense', attackValue: 2, defenseValue: 4 },
        { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
        { type: 'AttackDefense', attackValue: 3, defenseValue: 3 },
        { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
        { type: 'AttackDefense', attackValue: 4, defenseValue: 2 },
        { type: 'AttackDefense', attackValue: 5, defenseValue: 1 },
        { type: 'AttackDefense', attackValue: 5, defenseValue: 1 }
      ];
    }

    // Create split card slots
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.style.width = '60px';
      slot.style.height = '80px';
      slot.style.border = '2px dashed #666';
      slot.style.borderRadius = '8px';
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.background = '#333';
      slot.onclick = () => showCardPicker(i, ['AttackDefense'], 1);
      splitContainer.appendChild(slot);
    }
    deckBuilderScreen.appendChild(splitContainer);

    // Custom cards section (last 10 cards)
    const customTitle = document.createElement('div');
    customTitle.textContent = 'Custom Cards - 10 cards';
    customTitle.style.fontSize = '24px';
    customTitle.style.color = '#fff';
    customTitle.style.marginBottom = '16px';
    deckBuilderScreen.appendChild(customTitle);

    const customContainer = document.createElement('div');
    customContainer.style.display = 'flex';
    customContainer.style.flexWrap = 'wrap';
    customContainer.style.gap = '8px';
    customContainer.style.marginBottom = '32px';
    customContainer.style.justifyContent = 'center';

    // Initialize custom cards array
    let customSlots = [];
    if (deckToLoad) {
      customSlots = deckToLoad.cards.slice(10, 20);
    } else {
      customSlots = new Array(10).fill(null);
    }

    // Create custom card slots
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.style.width = '60px';
      slot.style.height = '80px';
      slot.style.border = '2px dashed #666';
      slot.style.borderRadius = '8px';
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.background = '#333';
      slot.onclick = () => showCardPicker(i + 10, Object.values(CARD_TYPES).filter(type => type !== 'Attack' && type !== 'Defense'), 2);
      
      // Add drag and drop functionality
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.style.border = '2px dashed #4CAF50';
        slot.style.background = '#444';
      });
      
      slot.addEventListener('dragleave', (e) => {
        slot.style.border = '2px dashed #666';
        slot.style.background = '#333';
      });
      
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.style.border = '2px dashed #666';
        slot.style.background = '#333';
        
        const draggedSlotIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetSlotIndex = i + 10;
        
        if (draggedSlotIndex !== targetSlotIndex) {
          // Swap the cards
          const draggedCard = customSlots[draggedSlotIndex - 10];
          const targetCard = customSlots[targetSlotIndex - 10];
          
          customSlots[draggedSlotIndex - 10] = targetCard;
          customSlots[targetSlotIndex - 10] = draggedCard;
          
          // Update the display
          updateAllSlots();
        }
      });
      
      customContainer.appendChild(slot);
    }
    deckBuilderScreen.appendChild(customContainer);

    // Update slot displays
    function updateAllSlots() {
      for (let i = 0; i < 10; i++) {
        updateCustomSlot(splitContainer.children[i], i);
      }
      for (let i = 0; i < 10; i++) {
        updateCustomSlot(customContainer.children[i], i + 10);
      }
    }

    // Initialize slot displays
    updateAllSlots();

    // Card picker functionality
    let pickerPopup = null;
    function showCardPicker(slotIdx, allowedTypes, maxCopies) {
      if (pickerPopup) pickerPopup.remove();
      
      pickerPopup = document.createElement('div');
      pickerPopup.style.position = 'fixed';
      pickerPopup.style.top = '50%';
      pickerPopup.style.left = '50%';
      pickerPopup.style.transform = 'translate(-50%, -50%)';
      pickerPopup.style.background = '#333';
      pickerPopup.style.padding = '20px';
      pickerPopup.style.borderRadius = '12px';
      pickerPopup.style.border = '2px solid #555';
      pickerPopup.style.zIndex = '4000';
      pickerPopup.style.maxHeight = '70vh';
      pickerPopup.style.overflowY = 'auto';

      const title = document.createElement('div');
      title.textContent = 'Select Card';
      title.style.color = '#fff';
      title.style.fontSize = '20px';
      title.style.marginBottom = '16px';
      title.style.textAlign = 'center';
      pickerPopup.appendChild(title);

      // Create card options
      allowedTypes.forEach(type => {
        // Count how many copies of this card type are already in the deck
        let currentCount = 0;
        if (slotIdx < 10) {
          // For split cards, count in splitCards array
          currentCount = splitCards.filter(card => card && card.type === type).length;
        } else {
          // For custom cards, count in customSlots array
          currentCount = customSlots.filter(card => card && card.type === type).length;
        }
        
        // Skip this card if we've already reached the max copies
        if (currentCount >= maxCopies) {
          return;
        }
        
        const cardOption = document.createElement('div');
        cardOption.style.display = 'flex';
        cardOption.style.alignItems = 'center';
        cardOption.style.padding = '8px';
        cardOption.style.marginBottom = '8px';
        cardOption.style.background = '#444';
        cardOption.style.borderRadius = '8px';
        cardOption.style.cursor = 'pointer';
        
        // Add hover tooltip for card descriptions
        cardOption.addEventListener('mouseenter', (e) => {
          const description = CARD_DESCRIPTIONS[type] || 'No description available';
          showTooltip(cardOption, description, e.clientX, e.clientY);
        });
        
        cardOption.addEventListener('mouseleave', () => {
          hideTooltip();
        });
        
        cardOption.addEventListener('mousemove', (e) => {
          if (tooltip) {
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = e.clientY + 'px';
          }
        });
        
        cardOption.onclick = () => {
          let newCard;
          if (type === 'AttackDefense') {
            newCard = {
              type: 'AttackDefense',
              attackValue: Math.floor(Math.random() * 3) + 1,
              defenseValue: Math.floor(Math.random() * 3) + 1
            };
          } else {
            newCard = { type };
            if (type === CARD_TYPES.DOUBLE_BLAST || type === CARD_TYPES.TRIPLE_BLAST || 
                type === CARD_TYPES.TAUNT || type === CARD_TYPES.COUNTER_ASSAULT) {
              newCard.value = Math.floor(Math.random() * 3) + 1;
            }
          }
          
          if (slotIdx < 10) {
            splitCards[slotIdx] = newCard;
          } else {
            customSlots[slotIdx - 10] = newCard;
          }
          updateAllSlots();
          pickerPopup.remove();
        };

        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = 60;
        cardCanvas.height = 84;
        const ctx = cardCanvas.getContext('2d');
        const tempCard = type === 'AttackDefense' ? 
          { type: 'AttackDefense', attackValue: 2, defenseValue: 1 } : 
          { type };
        drawCard(0, 0, tempCard, false, false, ctx);
        cardOption.appendChild(cardCanvas);

        const cardName = document.createElement('div');
        cardName.textContent = type;
        cardName.style.color = '#fff';
        cardName.style.marginLeft = '12px';
        cardName.style.fontSize = '16px';
        cardOption.appendChild(cardName);

        pickerPopup.appendChild(cardOption);
      });

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove Card';
      removeBtn.style.width = '100%';
      removeBtn.style.padding = '12px';
      removeBtn.style.marginTop = '16px';
      removeBtn.style.background = '#f44336';
      removeBtn.style.color = '#fff';
      removeBtn.style.border = 'none';
      removeBtn.style.borderRadius = '8px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.onclick = () => {
        if (slotIdx < 10) {
          splitCards[slotIdx] = null;
        } else {
          customSlots[slotIdx - 10] = null;
        }
        updateAllSlots();
        pickerPopup.remove();
      };
      pickerPopup.appendChild(removeBtn);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.width = '100%';
      closeBtn.style.padding = '12px';
      closeBtn.style.marginTop = '8px';
      closeBtn.style.background = '#888';
      closeBtn.style.color = '#fff';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => {
        pickerPopup.remove();
      };
      pickerPopup.appendChild(closeBtn);

      document.body.appendChild(pickerPopup);
    }

    function updateCustomSlot(slot, idx) {
      slot.innerHTML = '';
      const card = idx < 10 ? splitCards[idx] : customSlots[idx - 10];
      if (card) {
        drawCardInDiv(slot, card);
        
        // Add drag functionality to cards in custom slots only
        if (idx >= 10) {
          slot.draggable = true;
          slot.style.cursor = 'grab';
          
          slot.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', idx.toString());
            slot.style.opacity = '0.5';
          });
          
          slot.addEventListener('dragend', (e) => {
            slot.style.opacity = '1';
          });
        }
      }
    }

    function drawCardInDiv(div, card) {
      const c = document.createElement('canvas');
      c.width = 50; c.height = 70;
      const cx = c.getContext('2d');
      drawCard(0, 0, card, false, false, cx);
      div.appendChild(c);
      
      // Add tooltip functionality
      const description = CARD_DESCRIPTIONS[card.type];
      if (description) {
        div.addEventListener('mouseenter', (e) => {
          showTooltip(div, description, e.pageX + 10, e.pageY - 10);
        });
        
        div.addEventListener('mouseleave', () => {
          hideTooltip();
        });
        
        div.addEventListener('mousemove', (e) => {
          if (tooltip) {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY - 10) + 'px';
          }
        });
      }
    }

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '16px';
    buttonContainer.style.marginTop = '32px';
    buttonContainer.style.justifyContent = 'center';

    // Load Deck button
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Deck';
    loadBtn.style.fontSize = '24px';
    loadBtn.style.padding = '12px 40px';
    loadBtn.style.background = '#2196F3';
    loadBtn.style.color = '#fff';
    loadBtn.style.border = 'none';
    loadBtn.style.borderRadius = '8px';
    loadBtn.style.cursor = 'pointer';
    loadBtn.onclick = () => {
      showDeckLoader();
    };
    buttonContainer.appendChild(loadBtn);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Deck';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.padding = '12px 40px';
    saveBtn.style.background = '#4CAF50';
    saveBtn.style.color = '#fff';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '8px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.onclick = () => {
      const name = nameBox.value.trim();
      if (!name) {
        alert('Please enter a deck name.');
        return;
      }
      // Validate deck: must have all 10 custom slots filled
      if (customSlots.some(c => !c)) {
        alert('Please fill all 10 custom card slots.');
        return;
      }
      // Save deck
      const deck = {
        name,
        cards: [...splitCards.map(stripTeam), ...customSlots.map(c => stripTeam({ ...c }))],
      };
      // Remove any existing deck with same name
      customDecks = customDecks.filter(d => d.name !== name);
      customDecks.push(deck);
      localStorage.setItem('zones_custom_decks', JSON.stringify(customDecks));
      alert('Deck saved!');
      deckBuilderScreen.remove();
      if (returnToGameRoomModal) {
        returnToGameRoomModal = false;
        // Reload custom decks and show game room modal
        customDecks = JSON.parse(localStorage.getItem('zones_custom_decks') || '[]');
        showGameRoomModal(null);
      } else {
        titleScreen.style.display = 'flex';
      }
    };
    buttonContainer.appendChild(saveBtn);

    deckBuilderScreen.appendChild(buttonContainer);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.marginTop = '16px';
    backBtn.style.fontSize = '18px';
    backBtn.style.padding = '8px 32px';
    backBtn.style.background = '#888';
    backBtn.style.color = '#fff';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '8px';
    backBtn.style.cursor = 'pointer';
    backBtn.onclick = () => {
      deckBuilderScreen.remove();
      if (returnToGameRoomModal) {
        returnToGameRoomModal = false;
        // Reload custom decks and show game room modal
        customDecks = JSON.parse(localStorage.getItem('zones_custom_decks') || '[]');
        showGameRoomModal(null);
      } else {
        titleScreen.style.display = 'flex';
      }
    };
    deckBuilderScreen.appendChild(backBtn);

    document.body.appendChild(deckBuilderScreen);
  }

  // --- Deck selection for New Game ---
  let deckSelectScreen = null;
  newGameBtn.onclick = function() {
    // Show deck selection screen
    if (deckSelectScreen) deckSelectScreen.remove();
    deckSelectScreen = document.createElement('div');
    deckSelectScreen.style.position = 'fixed';
    deckSelectScreen.style.top = '0';
    deckSelectScreen.style.left = '0';
    deckSelectScreen.style.width = '100vw';
    deckSelectScreen.style.height = '100vh';
    deckSelectScreen.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    deckSelectScreen.style.display = 'flex';
    deckSelectScreen.style.flexDirection = 'column';
    deckSelectScreen.style.alignItems = 'center';
    deckSelectScreen.style.justifyContent = 'center';
    deckSelectScreen.style.zIndex = '3500';

    const title = document.createElement('div');
    title.textContent = 'Select Deck';
    title.style.fontSize = '48px';
    title.style.color = '#fff';
    title.style.marginBottom = '40px';
    deckSelectScreen.appendChild(title);

    // --- Game Mode Selection ---
    const modeContainer = document.createElement('div');
    modeContainer.style.display = 'flex';
    modeContainer.style.flexWrap = 'wrap';
    modeContainer.style.gap = '16px';
    modeContainer.style.marginBottom = '32px';
    modeContainer.style.alignItems = 'center';
    modeContainer.style.justifyContent = 'center';
    
    const pvaiBtn = document.createElement('button');
    pvaiBtn.textContent = 'Player vs AI';
    pvaiBtn.style.fontSize = '20px';
    pvaiBtn.style.padding = '12px 30px';
    pvaiBtn.style.background = '#4CAF50';
    pvaiBtn.style.color = '#fff';
    pvaiBtn.style.border = '3px solid #FFD700';
    pvaiBtn.style.borderRadius = '10px';
    pvaiBtn.style.cursor = 'pointer';
    pvaiBtn.onclick = () => {
      gameMode = 'pvai';
      pvaiBtn.style.background = '#4CAF50';
      pvpBtn.style.background = '#222';
      onlineBtn.style.background = '#222';
      pvaiBtn.style.border = '3px solid #FFD700';
      pvpBtn.style.border = '2px solid #4CAF50';
      onlineBtn.style.border = '2px solid #4CAF50';
    };
    
    const pvpBtn = document.createElement('button');
    pvpBtn.textContent = 'Player vs Player';
    pvpBtn.style.fontSize = '20px';
    pvpBtn.style.padding = '12px 30px';
    pvpBtn.style.background = '#222';
    pvpBtn.style.color = '#fff';
    pvpBtn.style.border = '2px solid #4CAF50';
    pvpBtn.style.borderRadius = '10px';
    pvpBtn.style.cursor = 'pointer';
    pvpBtn.onclick = () => {
      gameMode = 'pvp';
      pvpBtn.style.background = '#4CAF50';
      pvaiBtn.style.background = '#222';
      onlineBtn.style.background = '#222';
      pvpBtn.style.border = '3px solid #FFD700';
      pvaiBtn.style.border = '2px solid #4CAF50';
      onlineBtn.style.border = '2px solid #4CAF50';
    };
    
    const onlineBtn = document.createElement('button');
    onlineBtn.textContent = '🌐 Online Multiplayer';
    onlineBtn.style.fontSize = '20px';
    onlineBtn.style.padding = '12px 30px';
    onlineBtn.style.background = '#222';
    onlineBtn.style.color = '#fff';
    onlineBtn.style.border = '2px solid #4CAF50';
    onlineBtn.style.borderRadius = '10px';
    onlineBtn.style.cursor = 'pointer';
    onlineBtn.onclick = () => {
      gameMode = 'online';
      onlineBtn.style.background = '#4CAF50';
      pvaiBtn.style.background = '#222';
      pvpBtn.style.background = '#222';
      onlineBtn.style.border = '3px solid #FFD700';
      pvaiBtn.style.border = '2px solid #4CAF50';
      pvpBtn.style.border = '2px solid #4CAF50';
    };
    
    modeContainer.appendChild(pvaiBtn);
    modeContainer.appendChild(pvpBtn);
    modeContainer.appendChild(onlineBtn);
    deckSelectScreen.appendChild(modeContainer);
    // --- End Game Mode Selection ---

    // Deck list container
    const deckList = document.createElement('div');
    deckList.style.display = 'flex';
    deckList.style.flexDirection = 'column';
    deckList.style.gap = '18px';
    deckList.style.alignItems = 'center';
    deckList.style.marginBottom = '40px';
    deckSelectScreen.appendChild(deckList);

    // Decks: default first, then custom
    const allDecks = [
      { name: 'Default Deck', cards: [...CARD_LIBRARY], isDefault: true },
      ...customDecks.map(d => ({ ...d, isDefault: false }))
    ];
    let selectedDeckIdx = 0;
    let deckBtns = [];
    allDecks.forEach((deckObj, idx) => {
      const btn = document.createElement('div');
      btn.textContent = deckObj.name;
      btn.style.fontSize = '28px';
      btn.style.padding = '18px 60px';
      btn.style.background = idx === selectedDeckIdx ? '#4CAF50' : '#222';
      btn.style.color = '#fff';
      btn.style.border = idx === selectedDeckIdx ? '3px solid #FFD700' : '2px solid #4CAF50';
      btn.style.borderRadius = '12px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'background 0.2s, border 0.2s';
      btn.style.minWidth = '320px';
      btn.style.boxSizing = 'border-box';
      btn.onclick = () => {
        selectedDeckIdx = idx;
        deckBtns.forEach((b, i) => {
          b.style.background = i === selectedDeckIdx ? '#4CAF50' : '#222';
          b.style.border = i === selectedDeckIdx ? '3px solid #FFD700' : '2px solid #4CAF50';
        });
      };
      btn.onmouseenter = () => {
        if (selectedDeckIdx !== idx) btn.style.background = '#333';
      };
      btn.onmouseleave = () => {
        if (selectedDeckIdx !== idx) btn.style.background = '#222';
      };
      deckBtns.push(btn);
      deckList.appendChild(btn);
    });

    // Start Game button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.style.fontSize = '32px';
    startBtn.style.padding = '18px 60px';
    startBtn.style.background = '#4CAF50';
    startBtn.style.color = '#fff';
    startBtn.style.border = 'none';
    startBtn.style.borderRadius = '12px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.marginBottom = '24px';
    startBtn.onclick = () => {
      if (gameMode === 'online') {
        // For online mode, show game room modal (which has deck selection)
        deckSelectScreen.remove();
        showGameRoomModal(null); // Pass null, deck will be selected in modal
      } else {
        // Start local game (PvP or PvAI) - requires deck selection
        const selectedDeck = allDecks[selectedDeckIdx].cards.map(c => stripTeam({ ...c }));
        deckSelectScreen.remove();
        titleScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
        deck = selectedDeck;
        player2Hand = [...selectedDeck];
        initGame();
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
      }
    };
    deckSelectScreen.appendChild(startBtn);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.fontSize = '20px';
    backBtn.style.padding = '10px 40px';
    backBtn.style.background = '#888';
    backBtn.style.color = '#fff';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '10px';
    backBtn.style.cursor = 'pointer';
    backBtn.onclick = () => {
      deckSelectScreen.remove();
    };
    deckSelectScreen.appendChild(backBtn);

    document.body.appendChild(deckSelectScreen);
  };

  // ===== ONLINE MULTIPLAYER FUNCTIONS =====
  
  // Game Room Modal
  let gameRoomModal = null;
  let waitingRoomModal = null;
  let selectedDeckForOnline = null;
  let returnToGameRoomModal = false; // Track if we should return to game room modal after deck builder
  
  function showGameRoomModal(deck) {
    selectedDeckForOnline = deck;
    
    if (gameRoomModal) gameRoomModal.remove();
    gameRoomModal = document.createElement('div');
    gameRoomModal.style.position = 'fixed';
    gameRoomModal.style.top = '0';
    gameRoomModal.style.left = '0';
    gameRoomModal.style.width = '100vw';
    gameRoomModal.style.height = '100vh';
    gameRoomModal.style.background = 'rgba(0,0,0,0.9)';
    gameRoomModal.style.display = 'flex';
    gameRoomModal.style.flexDirection = 'column';
    gameRoomModal.style.alignItems = 'center';
    gameRoomModal.style.justifyContent = 'center';
    gameRoomModal.style.zIndex = '4000';
    gameRoomModal.onclick = (e) => {
      if (e.target === gameRoomModal) closeGameRoomModal();
    };

    const modalContent = document.createElement('div');
    modalContent.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    modalContent.style.padding = '40px';
    modalContent.style.borderRadius = '16px';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '90%';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
    modalContent.onclick = (e) => e.stopPropagation();

    const title = document.createElement('div');
    title.textContent = 'Online Multiplayer';
    title.style.fontSize = '36px';
    title.style.color = '#fff';
    title.style.marginBottom = '30px';
    title.style.textAlign = 'center';
    modalContent.appendChild(title);

    // Deck Selection Section
    const deckContainer = document.createElement('div');
    deckContainer.style.marginBottom = '25px';
    const deckLabel = document.createElement('label');
    deckLabel.textContent = 'Select Deck:';
    deckLabel.style.display = 'block';
    deckLabel.style.marginBottom = '8px';
    deckLabel.style.fontWeight = '600';
    deckLabel.style.color = '#fff';
    deckLabel.style.fontSize = '16px';
    deckContainer.appendChild(deckLabel);
    
    const deckSelect = document.createElement('select');
    deckSelect.id = 'onlineDeckSelect';
    deckSelect.style.width = '100%';
    deckSelect.style.padding = '12px';
    deckSelect.style.border = '2px solid #555';
    deckSelect.style.borderRadius = '8px';
    deckSelect.style.fontSize = '16px';
    deckSelect.style.background = '#444';
    deckSelect.style.color = '#fff';
    deckSelect.style.boxSizing = 'border-box';
    deckSelect.style.marginBottom = '10px';
    
    // Populate deck options
    const allDecks = [
      { name: 'Default Deck', cards: [...CARD_LIBRARY], isDefault: true },
      ...customDecks.map(d => ({ ...d, isDefault: false }))
    ];
    
    let selectedDeckIndex = 0;
    allDecks.forEach((deckObj, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = deckObj.name;
      if (deck && deckObj.cards.length === deck.length && 
          JSON.stringify(deckObj.cards.map(c => stripTeam(c))) === JSON.stringify(deck.map(c => stripTeam(c)))) {
        selectedDeckIndex = idx;
        option.selected = true;
      }
      deckSelect.appendChild(option);
    });
    
    deckSelect.value = selectedDeckIndex;
    // Set initial selected deck
    if (deck) {
      selectedDeckForOnline = deck;
    } else {
      selectedDeckForOnline = allDecks[selectedDeckIndex].cards.map(c => stripTeam({ ...c }));
    }
    deckSelect.onchange = () => {
      const idx = parseInt(deckSelect.value);
      selectedDeckForOnline = allDecks[idx].cards.map(c => stripTeam({ ...c }));
    };
    deckContainer.appendChild(deckSelect);
    
    // Create New Deck button
    const createDeckBtn = document.createElement('button');
    createDeckBtn.textContent = '📝 Create New Deck';
    createDeckBtn.style.width = '100%';
    createDeckBtn.style.padding = '10px';
    createDeckBtn.style.marginBottom = '10px';
    createDeckBtn.style.background = '#2196F3';
    createDeckBtn.style.color = '#fff';
    createDeckBtn.style.border = 'none';
    createDeckBtn.style.borderRadius = '8px';
    createDeckBtn.style.fontSize = '16px';
    createDeckBtn.style.cursor = 'pointer';
    createDeckBtn.onclick = () => {
      // Set flag to return to game room modal after deck builder
      returnToGameRoomModal = true;
      // Close modal and show deck builder
      closeGameRoomModal();
      showDeckBuilder();
    };
    deckContainer.appendChild(createDeckBtn);
    modalContent.appendChild(deckContainer);

    // Player name input
    const nameContainer = document.createElement('div');
    nameContainer.style.marginBottom = '20px';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your Name:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '8px';
    nameLabel.style.fontWeight = '600';
    nameLabel.style.color = '#fff';
    nameLabel.style.fontSize = '16px';
    nameContainer.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'playerNameInput';
    nameInput.placeholder = 'Enter your name';
    nameInput.maxLength = '15';
    nameInput.style.width = '100%';
    nameInput.style.padding = '12px';
    nameInput.style.border = '2px solid #555';
    nameInput.style.borderRadius = '8px';
    nameInput.style.fontSize = '16px';
    nameInput.style.background = '#444';
    nameInput.style.color = '#fff';
    nameInput.style.boxSizing = 'border-box';
    nameContainer.appendChild(nameInput);
    modalContent.appendChild(nameContainer);

    // Create Game button
    const createBtn = document.createElement('button');
    createBtn.textContent = '🎮 Create New Game';
    createBtn.style.width = '100%';
    createBtn.style.padding = '15px';
    createBtn.style.marginBottom = '15px';
    createBtn.style.background = '#4CAF50';
    createBtn.style.color = '#fff';
    createBtn.style.border = 'none';
    createBtn.style.borderRadius = '8px';
    createBtn.style.fontSize = '18px';
    createBtn.style.cursor = 'pointer';
    createBtn.style.fontWeight = 'bold';
    createBtn.onclick = () => {
      // Update selected deck from dropdown
      const idx = parseInt(deckSelect.value);
      selectedDeckForOnline = allDecks[idx].cards.map(c => stripTeam({ ...c }));
      if (!selectedDeckForOnline || selectedDeckForOnline.length === 0) {
        alert('Please select a deck before creating a game.');
        return;
      }
      createGameRoom();
    };
    modalContent.appendChild(createBtn);

    // Divider
    const divider = document.createElement('div');
    divider.style.textAlign = 'center';
    divider.style.color = '#888';
    divider.style.fontSize = '14px';
    divider.style.margin = '20px 0';
    divider.textContent = 'OR';
    modalContent.appendChild(divider);

    // Join Game section
    const joinContainer = document.createElement('div');
    joinContainer.style.marginTop = '15px';
    const joinLabel = document.createElement('label');
    joinLabel.textContent = 'Join Game Room:';
    joinLabel.style.display = 'block';
    joinLabel.style.marginBottom = '8px';
    joinLabel.style.fontWeight = '600';
    joinLabel.style.color = '#fff';
    joinLabel.style.fontSize = '16px';
    joinContainer.appendChild(joinLabel);
    
    const roomIdInput = document.createElement('input');
    roomIdInput.type = 'text';
    roomIdInput.id = 'roomIdInput';
    roomIdInput.placeholder = 'Enter Game ID';
    roomIdInput.style.width = '100%';
    roomIdInput.style.padding = '12px';
    roomIdInput.style.border = '2px solid #555';
    roomIdInput.style.borderRadius = '8px';
    roomIdInput.style.fontSize = '16px';
    roomIdInput.style.background = '#444';
    roomIdInput.style.color = '#fff';
    roomIdInput.style.marginBottom = '10px';
    roomIdInput.style.boxSizing = 'border-box';
    joinContainer.appendChild(roomIdInput);
    
    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'Join Game';
    joinBtn.style.width = '100%';
    joinBtn.style.padding = '12px';
    joinBtn.style.marginBottom = '10px';
    joinBtn.style.background = '#2196F3';
    joinBtn.style.color = '#fff';
    joinBtn.style.border = 'none';
    joinBtn.style.borderRadius = '8px';
    joinBtn.style.fontSize = '18px';
    joinBtn.style.cursor = 'pointer';
    joinBtn.onclick = () => {
      // Update selected deck from dropdown
      const idx = parseInt(deckSelect.value);
      selectedDeckForOnline = allDecks[idx].cards.map(c => stripTeam({ ...c }));
      if (!selectedDeckForOnline || selectedDeckForOnline.length === 0) {
        alert('Please select a deck before joining a game.');
        return;
      }
      joinGameRoom();
    };
    joinContainer.appendChild(joinBtn);
    modalContent.appendChild(joinContainer);

    // Status message
    const statusDiv = document.createElement('div');
    statusDiv.id = 'roomStatus';
    statusDiv.style.textAlign = 'center';
    statusDiv.style.padding = '10px';
    statusDiv.style.fontSize = '14px';
    statusDiv.style.color = '#888';
    modalContent.appendChild(statusDiv);

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.width = '100%';
    cancelBtn.style.padding = '12px';
    cancelBtn.style.marginTop = '15px';
    cancelBtn.style.background = '#E74C3C';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.fontSize = '18px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => closeGameRoomModal();
    modalContent.appendChild(cancelBtn);

    gameRoomModal.appendChild(modalContent);
    document.body.appendChild(gameRoomModal);
  }

  function closeGameRoomModal() {
    if (gameRoomModal) {
      gameRoomModal.remove();
      gameRoomModal = null;
    }
  }

  function showWaitingRoom() {
    if (waitingRoomModal) waitingRoomModal.remove();
    
    waitingRoomModal = document.createElement('div');
    waitingRoomModal.style.position = 'fixed';
    waitingRoomModal.style.top = '0';
    waitingRoomModal.style.left = '0';
    waitingRoomModal.style.width = '100vw';
    waitingRoomModal.style.height = '100vh';
    waitingRoomModal.style.background = 'rgba(0,0,0,0.9)';
    waitingRoomModal.style.display = 'flex';
    waitingRoomModal.style.flexDirection = 'column';
    waitingRoomModal.style.alignItems = 'center';
    waitingRoomModal.style.justifyContent = 'center';
    waitingRoomModal.style.zIndex = '4000';
    waitingRoomModal.onclick = (e) => {
      if (e.target === waitingRoomModal) cancelWaitingRoom();
    };

    const modalContent = document.createElement('div');
    modalContent.style.background = 'linear-gradient(180deg, #222 60%, #333 100%)';
    modalContent.style.padding = '40px';
    modalContent.style.borderRadius = '16px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.width = '90%';
    modalContent.style.textAlign = 'center';
    modalContent.onclick = (e) => e.stopPropagation();

    const title = document.createElement('div');
    title.textContent = 'Waiting for Opponent';
    title.style.fontSize = '32px';
    title.style.color = '#fff';
    title.style.marginBottom = '20px';
    modalContent.appendChild(title);

    const shareText = document.createElement('div');
    shareText.textContent = 'Share this Game ID:';
    shareText.style.color = '#fff';
    shareText.style.marginBottom = '15px';
    shareText.style.fontSize = '18px';
    modalContent.appendChild(shareText);

    const idContainer = document.createElement('div');
    idContainer.style.display = 'flex';
    idContainer.style.gap = '10px';
    idContainer.style.marginBottom = '20px';
    idContainer.style.alignItems = 'center';
    
    const roomIdDisplay = document.createElement('input');
    roomIdDisplay.id = 'gameRoomIdDisplay';
    roomIdDisplay.type = 'text';
    roomIdDisplay.value = gameRoomId || '';
    roomIdDisplay.readOnly = true;
    roomIdDisplay.style.flex = '1';
    roomIdDisplay.style.maxWidth = '250px';
    roomIdDisplay.style.padding = '12px';
    roomIdDisplay.style.border = '2px solid #555';
    roomIdDisplay.style.borderRadius = '8px';
    roomIdDisplay.style.fontFamily = 'monospace';
    roomIdDisplay.style.fontSize = '20px';
    roomIdDisplay.style.textAlign = 'center';
    roomIdDisplay.style.background = '#333';
    roomIdDisplay.style.color = '#fff';
    idContainer.appendChild(roomIdDisplay);
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.padding = '12px 20px';
    copyBtn.style.background = '#4CAF50';
    copyBtn.style.color = '#fff';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '8px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.fontSize = '16px';
    copyBtn.onclick = () => {
      roomIdDisplay.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    };
    idContainer.appendChild(copyBtn);
    modalContent.appendChild(idContainer);

    const waitingStatus = document.createElement('div');
    waitingStatus.id = 'waitingStatus';
    waitingStatus.style.textAlign = 'center';
    waitingStatus.style.padding = '20px';
    const spinner = document.createElement('div');
    spinner.style.margin = '20px auto';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.border = '4px solid #333';
    spinner.style.borderTop = '4px solid #4CAF50';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';
    waitingStatus.appendChild(spinner);
    const waitingText = document.createElement('p');
    waitingText.textContent = 'Waiting for another player to join...';
    waitingText.style.color = '#fff';
    waitingText.style.marginTop = '15px';
    waitingStatus.appendChild(waitingText);
    modalContent.appendChild(waitingStatus);

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.width = '100%';
    cancelBtn.style.padding = '12px';
    cancelBtn.style.marginTop = '15px';
    cancelBtn.style.background = '#E74C3C';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.fontSize = '18px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => cancelWaitingRoom();
    modalContent.appendChild(cancelBtn);

    waitingRoomModal.appendChild(modalContent);
    document.body.appendChild(waitingRoomModal);
  }

  function cancelWaitingRoom() {
    if (waitingRoomModal) {
      waitingRoomModal.remove();
      waitingRoomModal = null;
    }
    if (gameRoomModal) {
      gameRoomModal.remove();
      gameRoomModal = null;
    }
    // Clean up Firebase listener
    if (gameUnsubscribe) {
      gameUnsubscribe();
      gameUnsubscribe = null;
    }
    gameRoomId = null;
    myPlayerSide = null;
    gameMode = 'pvai'; // Reset to default
  }

  // Create game room in Firebase
  function createGameRoom() {
    if (!firebaseEnabled) {
      alert('Firebase not available. Please ensure you are accessing via HTTPS.');
      return;
    }

    const nameInput = document.getElementById('playerNameInput');
    myPlayerName = nameInput.value.trim() || 'Player 1';
    if (myPlayerName.length > 15) {
      myPlayerName = myPlayerName.substring(0, 15);
    }

    myPlayerSide = 0; // Creator is always side 0 (player side)
    gameMode = 'online';
    opponentName = 'Waiting...';

    // Reset game state
    board = [
      Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)),
      Array.from({ length: ZONES }, () => Array(SECTIONS).fill(null)),
    ];
    currentPlayer = 0;
    isPlayerTurn = true;
    playerTurns = 0;
    aiTurns = 0;
    gameOver = false;
    playerKnockouts = 0;
    aiKnockouts = 0;

    // Create unique room ID
    createUniqueRoom().then(() => {
      closeGameRoomModal();
      showWaitingRoom();
      listenForPlayerJoin();
      const statusDiv = document.getElementById('roomStatus');
      if (statusDiv) statusDiv.textContent = 'Room created! Share the ID.';
    }).catch(error => {
      console.error('Error creating game room:', error);
      alert('Failed to create game room. Please try again.');
    });
  }

  function createUniqueRoom() {
    const tryCreateRoom = (attempts = 0) => {
      if (attempts > 10) {
        gameRoomId = Date.now().toString();
      } else {
        const roomNumber = Math.floor(100000 + Math.random() * 900000);
        gameRoomId = roomNumber.toString();
      }

      return db.collection('zonesGameRooms').doc(gameRoomId).get().then(doc => {
        if (doc.exists && doc.data().status !== 'finished') {
          if (attempts < 10) {
            return tryCreateRoom(attempts + 1);
          } else {
            gameRoomId = Date.now().toString();
            return createRoomInFirebase();
          }
        } else {
          return createRoomInFirebase();
        }
      });
    };

    return tryCreateRoom();
  }

  function createRoomInFirebase() {
    const gameState = getGameState();
    return db.collection('zonesGameRooms').doc(gameRoomId).set({
      player1: 0,
      player1Name: myPlayerName,
      player2: null,
      player2Name: null,
      gameState: gameState,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'waiting'
    });
  }

  function joinGameRoom() {
    const roomId = document.getElementById('roomIdInput').value.trim();
    if (!roomId) {
      alert('Please enter a Game ID');
      return;
    }

    const nameInput = document.getElementById('playerNameInput');
    myPlayerName = nameInput.value.trim() || 'Player 2';
    if (myPlayerName.length > 15) {
      myPlayerName = myPlayerName.substring(0, 15);
    }

    if (!firebaseEnabled) {
      alert('Firebase not available. Please ensure you are accessing via HTTPS.');
      return;
    }

    gameRoomId = roomId;
    gameMode = 'online';

    db.collection('zonesGameRooms').doc(roomId).get().then(doc => {
      if (!doc.exists) {
        alert('Game room not found. Please check the Game ID.');
        return;
      }

      const data = doc.data();
      if (data.status === 'finished') {
        alert('This game room has already finished.');
        return;
      }

      if (data.player2 !== null) {
        alert('This game room is full.');
        return;
      }

      // Join as player 2
      myPlayerSide = 1;
      opponentName = data.player1Name;

      // Update room with player 2
      db.collection('zonesGameRooms').doc(roomId).update({
        player2: 1,
        player2Name: myPlayerName,
        status: 'active'
      }).then(() => {
        closeGameRoomModal();
        // Start listening to game state
        listenToGameState();
        // Start the game
        startOnlineGame();
      }).catch(error => {
        console.error('Error joining game room:', error);
        alert('Failed to join game room. Please try again.');
      });
    }).catch(error => {
      console.error('Error checking game room:', error);
      alert('Failed to join game room. Please check the Game ID.');
    });
  }

  function listenForPlayerJoin() {
    if (!firebaseEnabled || !gameRoomId) return;

    gameUnsubscribe = db.collection('zonesGameRooms').doc(gameRoomId).onSnapshot(doc => {
      if (!doc.exists) return;

      const data = doc.data();
      if (data.player2 !== null && data.status === 'active') {
        // Player 2 joined!
        opponentName = data.player2Name;
        if (waitingRoomModal) waitingRoomModal.remove();
        // Start listening to game state
        listenToGameState();
        // Start the game
        startOnlineGame();
      }
    }, error => {
      console.error('Error listening for player join:', error);
    });
  }

  function listenToGameState() {
    if (!firebaseEnabled || !gameRoomId) return;

    // Unsubscribe previous listener if exists
    if (gameUnsubscribe) {
      gameUnsubscribe();
    }

    gameUnsubscribe = db.collection('zonesGameRooms').doc(gameRoomId).onSnapshot(doc => {
      if (!doc.exists || isLoadingFromFirebase) return;

      const data = doc.data();
      if (data.gameState) {
        isLoadingFromFirebase = true;
        loadGameStateFromFirebase(data.gameState);
        setTimeout(() => {
          isLoadingFromFirebase = false;
        }, 100);
      }
    }, error => {
      console.error('Error listening to game state:', error);
    });
  }

  function getGameState() {
    return {
      board: JSON.parse(JSON.stringify(board)),
      currentPlayer: currentPlayer,
      isPlayerTurn: isPlayerTurn,
      playerHand: playerHand.map(c => stripTeam(c)),
      player2Hand: player2Hand.map(c => stripTeam(c)),
      deck: deck.map(c => stripTeam(c)),
      playerTurns: playerTurns,
      aiTurns: aiTurns,
      gameOver: gameOver,
      playerKnockouts: playerKnockouts,
      aiKnockouts: aiKnockouts,
      selectedCharacter: selectedCharacter,
      selectedCard: selectedCard ? stripTeam(selectedCard) : null,
      selectedTargets: selectedTargets
    };
  }

  function loadGameStateFromFirebase(gameState) {
    board = gameState.board || board;
    currentPlayer = gameState.currentPlayer !== undefined ? gameState.currentPlayer : currentPlayer;
    isPlayerTurn = gameState.isPlayerTurn !== undefined ? gameState.isPlayerTurn : isPlayerTurn;
    playerHand = gameState.playerHand || playerHand;
    player2Hand = gameState.player2Hand || player2Hand;
    deck = gameState.deck || deck;
    playerTurns = gameState.playerTurns || playerTurns;
    aiTurns = gameState.aiTurns || aiTurns;
    gameOver = gameState.gameOver || gameOver;
    playerKnockouts = gameState.playerKnockouts || playerKnockouts;
    aiKnockouts = gameState.aiKnockouts || aiKnockouts;
    selectedCharacter = gameState.selectedCharacter || selectedCharacter;
    selectedCard = gameState.selectedCard || selectedCard;
    selectedTargets = gameState.selectedTargets || selectedTargets;

    // Redraw the board
    drawBoard();
    updateStats();
    
    // Update start button state
    if (startButton) {
      startButton.disabled = !isPlayerTurn || gameOver;
      startButton.style.backgroundColor = (!isPlayerTurn || gameOver) ? '#888' : '#4CAF50';
    }
  }

  function syncGameStateToFirebase() {
    if (!firebaseEnabled || !gameRoomId || isLoadingFromFirebase) return;

    const gameState = getGameState();
    db.collection('zonesGameRooms').doc(gameRoomId).update({
      gameState: gameState,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
      console.error('Error syncing game state:', error);
    });
  }

  function startOnlineGame() {
    // Close any modals
    if (gameRoomModal) gameRoomModal.remove();
    if (waitingRoomModal) waitingRoomModal.remove();

    // Initialize game with selected deck
    deck = selectedDeckForOnline ? [...selectedDeckForOnline] : [...CARD_LIBRARY];
    player2Hand = [...deck];
    
    // Hide title screen, show game
    titleScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');
    
    // Initialize game (only if we're the creator - joiner will get state from Firebase)
    if (myPlayerSide === 0) {
      initGame();
      // Sync initial state to Firebase
      if (firebaseEnabled) {
        syncGameStateToFirebase();
      }
    } else {
      // Player 2: wait for initial state from Firebase (already listening)
      // Just initialize empty state, Firebase will populate it
      initGame();
    }
    
    // Start game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // ===== END ONLINE MULTIPLAYER FUNCTIONS =====
});