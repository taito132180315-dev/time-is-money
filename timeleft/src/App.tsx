/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './hooks/useStore';
import RelationshipMode from './components/RelationshipMode';
import SelfMode from './components/SelfMode';
import { getRandomQuote, type Quote } from './data/quotes';

function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'button' || 
          target.tagName.toLowerCase() === 'a' ||
          target.tagName.toLowerCase() === 'input' ||
          target.tagName.toLowerCase() === 'select' ||
          target.closest('button') ||
          target.closest('a')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <motion.div
      className="cursor-dot"
      animate={{
        x: mousePosition.x,
        y: mousePosition.y,
        scale: isHovering ? 4 : 1,
        backgroundColor: isHovering ? '#ffffff' : '#ff3300',
      }}
      transition={{ type: 'tween', ease: 'backOut', duration: 0.1 }}
    />
  );
}

function DailyQuote() {
  const [quote] = useState<Quote>(() => getRandomQuote());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 1, ease: [0.19, 1, 0.22, 1] }}
      className="border-t border-white/10 px-6 md:px-12 py-10"
    >
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-[10px] tracking-[0.35em] text-[#ff3300]/60 uppercase mb-6">✦ &nbsp; Today's Wisdom &nbsp; ✦</div>
        <p className="editorial-text text-xl md:text-2xl text-white/70 leading-relaxed mb-5">
          「{quote.jp}」
        </p>
        <div className="w-8 h-px bg-white/20 mx-auto mb-4" />
        <div className="text-xs text-white/30 tracking-widest">
          {quote.name} &nbsp;·&nbsp; {quote.year}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'relationship' | 'self'>('relationship');
  const { relationships, saveRelationships, milestones, saveMilestones, userProfile, saveUserProfile, isLoaded } = useStore();

  if (!isLoaded) return null;

  return (
    <>
      <div className="noise"></div>
      <CustomCursor />
      
      <div className="min-h-screen w-full flex flex-col relative z-10 selection:bg-[#ff3300] selection:text-white">
        
        <header className="pt-12 pb-8 px-6 md:px-12 overflow-hidden border-b border-white/10">
          <motion.h1 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="display-text text-[18vw] md:text-[14vw] text-white leading-none tracking-tighter"
          >
            TIMELEFT
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-end mt-8 gap-8"
          >
            <p className="editorial-text text-2xl md:text-4xl text-white/60 max-w-xl leading-tight">
              An ode to the finite nature of our existence.
            </p>
            
            <div className="flex gap-4 text-sm font-medium tracking-widest uppercase">
              <button
                onClick={() => setActiveTab('relationship')}
                className={`px-6 py-3 rounded-full transition-all duration-500 ${activeTab === 'relationship' ? 'bg-[#ff3300] text-white' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                Relationships
              </button>
              <button
                onClick={() => setActiveTab('self')}
                className={`px-6 py-3 rounded-full transition-all duration-500 ${activeTab === 'self' ? 'bg-[#ff3300] text-white' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                Milestones
              </button>
            </div>
          </motion.div>
        </header>

        <main className="flex-1 w-full px-6 md:px-12 py-12 perspective-container">
          <AnimatePresence mode="wait">
            {activeTab === 'relationship' ? (
              <motion.div
                key="relationship"
                initial={{ opacity: 0, rotateX: -10, y: 40 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, rotateX: 10, y: -40 }}
                transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                className="w-full h-full"
              >
                <RelationshipMode relationships={relationships} saveRelationships={saveRelationships} />
              </motion.div>
            ) : (
              <motion.div
                key="self"
                initial={{ opacity: 0, rotateX: -10, y: 40 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, rotateX: 10, y: -40 }}
                transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              >
                <SelfMode milestones={milestones} saveMilestones={saveMilestones} userProfile={userProfile} saveUserProfile={saveUserProfile} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <DailyQuote />
      </div>
    </>
  );
}
