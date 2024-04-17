// CanvasComponent.js
import React from 'react';
import './../styles/App.css';

const Canvas = ({ 
  onMouseDown, 
  onMouseMove, 
  onMouseUp, 
  onTouchStart, 
  onTouchMove, 
  onTouchEnd, 
  onTouchCancel, 
  darkMode 
}) => {
  return (
    <canvas
      id="canvas"
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel} 
      style={{ 
        position: "absolute", 
        zIndex: 1,
        backgroundColor: darkMode ? "#2e2e2e" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000" 
      }}
    >
      Canvas
    </canvas>
  );
};

export default Canvas;
