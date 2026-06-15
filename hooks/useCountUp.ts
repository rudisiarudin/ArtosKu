import { useState, useEffect } from 'react';

export function useCountUp(endValue: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    // Set initial to 0 if it's the first time, otherwise maybe we could animate from old to new, 
    // but the requirement is "from 0 to nominal"
    
    // Safety check for NaN or undefined
    const finalValue = Number(endValue) || 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function: easeOutQuart for a smooth slowdown
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.floor(finalValue * easeProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(finalValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return count;
}
