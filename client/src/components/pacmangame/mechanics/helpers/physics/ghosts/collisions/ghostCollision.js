import Graphics from "../../../graphics/graphics";
import Animator from "../../../graphics/animator/animator";
import playGame from "../../../../playGame";

export default class GhostCollision {
  static collisionConditional(ghost, pacman) {
    return (
      ghost.position.y - ghost.radius <= pacman.position.y + pacman.radius &&
      ghost.position.y + ghost.radius >= pacman.position.y - pacman.radius &&
      ghost.position.x + ghost.radius >= pacman.position.x - pacman.radius &&
      ghost.position.x - ghost.radius <= pacman.position.x + pacman.radius
    );
  }

  static dealWithCollision(ghost, assets, variables, ctx) {
    if (!ghost.isScared && !ghost.isRetreating) {
      assets.characters.pacman.radians = Math.PI / 4;
      cancelAnimationFrame(variables.animationId);
      assets.audioPlayer.stopGhostAudio();
      assets.audioPlayer.playPacmanDeath();
      assets.characters.pacman.isShrinking = true;
      Graphics.runDeathAnimation(variables, ctx, assets);
    } else if (ghost.isScared) {
      variables.score += 200 * Math.pow(2, variables.killCount);
      variables.killCount++;
      ghost.changeRetreatingState();
      ghost.retreatingTimer.start();
      ghost.changeScaredState();
      ghost.assignSprite();
      ghost.checkSpeedMatchesState();
    }
  }

  static checkPacmanLives(
    assets,
    variables,
    ctx,
    endGame = GhostCollision.endGame,
    resetAfterDeath = GhostCollision.resetAfterDeath
  ) {
    if (assets.characters.pacman.lives <= 0) {
      endGame(variables, assets, ctx);
    } else {
      assets.characters.pacman.lives--;
      resetAfterDeath(assets, variables);
    }
  }

  static endGame(
    variables,
    assets,
    ctx,
    resetAfterGameOver = GhostCollision.resetAfterGameOver
  ) {
    cancelAnimationFrame(variables.animationId);
    Animator.displayPleaseWait(ctx);
    resetAfterGameOver(assets, variables);
    // Game over logic here (e.g., show a message or restart option)
  }


  // saveScore and getBackendUrl removed (no leaderboard/axios)

  static resetAfterGameOver(assets, variables) {
    assets.props.pellets.forEach((pellet) => {
      if (pellet.hasBeenEaten) pellet.changeEatenState();
    });
    assets.props.powerUps.forEach((powerUp) => {
      if (powerUp.hasBeenEaten) powerUp.changeEatenState();
    });
    assets.timers.cycleTimer.reset();
    assets.timers.scaredTimer.reset();
    assets.timers.scaredTimer.duration = 7000;
    Object.values(assets.characters.ghosts).forEach((ghost) => {
      ghost.reset();
    });
    assets.characters.pacman.reset();
    assets.characters.pacman.lives = 2;
    variables.lastKeyPressed = "";
    variables.level = 1;
    window.removeEventListener("keydown", variables.directionEventListener);
    window.removeEventListener(
      "visibilitychange",
      variables.visibilityEventListener
    );
    window.removeEventListener("keydown", variables.pauseEventListener);
  }

  static resetAfterDeath(assets, variables, callbackOne = playGame) {
    assets.characters.pacman.reset();
    variables.lastKeyPressed = "";
    assets.timers.cycleTimer.reset();
    assets.timers.scaredTimer.reset();
    Object.values(assets.characters.ghosts).forEach((ghost) => {
      ghost.reset();
    });
    assets.timers.cycleTimer.start();
    assets.audioPlayer.ghostAudioWantsToPlay = true;
    callbackOne(variables.player, variables.reactRoot);
  }
}
