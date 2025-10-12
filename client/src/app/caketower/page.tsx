/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef } from "react";

export default function CakeTowerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    const scoreElement = scoreRef.current!;

    const MODES = {
      FALL: "FALL",
      BOUNCE: "BOUNCE",
      GAME_OVER: "GAME_OVER",
    } as const;

    const BOX_HEIGHT = 50;
    const INITIAL_BOX_WIDTH = 200;
    const INITIAL_X_SPEED = 1.2;
    const FALL_SPEED = 5;
    const MAX_X_SPEED = 6; // upper limit so it doesn't get impossible

    let boxes: any[] = [];
    let mode: string;
    let xSpeed: number;
    let currentBox: any;
    let score: number;
    let animationId: number;

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawBoxes();

      if (mode === MODES.GAME_OVER) gameOver();
      if (mode === MODES.BOUNCE) bounce();
      if (mode === MODES.FALL) fall();

      animationId = window.requestAnimationFrame(draw);
    }

    function startNewGame() {
      if (animationId) window.cancelAnimationFrame(animationId);

      const initialBox = {
        x: canvas.width / 2 - INITIAL_BOX_WIDTH / 2,
        y: canvas.height - BOX_HEIGHT,
        width: INITIAL_BOX_WIDTH,
        color: getRandomCakeColor(),
      };

      boxes = [initialBox];
      xSpeed = INITIAL_X_SPEED;
      canvas.style.backgroundColor = "";
      currentBox = null;
      score = 0;
      scoreElement.textContent = score.toString();
      mode = MODES.BOUNCE;
      draw();
    }

    function drawBoxes() {
      boxes.forEach(drawBox);
      drawBox(currentBox);
    }

    function drawBox(box: any) {
      if (!box) return;
      const { color, x, y, width } = box;
      context.fillStyle = color;
      context.beginPath();
      context.roundRect(x, y, width, BOX_HEIGHT, 10);
      context.fill();
      context.closePath();
    }

    function getRandomCakeColor() {
      const cakeColors = [
        "#FF69B4", // hot pink
        "#FFB6C1", // light pink
        "#FFC0CB", // pink
        "#FF1493", // deep pink
        "#FF6B9D", // bright pink
        "#C71585", // medium violet red
      ];
      return cakeColors[Math.floor(Math.random() * cakeColors.length)];
    }

    function bounce() {
      if (!currentBox) {
        const lastBox = getLastBox();
        currentBox = {
          x: Math.random() * (canvas.width - lastBox.width),
          y: 0,
          width: lastBox.width,
          color: getRandomCakeColor(),
        };
      }
      currentBox.x += xSpeed;

      const hitRight = currentBox.width + currentBox.x > canvas.width;
      const hitLeft = currentBox.x < 0;

      if (hitRight || hitLeft) xSpeed = -xSpeed;
    }

    function fall() {
      const lastBox = getLastBox();
      currentBox.y += FALL_SPEED;
      if (currentBox.y + BOX_HEIGHT >= lastBox.y) land();
    }

    function land() {
      const lastBox = getLastBox();
      const difference = currentBox.x - lastBox.x;

      // If completely missed
      if (
        currentBox.x > lastBox.x + lastBox.width ||
        currentBox.x + currentBox.width < lastBox.x
      ) {
        mode = MODES.GAME_OVER;
        return;
      }

      // Adjust width based on overlap
      if (currentBox.x > lastBox.x) {
        currentBox.width -= difference;
      } else {
        currentBox.width += difference;
        currentBox.x -= difference;
      }

      boxes.push(currentBox);

      // Shift tower upward if too tall
      if (boxes.length > 6) {
        boxes.forEach((box) => (box.y += BOX_HEIGHT));
        boxes = boxes.filter((box) => box.y < canvas.height);
      }

      currentBox = null;

      // 🎯 Increase difficulty dynamically
      const speedBoost = 0.15 + score * 0.02; // grows slightly per level
      if (Math.abs(xSpeed) < MAX_X_SPEED) {
        xSpeed = xSpeed > 0 ? xSpeed + speedBoost : xSpeed - speedBoost;
      }

      score++;
      scoreElement.textContent = score.toString();
      mode = MODES.BOUNCE;
    }

    function gameOver() {
      mode = MODES.GAME_OVER;
      canvas.style.backgroundColor = "rgba(255, 182, 193, 0.7)";
      context.font = "bold 22px 'Comic Sans MS'";
      context.fillStyle = "#C71585";
      context.textAlign = "center";
      context.fillText("Cake Tower Fell 🍰", canvas.width / 2, canvas.height / 2);
    }

    function getLastBox() {
      return boxes[boxes.length - 1];
    }

    function handleControllers() {
      if (mode === MODES.GAME_OVER) {
        startNewGame();
        return;
      }
      if (mode === MODES.BOUNCE) mode = MODES.FALL;
    }

    window.addEventListener("click", handleControllers);
    window.addEventListener("keyup", (e) => e.code === "Space" && handleControllers());

    startNewGame();

    return () => {
      window.removeEventListener("click", handleControllers);
      window.removeEventListener("keyup", (e) => e.code === "Space" && handleControllers());
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-300 via-sky-200 to-green-300 text-brown-900 relative overflow-hidden">
      {/* Decorative clouds */}
      <div className="absolute top-10 left-10 w-24 h-12 bg-white/60 rounded-full blur-sm"></div>
      <div className="absolute top-20 right-20 w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
      <div className="absolute top-40 left-1/4 w-28 h-14 bg-white/60 rounded-full blur-sm"></div>
      
      <h1 className="text-5xl font-black mb-2 tracking-wide drop-shadow-lg text-pink-600" style={{ fontFamily: 'Comic Sans MS, cursive', textShadow: '3px 3px 0px rgba(255,255,255,0.8)' }}>
        🍰 Cake Tower
      </h1>
      <div className="flex gap-3 mb-4">
        <div className="bg-white/90 px-5 py-2 rounded-full shadow-lg border-3 border-pink-300 flex items-center gap-2">
          <span className="text-2xl">🎂</span>
          <span className="text-xl font-bold text-pink-600" ref={scoreRef}>0</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={500}
        className="border-8 border-white rounded-3xl shadow-2xl bg-gradient-to-b from-sky-100 to-sky-50"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
      />
      <p className="mt-5 text-base font-semibold text-white bg-pink-500/80 px-6 py-2 rounded-full shadow-md">
        👆 Click or press <span className="font-black">SPACE</span> to drop! 🎯
      </p>
    </div>
  );
}