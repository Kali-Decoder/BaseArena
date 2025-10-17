
import React, { useState, useEffect } from "react";
import "./main.css";
import PacmanGame from "../pacmangame/game";
import { Howl } from "howler";

export default function Main() {
  const [theme] = useState(
    new Howl({
      src: ["./audio/title_theme.wav"],
      loop: true,
      volume: 0.3,
    })
  );
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    theme.play();
    const preventArrowScroll = (event) => {
      if (["ArrowUp", "ArrowDown"].includes(event.code)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", preventArrowScroll);
    return () => {
      window.removeEventListener("keydown", preventArrowScroll);
      theme.stop();
    };
  }, [theme]);

  const handleSubmit = () => {
    theme.pause();
    setShowGame(true);
  };

  if (showGame) {
    return <PacmanGame player="nikku" />;
  }

  return (
    <div className="main" id="main">
      <div className="register">
        <button className="play-button" id="play-button" onClick={handleSubmit}>
          Play
        </button>
      </div>
      <p className="name-error" id="name-error"></p>
      <p className="instructions">
        Use the directional keys to move Pac-Man around the board while avoiding
        the ghosts as best you can. Pick up a power up and then attack the
        ghosts! Eat all the pellets on the board to level up. Press esc to pause
        and unpause the game at any time. (For mobile and tablet users, a D-pad
        will appear below the board for you to move Pac-Man around)
      </p>
    </div>
  );
}
