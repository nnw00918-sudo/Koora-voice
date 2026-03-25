import React from 'react';

/**
 * Simple Volume Slider using native HTML range input
 * Works on all devices including iOS
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
  
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    console.log('Volume slider changed to:', newValue);
    onChange(newValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`relative flex items-center h-12 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className="volume-slider w-full h-3 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, ${trackColor} ${percentage}%, ${trackColor} 100%)`,
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          outline: 'none',
        }}
      />
      <style>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 12px;
          border-radius: 6px;
          outline: none;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          cursor: pointer;
          border: 3px solid #0f172a;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          margin-top: -2px;
        }
        .volume-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          cursor: pointer;
          border: 3px solid #0f172a;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 12px;
          border-radius: 6px;
        }
        .volume-slider::-moz-range-track {
          height: 12px;
          border-radius: 6px;
          background: transparent;
        }
        .volume-slider:focus {
          outline: none;
        }
        .volume-slider:active::-webkit-slider-thumb {
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(204, 255, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default VolumeSlider;
