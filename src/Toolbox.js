import React from "react";
import { FaMousePointer, FaDrawPolygon, FaPencilAlt, FaFont } from "react-icons/fa"; // Example icons from Font Awesome

const toolIcons = {
  selection: <FaMousePointer />,
  line: <FaDrawPolygon />,
  rectangle: <FaDrawPolygon />,
  pencil: <FaPencilAlt />,
  text: <FaFont />
};

const Toolbox = ({ tool, setTool }) => {
  return (
    <div className="toolbox">
      {Object.keys(toolIcons).map(toolName => (
        <label key={toolName}>
          <input
            type="radio"
            value={toolName}
            checked={tool === toolName}
            onChange={() => setTool(toolName)}
          />
          {toolIcons[toolName]}
        </label>
      ))}
    </div>
  );
};

export default Toolbox;
