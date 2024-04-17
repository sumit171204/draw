import React from 'react';
import { FaMousePointer, FaPencilAlt, FaFont, FaUndo, FaRedo } from 'react-icons/fa';
import { MdOutlineRectangle} from 'react-icons/md';
import { IoRemoveOutline } from 'react-icons/io5';
import Draggable from 'react-draggable';
import "./../styles/App.css";

const Toolbox = ({ selectedTool, handleToolClick, undo, redo, darkMode }) => {
    return (
        <Draggable>
            <div className={`toolbox-container ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }}>
                <div className="toolbox">
                    <button className={selectedTool === 'selection' ? 'selected' : ''} onClick={() => handleToolClick('selection')} title="Selection"><FaMousePointer /></button>
                    <button className={selectedTool === 'line' ? 'selected' : ''} onClick={() => handleToolClick('line')} title="Line"><IoRemoveOutline /></button>
                    <button className={selectedTool === 'rectangle' ? 'selected' : ''} onClick={() => handleToolClick('rectangle')} title="Rectangle"><MdOutlineRectangle /></button>
                    <button className={selectedTool === 'pencil' ? 'selected' : ''} onClick={() => handleToolClick('pencil')} title="Pen"><FaPencilAlt /></button>
                    <button className={selectedTool === 'text' ? 'selected' : ''} onClick={() => handleToolClick('text')} title="Text"><FaFont /></button>
                    <button onClick={undo} title="Undo"><FaUndo /></button>
                    <button onClick={redo} title="Redo"><FaRedo /></button>
                </div>
            </div>
        </Draggable>
    );
};

export default Toolbox;
