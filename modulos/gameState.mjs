import {
  KEY_CODE_LEFT,
  KEY_CODE_RIGHT,
  KEY_CODE_SPACE,
  KEY_CODE_P,
  KEY_CODE_R,
  KEY_CODE_G,
  GAME_WIDTH,
  CANNON_WIDTH,
  CSHOT_COOLDOWN,
  ALIENS_PER_COLUMN,
  cssFiles,
} from "./constants.mjs";

// Preload image and audio files
const cannonImage = new Image();
cannonImage.src = "images/cannon.png";
const cannonShotImage = new Image();
cannonShotImage.src = "images/cannonShot.png";
const alienShotImage = new Image();
alienShotImage.src = "images/alienShot.png";
const lowAlienImage = new Image();
lowAlienImage.src = "images/lowAlien.gif";
const midAlienImage = new Image();
midAlienImage.src = "images/midAlien.gif";
const highAlienImage = new Image();
highAlienImage.src = "images/higAlien.gif";

const cannonShotAudio = new Audio("sounds/fire1.wav");
const alienShotAudio = new Audio("sounds/alienFire.wav");
const hitAudio = new Audio("sounds/hit.wav");

const beat = new Audio();
beat.preload = "auto"; // Set preload to "auto" for full audio loading
let tune = [
  "sounds/tune1.wav",
  "sounds/tune2.wav",
  "sounds/tune3.wav",
  "sounds/tune4.wav",
];
let timeoutId;
let notes = 0;

// Game state object
export const GAME_STATE = {
  lastTime: Date.now(),
  leftPressed: false,
  rightPressed: false,
  spacePressed: false,
  cannonX: 0,
  cannonY: 0,
  cannonCooldown: 0,
  cShots: [],
  aliens: [],
  alienDirection: 1, // 1 for right, -1 for left
  currentAlien: 0, // index of the current alien to move
  moveDown: false, // whether the aliens need to move down on the next move
  alienShots: [],
  score: 0,
  hiScore: 0,
  lives: 3,
  level: 1,
  totalSeconds: 0,
  timerInterval: null,
  isPaused: false,
  startTime: null,
};

// Function to update the score display on the GUI
export const updateScoreDisplay = () => {
  const scoreSpan = document.getElementById("scoreSpan");
  scoreSpan.textContent = GAME_STATE.score;
  if (GAME_STATE.score > GAME_STATE.hiScore) {
    GAME_STATE.hiScore = GAME_STATE.score;
    const hiScoreSpan = document.getElementById("hiScoreSpan");
    hiScoreSpan.textContent = GAME_STATE.hiScore;
  }
};

// Function to update the level display on the GUI
export const updateLevelDisplay = () => {
  const levelSpan = document.getElementById("levelSpan");
  levelSpan.textContent = GAME_STATE.level; // Update level display with current level
};
const updateLivesDisplay = () => {
  const livesSpan = document.getElementById("livesSpan");
  livesSpan.textContent = GAME_STATE.lives;
};

// Function to update the cannon position
export const updateCannon = (dt, $container) => {
  const speed = 60; // Adjust this value to change the speed of the cannon
  if (GAME_STATE.leftPressed && !GAME_STATE.isCannonHit) {
    GAME_STATE.cannonX -= Math.round(speed * dt);
  }
  if (GAME_STATE.rightPressed && !GAME_STATE.isCannonHit) {
    GAME_STATE.cannonX += Math.round(speed * dt);
  }

  GAME_STATE.cannonX = clamp(
    GAME_STATE.cannonX,
    CANNON_WIDTH,
    GAME_WIDTH - CANNON_WIDTH
  );

  if (
    GAME_STATE.spacePressed &&
    GAME_STATE.cannonCooldown <= 0 &&
    !GAME_STATE.isCannonHit
  ) {
    createCShot($container, GAME_STATE.cannonX, GAME_STATE.cannonY);
    GAME_STATE.cannonCooldown = CSHOT_COOLDOWN;
  }

  if (GAME_STATE.cannonCooldown > 0) {
    GAME_STATE.cannonCooldown -= dt;
  }

  const cannon = document.querySelector(".cannon");
  cannon.style.left = `${GAME_STATE.cannonX}%`;
  cannon.style.bottom = `${GAME_STATE.cannonY}%`;
};

