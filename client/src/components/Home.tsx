
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
const gameCards = [
    {
        href: 'dashboard/games/connectfour',
        img: '/assets/four.png',
        title: 'Connect Four AI',
        desc: 'Drop coins into the grid and try to beat AI in a four-in-a-row match.'
    },
    {
        href: 'dashboard/games/reaction',
        img: '/assets/reaction.png',
        title: 'Reaction Duel',
        desc: 'Test your reflexes against the AI — who can click the fastest when the screen flashes?'
    },
    {
        href: 'dashboard/games/chess',
        img: '/assets/chess.png',
        title: 'AI Chess Blitz',
        desc: 'A speed version of chess where you have seconds per move against an adaptive AI.'
    },
    {
        href: 'dashboard/games/maze',
        img: '/assets/maze.png',
        title: 'Maze Escape',
        desc: 'Race against an AI to exit a randomly generated maze first.'
    },
    {
        href: 'dashboard/games/memory',
        img: '/assets/memory.png',
        title: 'Memory Match',
        desc: 'Flip and match cards faster than the AI using memory skills.'
    }
];

const CARDS_PER_VIEW = 1;

const Home = () => {
    const [index, setIndex] = useState(0);
    const maxIndex = gameCards.length - CARDS_PER_VIEW;

    const handlePrev = () => setIndex((i) => Math.max(i - 1, 0));
    const handleNext = () => setIndex((i) => Math.min(i + 1, maxIndex));

    return (
        <div className="bg-black text-white font-mono min-h-screen">
            
            <div className="relative min-h-screen flex flex-col items-center justify-center px-2 sm:px-4 py-16 sm:py-24">

                {/* <motion.h1
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 tracking-wider uppercase text-center bg-gradient-to-r from-blue-600 to-white bg-clip-text text-transparent"
                >
                    Base Arena
                </motion.h1> */}


                <div className="relative w-full flex justify-center items-center max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto">
                    <button
                        onClick={handlePrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-700 hover:bg-gray-600 rounded-full p-2 shadow-lg disabled:opacity-30"
                        disabled={index === 0}
                        aria-label="Previous"
                    >
                        &#8592;
                    </button>
                    <div className="overflow-hidden w-full flex justify-center">
                        <div
                            className="flex transition-transform duration-500"
                            style={{ transform: `translateX(-${index * 100}%)` }}
                        >
                            {gameCards.map((card, i) => (
                                <div
                                    key={i}
                                    className="min-w-full flex-shrink-0 flex justify-center h-full items-center px-2"
                                >
                                    <Link href={card.href}>
                                        <motion.div
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="bg-gray-900 rounded-xl shadow-lg h-full overflow-hidden transition-all duration-300 flex flex-col w-[270px] sm:w-[300px]"
                                        >
                                            {/* Image */}
                                            <div className="relative">
                                                <img
                                                    src={card.img}
                                                    alt={card.title}
                                                    className="w-full h-1/2 object-cover"
                                                />
                                                <div className="absolute top-2 right-2 bg-black/50 text-xs px-2 py-1 rounded-md text-white">
                                                    🎮 Game
                                                </div>
                                            </div>

                                         
                                            <div className="flex flex-col flex-grow justify-between p-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-2">
                                                        {card.title}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm mb-3">{card.desc}</p>
                                                   
                                                    <div className="flex items-center text-yellow-400 text-xs space-x-1 mb-3">
                                                        <span>⭐️⭐️⭐️⭐️</span>
                                                        <span className="text-gray-500">(46)</span>
                                                        <span className="ml-auto text-gray-400">🕒 11 mins</span>
                                                    </div>
                                                </div>

                                             
                                                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition">
                                                    Play Now
                                                </button>
                                            </div>
                                        </motion.div>
                                    </Link>

                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-700 hover:bg-gray-600 rounded-full p-2 shadow-lg disabled:opacity-30"
                        disabled={index === maxIndex}
                        aria-label="Next"
                    >
                        &#8594;
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Home;