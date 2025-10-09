import React from 'react';
import { motion } from 'framer-motion';

interface WinModalProps {
  isVisible: boolean;
  round: number;
  timer: number;
  onClose: () => void;
}

const WinModal: React.FC<WinModalProps> = ({ isVisible, round, timer, onClose }) => {
  if (!isVisible) return null;

  const points = 500 + timer * 10 + round * 100;

  // Confetti particle generator
  const confetti = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 2,
    size: Math.random() * 8 + 4,
  }));

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
      {/* Background overlay with soft gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-br from-pink-100/60 via-purple-100/50 to-blue-100/60 backdrop-blur-md"
      />

      {/* Floating confetti */}
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          className="absolute rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 opacity-70"
          style={{
            width: c.size,
            height: c.size,
            left: c.left,
          }}
          initial={{ y: '100vh', opacity: 0 }}
          animate={{
            y: ['100vh', '-10vh'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 5 + c.delay,
            delay: c.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Modal box */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="relative bg-white/30 backdrop-blur-xl rounded-3xl p-8 md:p-10 text-center shadow-[0_8px_40px_rgba(180,100,255,0.3)] border border-white/50 max-w-md mx-4"
      >
        {/* Celebration Emoji */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="text-7xl mb-4"
        >
          🎉
        </motion.div>

        {/* Title */}
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-4 drop-shadow-sm">
          Level Complete!
        </h2>

        {/* Points */}
        <div className="inline-block bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-300 text-white rounded-full py-3 px-8 mb-6 shadow-lg">
          <p className="text-3xl font-extrabold drop-shadow-sm">+{points} Points</p>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full bg-gradient-to-r from-sky-400 via-purple-400 to-pink-500 text-white py-4 rounded-2xl font-black text-xl shadow-lg transition-transform"
        >
          {round < 10 ? '🚀 Next Level' : '🎮 Play Again'}
        </motion.button>

        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]"></div>
      </motion.div>
    </div>
  );
};

export default WinModal;
