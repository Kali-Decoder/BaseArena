"use client";

import React from "react";
import LoginButton from "@/components/LoginButton";
import MazeGame from "@/components/MazeGame";

export default function Page(): React.ReactElement {
  return (
    <>
      <LoginButton />
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <MazeGame />
      </main>
    </>
  );
}


