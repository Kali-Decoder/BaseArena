"use client";

import Script from "next/script";

export default function Page() {
  return (
    <main>
      <div id="shim">shim for font face</div>
      <h1> Pacman</h1>
      <p>
        <a href="daniel estera" target="_blank" rel="noreferrer">
          Credits: daniel estera
        </a>
      </p>
      <div id="pacman"></div>

      {/* External deps: jQuery and Modernizr */}
      <Script src="https://code.jquery.com/jquery-3.7.1.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/modernizr/2.8.3/modernizr.min.js" strategy="beforeInteractive" />
      {/* Game script */}
      <Script src="/script.js" strategy="afterInteractive" />
    </main>
  );
}


