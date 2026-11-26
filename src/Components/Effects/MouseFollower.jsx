import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

// A lightweight, global mouse-follow glow. Hidden on mobile and respects reduced motion.
const MouseFollower = () => {
  const [isReduced, setIsReduced] = useState(false);
  const mouseX = useSpring(0, { stiffness: 200, damping: 30, mass: 0.2 });
  const mouseY = useSpring(0, { stiffness: 200, damping: 30, mass: 0.2 });
  const rafRef = useRef(null);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updatePref = () => setIsReduced(mq.matches);
      updatePref();
      mq.addEventListener?.('change', updatePref);
      return () => mq.removeEventListener?.('change', updatePref);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      // Use rAF to batch updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mouseX, mouseY]);

  if (isReduced) return null;

  return (
    <motion.div
      className="cursor-glow"
      style={{
        x: mouseX,
        y: mouseY,
      }}
      aria-hidden
    />
  );
};

export default MouseFollower;



