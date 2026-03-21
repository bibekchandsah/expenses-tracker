import { useEffect, useState, useRef } from 'react';

/**
 * Animates a number from 0 to target with easing.
 * Re-triggers animation whenever target changes or component mounts.
 */
export function useCountUp(target, duration = 1500) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    // Parse target to number
    const endValue = typeof target === 'number' && !isNaN(target) ? target : 0;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // If target is 0, just set it immediately
    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }

    // Start animation
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration]);

  return displayValue;
}
