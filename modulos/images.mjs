import { GAME_WIDTH } from "./constants.mjs";

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

export {
  cannonImage,
  cannonShotImage,
  alienShotImage,
  lowAlienImage,
  midAlienImage,
  highAlienImage,
  GAME_WIDTH,
};
