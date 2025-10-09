"use client";
import LoginButton from '@/components/LoginButton'
import React from 'react'
import MazeGame from '@/components/MazeGame';
const page = () => {
  return (
    <> <LoginButton /><main className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <MazeGame />
    </main></>
  )
}

export default page