// Function to create a cannon shot
export const createCShot = ($container, x, y) => {
  if (GAME_STATE.cannonCooldown > 0) {
    return;
  }

  const $cannonShot = document.createElement("img");
  $cannonShot.src = cannonShotImage.src;
  $cannonShot.className = "cannonShot";
  $container.appendChild($cannonShot);

  const cShot = {
    x,
    y,
    $element: $cannonShot,
    speed: 6,
  };

  GAME_STATE.cShots.push(cShot);

  cannonShotAudio.cloneNode().play();
};

// Function to destroy a cannon shot
export const destroyCShot = (cShot) => {
  const index = GAME_STATE.cShots.findIndex((shot) => shot === cShot);
  if (index === -1) {
    return;
  }

  GAME_STATE.cShots.splice(index, 1);

  const $cannonShot = cShot.$element;
  $cannonShot.remove();
};

// Function to create an alien shot
export const createAlienShot = ($container, x, y) => {
  const $alienShot = document.createElement("img");
  $alienShot.src = alienShotImage.src;
  $alienShot.className = "alienShot";
  $container.appendChild($alienShot);

  const alienShot = {
    x,
    y,
    $element: $alienShot,
    speed: 2,
  };

  GAME_STATE.alienShots.push(alienShot);

  alienShotAudio.cloneNode().play();
};

// Function to destroy an alien shot
export const destroyAlienShot = (alienShot) => {
  const index = GAME_STATE.alienShots.findIndex((shot) => shot === alienShot);
  if (index === -1) {
    return;
  }

  GAME_STATE.alienShots.splice(index, 1);

  const $alienShot = alienShot.$element;
  $alienShot.remove();
};

// Function to destroy an alien
export const destroyAlien = ($alien) => {
  const index = GAME_STATE.aliens.findIndex(
    (alien) => alien.$element === $alien
  );
  if (index === -1) {
    return;
  }

  GAME_STATE.aliens.splice(index, 1);

  const $alien = $alien;
  $alien.remove();
};

// Function to update the position of a cannon shot
export const updateCShot = (cShot, dt) => {
  if (!cShot) {
    return;
  }

  cShot.y -= cShot.speed * dt;

  cShot.$element.style.top = `${cShot.y}%`;

  const aliens = GAME_STATE.aliens;
  for (let i = 0; i < aliens.length; i++) {
    const alien = aliens[i];
    if (alien.isDead) continue;

    if (
      cShot.x >= alien.x &&
      cShot.x <= alien.x + alien.width &&
      cShot.y >= alien.y &&
      cShot.y <= alien.y + alien.height
    ) {
      hitAudio.cloneNode().play();
      alien.isDead = true;
      destroyCShot(cShot);
      GAME_STATE.score += 10;
      updateScoreDisplay();
      if (GAME_STATE.aliens.every((alien) => alien.isDead)) {
        goToNextLevel();
      }
      break;
    }
  }

  if (cShot.y < 0) {
    destroyCShot(cShot);
  }
};

