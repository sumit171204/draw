import React from "react";
import { FaFolderOpen } from "react-icons/fa";
import { MdOutlineSaveAlt, MdDelete, MdDarkMode } from "react-icons/md";
import { HiOutlineBars3 } from "react-icons/hi2";
import "./../styles/App.css";

const Options = ({ darkMode, toggleDropdown, handleOpen, handleSave, handleResetCanvas, toggleDarkMode, showDropdown,handleFileInputChange }) => {
  return (
    <div className={`options ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000' }}>
      <button className={`btnoption ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000' }} onClick={toggleDropdown}><HiOutlineBars3/></button>
      {showDropdown && (
        <div className={`dropdown-content ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000' }}>
          <button onClick={handleOpen}><FaFolderOpen/>&nbsp;&nbsp;Open</button>
          <input id="file-input" type="file" onChange={handleFileInputChange} style={{ display: 'none' }} />
          <button onClick={handleSave}><MdOutlineSaveAlt/>&nbsp;&nbsp;Save</button>
          <button onClick={handleResetCanvas}><MdDelete/>&nbsp;&nbsp;Reset the Canvas</button>
          <button onClick={toggleDarkMode}><MdDarkMode />&nbsp;&nbsp;Dark Mode</button>
        </div>
      )}
    </div>
  );
};

export default Options;
