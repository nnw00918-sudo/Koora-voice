import React, { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Custom Volume Slider that works on iOS Safari
 * Uses touch events instead of native range input
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
  
  const calculateValue = useCallback((clientX) => {
    if (!sliderRef.current) return value;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
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
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX);
  };
  
  const onTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX);
  };
  
  // Global event listeners for drag
  useEffect(() => {
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();
    
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div 
      ref={sliderRef}
      className={`relative h-12 flex items-center cursor-pointer select-none ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{ touchAction: 'none' }}
    >
      {/* Track Background */}
      <div 
        className="absolute w-full h-3 rounded-full"
        style={{ backgroundColor: trackColor }}
      />
      
      {/* Track Fill */}
      <div 
        className="absolute h-3 rounded-full transition-all duration-75"
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
      
      {/* Thumb */}
      <div 
        className="absolute w-8 h-8 rounded-full shadow-lg transition-transform duration-75"
        style={{ 
          left: `calc(${percentage}% - 16px)`,
          backgroundColor: color,
          border: '4px solid #0f172a',
          boxShadow: isDragging 
            ? `0 0 0 8px ${color}33, 0 4px 12px rgba(0,0,0,0.4)` 
            : '0 4px 12px rgba(0,0,0,0.4)',
          transform: isDragging ? 'scale(1.15)' : 'scale(1)'
        }}
      />
    </div>
  );
};

export default VolumeSlider;
