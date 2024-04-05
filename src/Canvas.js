import React from "react";

const Canvas = ({ id, width, height, onMouseDown, onMouseMove, onMouseUp, style }) => {
  return (
    <canvas
      id={id}
      width={width}
      height={height}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={style}
    >
      Canvas
    </canvas>
  );
};

export default Canvas;
