const KEY_CODE_LEFT = 37;
const KEY_CODE_RIGHT = 39;
const KEY_CODE_SPACE = 32;
const KEY_CODE_P = 80;
const KEY_CODE_R = 82;
const KEY_CODE_G = 71;
const GAME_WIDTH = 100;
// const GAME_HEIGHT = 100;
const CANNON_WIDTH = 7;
const CSHOT_COOLDOWN = 0.4;
let ALIENS_PER_COLUMN = 11;
// const MAX_LEVEL = 5;

// stylesheet variables
let cssFiles = ['style.css', 'style2.css', 'style3.css', 'style4.css'];
let currentFile = 0;

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
const GAME_STATE = {
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

export const playNextAsync = () => {
  return new Promise((resolve) => {
    if (notes < tune.length) {
      // console.log(`notes: ${notes}`);
      beat.src = tune[notes];
      if (!beat.paused) {
        beat.pause(); // Stop existing playback
      }
      // remove the below playPromise line to test performance without this audio
      const playPromise = beat.play();

      if (playPromise !== undefined) {
        playPromise
          .then((_) => {
            // Automatic playback started!
            // Show playing UI.
            notes++;
            timeoutId = setTimeout(() => {
              if (!GAME_STATE.isPaused) {
                resolve(playNextAsync());
              }
            }, GAME_STATE.aliens.length * 20 + 50);
          })
          .catch((error) => {
            // Auto-play was prevented
            // Show paused UI.
            console.log("Playback was prevented.");
          });
      }
    } else {
      notes = 0;
      if (!GAME_STATE.isPaused) {
        resolve(playNextAsync());
      }
    }
  });
};

export const rectsIntersect = (r1, r2) => {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
};

export const setPosition = ($element, x, y) => {
  if ($element && $element.style) {
    // Check if $element is valid
    $element.style.left = `${x}%`;
    $element.style.bottom = `${y}%`;
  } else {
    console.log("$element is not a valid DOM element");
  }
};

export const clamp = (v, min, max) => {
  if (v < min) {
    return min;
  } else if (v > max) {
    return max;
  } else {
    return v;
  }
};

export const startTimer = () => {
  const currentTime = Date.now();
  if (!GAME_STATE.isPaused) {
    // Adjust the start time based on the total elapsed time and the time spent paused
    const elapsedPausedTime = GAME_STATE.isPaused
      ? currentTime - GAME_STATE.pauseStartTime
      : 0;
    GAME_STATE.startTime =
      currentTime - GAME_STATE.totalSeconds * 1000 - elapsedPausedTime;
  }
  GAME_STATE.timerInterval = setInterval(() => {
    if (!GAME_STATE.isPaused) {
      // Calculate elapsed time in seconds, considering time spent paused
      const elapsedSeconds = Math.floor(
        (Date.now() - GAME_STATE.startTime) / 1000
      );
      // Update totalSeconds, accounting for time spent paused
      GAME_STATE.totalSeconds = elapsedSeconds;
      // Update the timer display
      updateTimerDisplay();
    }
  }, 1000); // Update every second
};

export const updateTimerDisplay = () => {
  const minutes = Math.floor(GAME_STATE.totalSeconds / 60)
    .toString()
    .padStart(2, "0"); // Format minutes with leading zero
  const seconds = (GAME_STATE.totalSeconds % 60).toString().padStart(2, "0"); // Format seconds with leading zero
  const timerSpan = document.getElementById("timerSpan");
  timerSpan.textContent = `${minutes}:${seconds}`; // Update timer display with formatted minutes and seconds
  console.log(timerSpan);
};

export const createCannon = ($container) => {
  GAME_STATE.cannonX = GAME_WIDTH / 2; // in the middle of the square container
  GAME_STATE.cannonY = 4; // near the bottom of the square container
  const $cannon = document.createElement("img");
  $cannon.src = cannonImage.src;
  $cannon.className = "cannon";
  $container.appendChild($cannon);
  setPosition($cannon, GAME_STATE.cannonX, GAME_STATE.cannonY);
};

export const createAlien = ($container, x, y) => {
  const $element = document.createElement("img");
  $element.src = lowAlienImage.src;
  if (GAME_STATE.aliens.length + 1 > ALIENS_PER_COLUMN * 4) {
    $element.src = highAlienImage.src;
  } else if (GAME_STATE.aliens.length +1 > ALIENS_PER_COLUMN * 2)  {
    $element.src = midAlienImage.src;
  }
  $element.className = "lowAlien";
  $container.appendChild($element);
  const alien = {
    x,
    y,
    $element,
  };
  GAME_STATE.aliens.push(alien);
  setPosition($element, x, y);
};

export const createCShot = ($container, x, y) => {
  const $element = document.createElement("img");
  $element.src = cannonShotImage.src;
  $element.className = "cannonShot";
  $container.appendChild($element);
  const cShot = { x, y, $element };
  GAME_STATE.cShots.push(cShot);
  setPosition($element, x, y);
  cannonShotAudio.cloneNode().play();
};

export const createAlienShot = ($container, x, y) => {
  const $element = document.createElement("img");
  $element.src = alienShotImage.src;
  $element.className = "alienShot";
  $container.appendChild($element);
  const alienShot = { x, y, $element };
  GAME_STATE.alienShots.push(alienShot);
  setPosition($element, x, y);
  if (GAME_STATE.cannonX != 50 || GAME_STATE.score > 0) {
    alienShotAudio.cloneNode().play();
  }
};

export const destroyCShot = ($container, cShot) => {
  if ($container.contains(cShot.$element)) {
    // Check if the element is a child of the container
    $container.removeChild(cShot.$element);
    cShot.isDead = true;
  }
};

export const destroyAlienShot = ($container, alienShot) => {
  if ($container.contains(alienShot.$element)) {
    // Check if the element is a child of the container
    $container.removeChild(alienShot.$element);
    alienShot.isDead = true;
  }
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
export const updateLivesDisplay = () => {
  const livesSpan = document.getElementById("livesSpan");
  livesSpan.textContent = GAME_STATE.lives;
};

export const destroyAlien = ($container, alien) => {
  if ($container.contains(alien.$element)) {
    // Check if the element is a child of the container
    $container.removeChild(alien.$element);
    alien.isDead = true;
    GAME_STATE.score += 30; // Increment the score by 30 when an alien is destroyed
    updateScoreDisplay(); // Update the score display
    // console.log(`No. of aliens remaining: ${GAME_STATE.aliens.length}`);
  }
};

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

  const $cannon = document.querySelector(".cannon");
  setPosition($cannon, GAME_STATE.cannonX, GAME_STATE.cannonY);
};

export const updateCShots = ($container) => {
  const cShots = GAME_STATE.cShots;
  const aliens = GAME_STATE.aliens;
  const bottomAlien = aliens[0];
  const topAlien = aliens[aliens.length - 1];

  for (let i = 0; i < cShots.length; i++) {
    const cShot = cShots[i];
    cShot.y += 2;
    if (cShot.y > 100) {
      destroyCShot($container, cShot);
    }
    setPosition(cShot.$element, cShot.x, cShot.y);

    // Only check for collisions if the cannon shot is within the vertical range of the aliens
    if (cShot.y >= bottomAlien.y - 2 && cShot.y <= topAlien.y + 2) {
      const r1 = cShot.$element.getBoundingClientRect();
      for (let j = 0; j < aliens.length; j++) {
        const alien = aliens[j];
        if (alien.isDead) continue;
        const r2 = alien.$element.getBoundingClientRect();
        if (rectsIntersect(r1, r2)) {
          // Alien was hit
          destroyAlien($container, alien);
          destroyCShot($container, cShot);
          hitAudio.cloneNode().play();
          break;
        }
      }
    }
  }
  GAME_STATE.cShots = GAME_STATE.cShots.filter((e) => !e.isDead);
};

export const updateAliens = () => {
  const aliens = GAME_STATE.aliens;
  if (aliens.length === 0) {
    return;
  }

  // Ensure currentAlien is a valid index of the aliens array
  if (GAME_STATE.currentAlien >= aliens.length) {
    GAME_STATE.currentAlien = 0;
  }

  // Get the current alien to move
  const alien = aliens[GAME_STATE.currentAlien];

  // console.log(`Moving alien ${GAME_STATE.currentAlien}:`, alien); // Log the current alien

  // Calculate the new position
  let x = alien.x;
  let y = alien.y;
  if (GAME_STATE.moveDown) {
    // Move all aliens down by 7%
    for (let i = 0; i < aliens.length; i++) {
      aliens[i].y -= 7;
      if (aliens[i].y < 5) {
        endGame();
      }
      setPosition(aliens[i].$element, aliens[i].x, aliens[i].y);
    }
    GAME_STATE.moveDown = false; // Reset moveDown for the next move
    // move the current alien
    y -= 7;
    x += GAME_STATE.alienDirection; // Move left or right by 1%
  } else {
    x += GAME_STATE.alienDirection; // Move left or right by 1%
  }

  // Update the alien's position in the GAME_STATE.aliens array
  alien.x = x;
  alien.y = y;

  // Update the alien's position
  setPosition(alien.$element, x, y);

  // Move to the next alien
  GAME_STATE.currentAlien = GAME_STATE.currentAlien + 1;

  // If all aliens have moved one step, reset currentAlien to 0
  if (GAME_STATE.currentAlien === 0 && GAME_STATE.moveDown) {
    GAME_STATE.currentAlien = 0;
  }

  // Check if the aliens have reached the edge of the play area
  if (x >= 94 || x <= 6) {
    GAME_STATE.alienDirection *= -1; // Change direction
    GAME_STATE.moveDown = true; // Move down on the next move
  }
  // Filter out any dead aliens
  GAME_STATE.aliens = GAME_STATE.aliens.filter((e) => !e.isDead);

  goToNextLevel();
};

// Define a new state variable to track level transition
let isTransitioningLevel = false;

// Update the goToNextLevel function to handle level transition synchronization
export const goToNextLevel = () => {
  if (!isTransitioningLevel && GAME_STATE.aliens.length === 0) {
    isTransitioningLevel = true; // Set transitioning flag to true
    GAME_STATE.level++; // Increment the level
    const $container = document.querySelector(".square");
    $container.innerHTML = ""; // Clear container

    beat.pause();
    beat.currentTime = 0;
    clearTimeout(timeoutId);

    // reset timer variables
    GAME_STATE.timerInterval = null;

    let framesWaited = 0;
    const waitFrames = () => {
      framesWaited++;
      if (framesWaited < 60) {
        // Wait for 60 frames (approximately 1 second)
        requestAnimationFrame(waitFrames);
      } else {
        // Reinitialize the game after waiting for 60 frames
        init();
        isTransitioningLevel = false; // Reset transitioning flag
      }
    };
    requestAnimationFrame(waitFrames);
  }
};

export const getOverlappingBullet = () => {
  if (GAME_STATE.aliens.length > 0) {
    const r1 = document.querySelector(".cannon").getBoundingClientRect();
    for (let i = 0; i < GAME_STATE.alienShots.length; i++) {
      const alienShot = GAME_STATE.alienShots[i];
      const r2 = alienShot.$element.getBoundingClientRect();
      if (rectsIntersect(r1, r2)) {
        return alienShot; // Return the overlapping alien shot
      }
    }
    return null; // Return null if no overlapping alien shot is found
  }
};

export const updateAlienShots = ($container) => {
  if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit) {
    // Check if the game is not paused and the cannon is not hit
    const alienShots = GAME_STATE.alienShots;
    for (let i = 0; i < alienShots.length; i++) {
      const alienShot = alienShots[i];
      alienShot.y -= 1;
      if (alienShot.y < 1) {
        destroyAlienShot($container, alienShot);
      }
      setPosition(alienShot.$element, alienShot.x, alienShot.y);
    }
    const overlappingBullet = getOverlappingBullet(); // Get overlapping alien shot
    if (overlappingBullet) {
      // Cannon was hit
      GAME_STATE.lives--; // Decrease the number of lives
      updateLivesDisplay(); // Update the lives display
      destroyAlienShot($container, overlappingBullet);

      // Change the cannon image to cannonExplode1.png
      const cannon = document.querySelector(".cannon");
      cannon.src = "images/cannonExplode.gif";

      // Pause the game for one second
      GAME_STATE.isCannonHit = true;
      const audio = new Audio("sounds/explode.wav");
      if (GAME_STATE.cannonX != 50 || GAME_STATE.score > 0) {
        audio.play();
      }
      setTimeout(() => {
        GAME_STATE.cannonX = GAME_WIDTH / 2;
        cannon.src = "images/cannon.png"; // Change the cannon image back to cannon.png
        GAME_STATE.isCannonHit = false;
      }, 1000);

      if (GAME_STATE.lives < 1) {
        endGame(); // End the game if no lives remaining
        return; // Stop further processing if the game is over
      }
    }
    GAME_STATE.alienShots = GAME_STATE.alienShots.filter((e) => !e.isDead);
  }
};

