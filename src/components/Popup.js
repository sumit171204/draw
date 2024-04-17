import React, { useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import "./../styles/App.css";

const Popup = ({ onClose, darkMode }) => {
  // State to manage visibility of the popup
  const [showPopup, setShowPopup] = useState(true);

  // Function to handle closing the popup
  const handleClosePopup = () => {
    setShowPopup(false); // Hide the popup
  };

  return (
    <div>
      {showPopup && (
      <div className={`popup ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000'}}>
          <button className={`popupbtn ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000'}} onClick={handleClosePopup}><IoCloseSharp /></button>
          <div className="popup-content">
            <h2>Notice</h2>
            <p>Updated on 17/04/2024.</p>
            <p>Added Components, May Cause Some Errors!🆘</p>
            <p>Now the Performance is Faster than Before!🚀</p>
            <p>Currently added : Share Button.</p>
            <p>Note : Website is in Early Development there are issues to be solved.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