// Function to update the position of an alien shot
export const updateAlienShot = (alienShot, dt) => {
  if (!alienShot) {
    return;
  }

  alienShot.y += alienShot.speed * dt;

  alienShot.$element.style.top = `${alienShot.y}%`;

  const cannon = document.querySelector(".cannon");
  if (
    alienShot.x >= cannon.offsetLeft &&
    alienShot.x <= cannon.offsetLeft + cannon.offsetWidth &&
    alienShot.y >= cannon.offsetTop &&
    alienShot.y <= cannon.offsetTop + cannon.offsetHeight
  ) {
    hitAudio.cloneNode().play();
    GAME_STATE.lives--;
    updateLivesDisplay();
    if (GAME_STATE.lives === 0) {
      endGame();
    }
    destroyAlienShot(alienShot);
    return;
  }

  const cannonShots = GAME_STATE.cShots;
  for (let i = 0; i < cannonShots.length; i++) {
    const cannonShot = cannonShots[i];
    if (cannonShot.isDead) continue;

    if (
      alienShot.x >= cannonShot.x &&
      alienShot.x <= cannonShot.x + CANNON_WIDTH &&
      alienShot.y >= cannonShot.y &&
      alienShot.y <= cannonShot.y + CANNON_WIDTH
    ) {
      hitAudio.cloneNode().play();
      cannonShot.isDead = true;
      destroyAlienShot(alienShot);
      break;
    }
  }
};

// Function to move the aliens down
export const moveAliensDown = () => {
  const aliens = GAME_STATE.aliens;
  for (let i = 0; i < aliens.length; i++) {
    const alien = aliens[i];
    alien.y += 1;
    alien.$element.style.top = `${alien.y}%`;
  }
};

// Function to move the aliens to the right or left
export const moveAliens = (direction) => {
  const aliens = GAME_STATE.aliens;
  for (let i = 0; i < aliens.length; i++) {
    const alien = aliens[i];
    alien.x += direction;
    alien.$element.style.left = `${alien.x}%`;
  }
};

// Function to update the game state
// Function to update the game state
export const update = (dt) => {
  if (GAME_STATE.isPaused) {
    return;
  }

  updateCannon(dt, document.querySelector(".game-container"));

  for (let i = 0; i < GAME_STATE.cShots.length; i++) {
    const cShot = GAME_STATE.cShots[i];
    updateCShot(cShot, dt);
  }

  for (let i = 0; i < GAME_STATE.alienShots.length; i++) {
    const alienShot = GAME_STATE.alienShots[i];
    updateAlienShot(alienShot, dt);
  }

  if (GAME_STATE.moveDown) {
    moveAliensDown();
    if (GAME_STATE.aliens[0].y + GAME_STATE.aliens[0].height >= GAME_HEIGHT) {
      endGame();
    }
  }

  if (GAME_STATE.aliens.every((alien) => alien.x + alien.width < 0)) {
    moveAliens(GAME_STATE.alienDirection);
    GAME_STATE.alienDirection *= -1;
  }
};

// Function to update the game state on a loop
export const updateLoop = () => {
  const now = Date.now();
  const dt = (now - GAME_STATE.lastTime) / 1000;
  update(dt);
  GAME_STATE.lastTime = now;
  requestAnimationFrame(updateLoop);
};

// Function to initialize the game state
export const init = () => {
  GAME_STATE.lastTime = Date.now();
  GAME_STATE.leftPressed = false;
  GAME_STATE.rightPressed = false;
  GAME_STATE.spacePressed = false;
  GAME_STATE.cannonX = GAME_WIDTH / 2;
  GAME_STATE.cannonY = GAME_HEIGHT - CANNON_HEIGHT - 10;
  GAME_STATE.cannonCooldown = 0;
  GAME_STATE.cShots = [];
  GAME_STATE.aliens = [];
  GAME_STATE.alienDirection = 1;
  GAME_STATE.currentAlien = 0;
  GAME_STATE.moveDown = false;
  GAME_STATE.alienShots = [];
  GAME_STATE.score = 0;
  GAME_STATE.hiScore = 0;
  GAME_STATE.lives = 3;
  GAME_STATE.level = 1;
  GAME_STATE.totalSeconds = 0;
  GAME_STATE.timerInterval = null;
  GAME_STATE.isPaused = false;
  GAME_STATE.startTime = null;

  document.querySelector(".game-container").innerHTML = "";

  for (let i = 0; i < ALIENS_PER_COLUMN; i++) {
    createAlien(document.querySelector(".game-container"), i * ALIEN_WIDTH, 10);
  }

  requestAnimationFrame(updateLoop);
};