export const createAlienShotInterval = () => {
  setInterval(() => {
    if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit) {
      // Check if the game is not paused and the cannon is not hit
      const randomAlienIndex = Math.floor(
        Math.random() * GAME_STATE.aliens.length
      );
      const randomAlien = GAME_STATE.aliens[randomAlienIndex];
      if (randomAlien && !randomAlien.isDead) {
        const x = randomAlien.x;
        const y = randomAlien.y;
        createAlienShot(document.querySelector(".square"), x, y);
      }
    }
  }, 900); // Adjust the interval as needed
};

let animationFrameId;
// Function to end the game
export const endGame = () => {
  // Save the updated high score to local storage
  localStorage.setItem("hiScore", GAME_STATE.hiScore);

  GAME_STATE.isPaused = true;
  cancelAnimationFrame(animationFrameId);
  clearInterval(GAME_STATE.timerInterval);

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";

  const gameOverMessage = document.createElement("div");
  gameOverMessage.textContent = "GAME OVER";
  gameOverMessage.className = "game-over-message";

  modalOverlay.appendChild(gameOverMessage);

  const restartButton = document.createElement("img");
  restartButton.src = "./images/keyboard/reset.png";
  restartButton.id = "restart-btn";
  modalOverlay.appendChild(restartButton);

  // Event listener for the restart button
  restartButton.addEventListener("click", () => {
    location.reload();
  });

  document.body.appendChild(modalOverlay);
};

