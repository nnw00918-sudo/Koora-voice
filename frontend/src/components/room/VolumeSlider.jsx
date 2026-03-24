import React, { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Custom Volume Slider that works on iOS Safari
 * RTL Support - slider starts from RIGHT (0%) to LEFT (100%)
 */
export const VolumeSlider = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  color = '#CCFF00',
  trackColor = 'rgb(51, 65, 85)',
  className = ''
}) => {
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // RTL: Calculate value from RIGHT to LEFT (0% on right, 100% on left)
  const calculateValue = useCallback((clientX) => {
    if (!sliderRef.current) return value;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    // Invert for RTL: right = 0%, left = 100%
    const percentage = Math.max(0, Math.min(1, 1 - (x / rect.width)));
    const newValue = Math.round(min + percentage * (max - min));
    return newValue;
  }, [min, max, value]);
  
  const handleStart = useCallback((clientX) => {
    setIsDragging(true);
    const newValue = calculateValue(clientX);
    onChange(newValue);
  }, [calculateValue, onChange]);
  
  const handleMove = useCallback((clientX) => {
    if (!isDragging) return;
    const newValue = calculateValue(clientX);
    onChange(newValue);
  }, [isDragging, calculateValue, onChange]);
  
  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Mouse events
  const onMouseDown = (e) => {
    e.preventDefault();
    handleStart(e.clientX);
  };
  
  // Touch events
  const onTouchStart = (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX);
  };
  
  const onTouchMove = (e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX);
  };
  
  // Global event listeners for drag
  useEffect(() => {
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();
    const onTouchMoveGlobal = (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        handleMove(touch.clientX);
      }
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMoveGlobal, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMoveGlobal);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div 
      ref={sliderRef}
      className={`relative h-10 flex items-center cursor-pointer select-none ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Track Background */}
      <div 
        className="absolute w-full h-2.5 rounded-full"
        style={{ backgroundColor: trackColor }}
      />
      
      {/* Track Fill - from RIGHT */}
      <div 
        className="absolute h-2.5 rounded-full"
        style={{ 
          width: `${percentage}%`,
          right: 0,
          backgroundColor: color,
          transition: isDragging ? 'none' : 'width 0.1s ease-out'
        }}
      />
      
      {/* Thumb - positioned from RIGHT */}
      <div 
        className="absolute w-6 h-6 rounded-full shadow-lg"
        style={{ 
          right: `calc(${percentage}% - 12px)`,
          backgroundColor: color,
          border: '3px solid #0f172a',
          boxShadow: isDragging 
            ? `0 0 0 6px ${color}40` 
            : '0 2px 8px rgba(0,0,0,0.3)',
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transition: isDragging ? 'transform 0.1s' : 'right 0.1s ease-out, transform 0.1s'
        }}
      />
    </div>
  );
};

export default VolumeSlider;