// Function to go to the next level
const goToNextLevel = () => {
  ALIENS_PER_COLUMN++;
  GAME_STATE.level++;
  GAME_STATE.score += 100;
  updateScoreDisplay();
  updateLevelDisplay();
  document.querySelector(".game-container").innerHTML = "";

  for (let i = 0; i < ALIENS_PER_COLUMN; i++) {
    createAlien(document.querySelector(".game-container"), i * ALIEN_WIDTH, 10);
  }
};

// Function to update the score display on the GUI
const updateScoreDisplay = () => {
  const scoreSpan = document.getElementById("scoreSpan");
  scoreSpan.textContent = GAME_STATE.score;
};

// Function to update the level display on the GUI
const updateLevelDisplay = () => {
  const levelSpan = document.getElementById("levelSpan");
  levelSpan.textContent = GAME_STATE.level;
};

// Function to update the total seconds display on the GUI
const updateTotalSecondsDisplay = () => {
  const totalSecondsSpan = document.getElementById("totalSecondsSpan");
  totalSecondsSpan.textContent = GAME_STATE.totalSeconds.toFixed(2);
};

// Function to end the game
const endGame = () => {
  GAME_STATE.isPaused = true;
  clearInterval(GAME_STATE.timerInterval);

  const gameOverModal = document.getElementById("gameOverModal");
  gameOverModal.style.display = "block";

  const finalScore = document.getElementById("finalScore");
  finalScore.textContent = GAME_STATE.score;
};

// Function to reset the game
const resetGame = () => {
  GAME_STATE.isPaused = false;
  GAME_STATE.leftPressed = false;
  GAME_STATE.rightPressed = false;
  GAME_STATE.spacePressed = false;
  GAME_STATE.cannonX = GAME_WIDTH / 2;
  GAME_STATE.cannonY = GAME_HEIGHT - CANNON_HEIGHT - 10;
  GAME_STATE.cannonCooldown = 0;
  GAME_STATE.cShots = [];
  GAME_STATE.aliens = [];
  GAME_STATE.alienDirection = 1;
  GAME_STATE.currentAlien = 0;
  GAME_STATE.moveDown = false;
  GAME_STATE.alienShots = [];
  GAME_STATE.score = 0;
  GAME_STATE.hiScore = 0;
  GAME_STATE.lives = 3;
  GAME_STATE.level = 1;
  GAME_STATE.totalSeconds = 0;
  GAME_STATE.timerInterval = null;

  document.querySelector(".game-container").innerHTML = "";

  for (let i = 0; i < ALIENS_PER_COLUMN; i++) {
    createAlien(document.querySelector(".game-container"), i * ALIEN_WIDTH, 10);
  }

  requestAnimationFrame(updateLoop);

  const gameOverModal = document.getElementById("gameOverModal");
  gameOverModal.style.display = "none";
};

// Function to play the next tune
const playNextTune = () => {
  const nextTune = tune[notes];
  beat.src = nextTune;
  beat.play();
  notes = (notes + 1) % tune.length;
};

// Function to update the game state on a loop
const updateLoop = () => {
  const now = Date.now();
  const dt = (now - GAME_STATE.lastTime) / 1000;
  update(dt);
  GAME_STATE.lastTime = now;

  if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit) {
    GAME_STATE.timerInterval = setInterval(() => {
      GAME_STATE.totalSeconds += dt;
      updateTotalSecondsDisplay();
    }, 100);
  }

  if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit && notes < tune.length) {
    timeoutId = setTimeout(() => {
      playNextTune();
    }, GAME_STATE.aliens.length * 200 + 500);
  }

  requestAnimationFrame(updateLoop);
};