export const update = () => {
  if (!GAME_STATE.isPaused && !isTransitioningLevel) {
    const currentTime = Date.now();
    let dt = (currentTime - GAME_STATE.lastTime) / 1000;

    // Limit the maximum value of dt to prevent "jumps"
    dt = Math.min(dt, 1 / 60); // 60 = game's frame rate

    // Update totalSeconds
    GAME_STATE.totalSeconds += dt;

    const $container = document.querySelector(".square");
    updateCannon(dt, $container);
    updateCShots($container);
    updateAlienShots($container);
    updateAliens();

    GAME_STATE.lastTime = currentTime;
  }

  // Adjust the game loop to use requestAnimationFrame only when the game is not paused
  if (!GAME_STATE.isPaused && !isTransitioningLevel) {
    window.requestAnimationFrame(update);
  }
};

// Function to initialize the game
export const init = async () => {
  // Retrieve the high score from local storage (if available)
  const storedHiScore = localStorage.getItem("hiScore");
  GAME_STATE.hiScore = storedHiScore ? parseInt(storedHiScore, 10) : 0;
  const hiScoreSpan = document.getElementById("hiScoreSpan");
  hiScoreSpan.textContent = GAME_STATE.hiScore;

  const $container = document.querySelector(".square");
  createCannon($container); // Create cannon

  const numRows = 5;
  const alienXSpacing = 7;
  const alienYSpacing = 7;
  const totalAliens = numRows * ALIENS_PER_COLUMN;
  const frameDelay = 16.66; // Delay in milliseconds

  for (let j = 0; j < numRows; j++) {
    for (let i = 1; i < ALIENS_PER_COLUMN + 1; i++) {
      setTimeout(() => {
        const y = 61 - GAME_STATE.level * 8 + j * alienYSpacing;
        const x = i * alienXSpacing;
        createAlien($container, x, y); // Create aliens
      }, frameDelay * (j * ALIENS_PER_COLUMN + i));
    }
  }

  setTimeout(() => {
    createAlienShotInterval(); // Create alien shot interval
    startTimer(); // Start timer

    updateLivesDisplay(); // Update lives display
    updateLevelDisplay(); // Update level display

    window.requestAnimationFrame(update); // Start game loop

    if (GAME_STATE.level > 1) {
      playNextAsync();
    }
  }, frameDelay * totalAliens);
};

