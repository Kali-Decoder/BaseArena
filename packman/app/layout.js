import './globals.css';

export const metadata = {
  title: "Pacman",
  description: "Pacman game ported to Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


