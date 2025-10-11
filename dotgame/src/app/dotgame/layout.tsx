"use client";

import type { ReactNode } from "react";
import { useState, createContext } from "react";
import { ReactTogether } from "react-together";
import "./dotgame.css";

export const SessionParamsContext = createContext({
  setSessionName: (_: string | null) => {},
  setSessionPassword: (_: string | null) => {},
});

export default function DotgameLayout({ children }: { children: ReactNode }) {
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string | null>(null);

  return (
    <SessionParamsContext.Provider value={{ setSessionName, setSessionPassword }}>
      <ReactTogether
        sessionParams={{
          appId: process.env.NEXT_PUBLIC_MULTISYNQ_APP_ID || "",
          apiKey: process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY || "",
          name: sessionName || undefined,
          password: sessionPassword || undefined,
        }}
        rememberUsers={true}
      >
        <section>{children}</section>
      </ReactTogether>
    </SessionParamsContext.Provider>
  );
}