// Event listener for the restart button
document.getElementById("restart-btn").addEventListener("click", () => {
  location.reload();
});

// Event listener for the pause button
document.getElementById("pause-btn").addEventListener("click", () => {
  togglePause();
});
// Function to toggle pause/resume
export const togglePause = () => {
  const pauseBtn = document.getElementById("pause-btn");
  if (GAME_STATE.isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
};

// Function to switch between stylesheets to alter visuals for performance
export const toggleCSS = () => {
  currentFile = (currentFile + 1) % cssFiles.length;
  document.getElementById('my-css').href = cssFiles[currentFile];
};

// Function to pause the game
export const pauseGame = () => {
  if (!GAME_STATE.isPaused) {
    GAME_STATE.isPaused = true;
    const pauseBtn = document.getElementById("pause-btn");
    const pauseResumeText = document.getElementById("pause-resume-text");
    const img = pauseBtn.querySelector("img");
    img.src = "images/keyboard/play_T.png"; // Update the image source to the play image
    pauseResumeText.textContent = "RESUME";
    clearInterval(GAME_STATE.timerInterval); // Pause the timer
    cancelAnimationFrame(animationFrameId); // Pause the game loop
  }
};

// Function to resume the game
export const resumeGame = () => {
  if (GAME_STATE.isPaused && GAME_STATE.lives > 0 && GAME_STATE.aliens[0].y > 4) {
    GAME_STATE.isPaused = false;
    const pauseBtn = document.getElementById("pause-btn");
    const pauseResumeText = document.getElementById("pause-resume-text");
    const img = pauseBtn.querySelector("img");
    img.src = "images/keyboard/pause_T.png"; // Update the image source to the pause image
    pauseResumeText.textContent = "PAUSE";
    startTimer(); // Resume the timer
    window.requestAnimationFrame(update); // Resume the game loop

    // Dispatch the 'gameResumed' event
    document.dispatchEvent(new Event("gameResumed"));
  }
};

export const onKeyDown = (e) => {
  // console.log(`Key pressed: ${e.keyCode}`);
  if (e.keyCode === KEY_CODE_LEFT) {
    GAME_STATE.leftPressed = true;
  } else if (e.keyCode === KEY_CODE_RIGHT) {
    GAME_STATE.rightPressed = true;
  } else if (e.keyCode === KEY_CODE_SPACE) {
    GAME_STATE.spacePressed = true;
  } else if (e.keyCode === KEY_CODE_P) {
    togglePause(); // Toggle pause/resume when 'P' key is pressed
  } else if (e.keyCode === KEY_CODE_G) {
    toggleCSS(); // Graphics toggle to change the stylesheet
  } else if (e.keyCode === KEY_CODE_R) {
    location.reload(); // Restart the game when 'R' key is pressed
  }
};

export const onKeyUp = (e) => {
  // console.log(`Key pressed: ${e.keyCode}`);
  if (e.keyCode === KEY_CODE_LEFT) {
    GAME_STATE.leftPressed = false;
  } else if (e.keyCode === KEY_CODE_RIGHT) {
    GAME_STATE.rightPressed = false;
  } else if (e.keyCode === KEY_CODE_SPACE) {
    GAME_STATE.spacePressed = false;
  }
};

// Event listeners for keyboard controls
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

// Call playNextAsync when the game is resumed
document.addEventListener("gameResumed", playNextAsync);

// Call playNextAsync upon the first keypress after the game loads, which needs to occur due to autoplay policies in web browsers
window.addEventListener("keydown", function onFirstKeypress() {
  playNextAsync();
  window.removeEventListener("keydown", onFirstKeypress);
});

let fps = 0;
let frameCount = 0;
let lastFrameTime = performance.now();

export const measureFPS = () => {
  // Get the current time
  const currentTime = performance.now();

  // Calculate the time difference since the last frame
  const timeDiff = currentTime - lastFrameTime;

  // Increment frame count
  frameCount++;

  // If one second has elapsed, calculate FPS
  if (timeDiff >= 1000) {
    // Calculate FPS
    fps = Math.round((frameCount * 1000) / timeDiff);

    // Reset frame count and last frame time
    frameCount = 0;
    lastFrameTime = currentTime;
  }

  // Return the current FPS
  return fps;
};

// Example usage:
export const fpsUpdate = () => {
  // Your rendering or game update code goes here

  // Measure FPS
  const currentFPS = measureFPS();
  console.log("Current FPS:", currentFPS);

  // Request next frame
  requestAnimationFrame(fpsUpdate);
};

// Start the rendering loop
fpsUpdate();

// Initialize the game
window.addEventListener("load", init);
