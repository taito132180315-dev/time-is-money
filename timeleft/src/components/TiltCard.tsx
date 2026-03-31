import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import React from 'react';

export default function TiltCard({ children, progress }: { children: React.ReactNode, progress: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="relative w-full border border-white/10 bg-[#0a0a0a] p-8 md:p-12 overflow-hidden group mb-8 rounded-3xl"
    >
      <motion.div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            ([mx, my]) => `radial-gradient(circle at ${(mx + 0.5) * 100}% ${(my + 0.5) * 100}%, rgba(255,51,0,0.1) 0%, transparent 60%)`
          )
        }}
      />
      
      <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full z-0">
        <div className="h-full bg-[#ff3300] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div style={{ transform: "translateZ(40px)" }} className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
