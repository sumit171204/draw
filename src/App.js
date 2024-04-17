import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {FaShare } from "react-icons/fa";
import rough from "roughjs/bundled/rough.esm";
import './styles/App.css';
import Canvas from "./components/Canvas";
import Toolbox from "./components/ToolBox";
import { createElement,getElementAtPosition,cursorForPosition,usePressedKeys,useHistory,drawElement,resizedCoordinates
,adjustmentRequired,adjustElementCoordinates } from "./utils";
import Popup from "./components/Popup";
import Options from "./components/MenuOptions";
import { DEFAULT_PENCIL_COLOR, DEFAULT_PENCIL_SIZE, DEFAULT_DARK_MODE } from "./constants/constants";

const App = () => {
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("pencil");
  const [selectedElement, setSelectedElement] = useState(null);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = React.useState({ x: 0, y: 0 });
  const textAreaRef = useRef();
  const pressedKeys = usePressedKeys();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTool, setSelectedTool] = useState("pencil"); 
  const [showPencilBox, setShowPencilBox] = useState(false);
  const [pencilColor, setPencilColor] = useState(DEFAULT_PENCIL_COLOR); 
  const [pencilSize, setPencilSize] = useState(DEFAULT_PENCIL_SIZE); 
  const [darkMode, setDarkMode] = useState(DEFAULT_DARK_MODE);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const roughCanvas = rough.canvas(canvas);
  
    context.clearRect(0, 0, canvas.width, canvas.height);
  
    context.save();
    context.translate(panOffset.x, panOffset.y);
  
    elements.forEach(element => {
      if (action === "writing" && selectedElement.id === element.id) return;
      drawElement(roughCanvas, context, element, pencilColor, pencilSize, darkMode); // Pass darkMode here
    });
    context.restore();
  }, [elements, action, selectedElement, panOffset, pencilColor, pencilSize, darkMode]); // Include darkMode in the dependency array
  
  

  useEffect(() => {
    const undoRedoFunction = event => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener("keydown", undoRedoFunction);
    return () => {
      document.removeEventListener("keydown", undoRedoFunction);
    };
  }, [undo, redo]);

  useEffect(() => {
    const panFunction = event => {
      setPanOffset(prevState => ({
        x: prevState.x - event.deltaX,
        y: prevState.y - event.deltaY,
      }));
    };

    document.addEventListener("wheel", panFunction);
    return () => {
      document.removeEventListener("wheel", panFunction);
    };
  }, []);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (action === "writing") {
      setTimeout(() => {
        textArea.focus();
        textArea.value = selectedElement.text;
      }, 0);
    }
  }, [action, selectedElement]);

  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements];

    switch (type) {
      case "line":
      case "rectangle":
        elementsCopy[id] = createElement(id, x1, y1, x2, y2, type);
        break;
      case "pencil":
        elementsCopy[id].points = [...elementsCopy[id].points, { x: x2, y: y2 }];
        break;
      case "text":
        const textWidth = document
          .getElementById("canvas")
          .getContext("2d")
          .measureText(options.text).width;
        const textHeight = 24;
        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type),
          text: options.text,
        };
        break;
      default:
        throw new Error(`Type not recognised: ${type}`);
    }

    setElements(elementsCopy, true);
  };

  const getMouseCoordinates = event => {
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX - rect.left - panOffset.x;
    const clientY = event.clientY - rect.top - panOffset.y;
    return { clientX, clientY };
  };
  

  const handleMouseDown = event => {
    if (action === "writing") return;

    const { clientX, clientY } = getMouseCoordinates(event);

    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction("panning");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        if (element.type === "pencil") {
          const xOffsets = element.points.map(point => clientX - point.x);
          const yOffsets = element.points.map(point => clientY - point.y);
          setSelectedElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ ...element, offsetX, offsetY });
        }
        setElements(prevState => prevState);

        if (element.position === "inside") {
          setAction("moving");
        } else {
          setAction("resizing");
        }
      }
    } else {
    
      if ('ontouchstart' in window) {
        setAction("touch-drawing"); 
        setSelectedElement(null);
        return;
      }
      
      const id = elements.length;
      const element = createElement(id, clientX, clientY, clientX, clientY, tool, pencilColor); // Pass pencilColor here
      setElements(prevState => [...prevState, element]);
      setSelectedElement(element);
    
      setAction(tool === "text" ? "writing" : "drawing");
    }
};

  const handleMouseMove = event => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (action === "panning") {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
      return;
    }

    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      event.target.style.cursor = element ? cursorForPosition(element.position) : "default";
    } else {
      event.target.style.cursor = "crosshair";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving") {
      if (selectedElement.type === "pencil") {
        const newPoints = selectedElement.points.map((_, index) => ({
          x: clientX - selectedElement.xOffsets[index],
          y: clientY - selectedElement.yOffsets[index],
        }));
        const elementsCopy = [...elements];
        elementsCopy[selectedElement.id] = {
          ...elementsCopy[selectedElement.id],
          points: newPoints,
        };
        setElements(elementsCopy, true);
      } else {
        const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement;
        const width = x2 - x1;
        const height = y2 - y1;
        const newX1 = clientX - offsetX;
        const newY1 = clientY - offsetY;
        const options = type === "text" ? { text: selectedElement.text } : {};
        updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, options);
      }
    } else if (action === "resizing") {
      const { id, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates);
      updateElement(id, x1, y1, x2, y2, type);
    }
  };

  const handleMouseUp = event => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (selectedElement) {
      if (
        selectedElement.type === "text" &&
        clientX - selectedElement.offsetX === selectedElement.x1 &&
        clientY - selectedElement.offsetY === selectedElement.y1
      ) {
        setAction("writing");
        return;
      }

      const index = selectedElement.id;
      const { id, type } = elements[index];
      if ((action === "drawing" || action === "resizing") && adjustmentRequired(type)) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
        updateElement(id, x1, y1, x2, y2, type);
      }
    }

    if (action === "writing") return;

    setAction("none");
    setSelectedElement(null);
  };

  const handleBlur = event => {
    const { id, x1, y1, type } = selectedElement;
    setAction("none");
    setSelectedElement(null);
    updateElement(id, x1, y1, null, null, type, { text: event.target.value });
  };

  const handleSave = () => {
    const canvas = document.getElementById("canvas");
    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempContext.fillStyle = darkMode ? "#2e2e2e" : "#ffffff";
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempContext.drawImage(canvas, 0, 0);
    const dataURL = tempCanvas.toDataURL();
    const anchor = document.createElement("a");
    anchor.href = dataURL;
    anchor.download = "webdraw.png";
    anchor.click();
  };
  

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.getElementById("canvas");
          const context = canvas.getContext("2d");
          context.drawImage(img, 0, 0);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
  const handleOpen = () => {
    const fileInput = document.getElementById("file-input");
    fileInput.click();
    
  };
  const handleResetCanvas = () => {
    const confirmed = window.confirm("Are you sure you want to clear the canvas?");
    if (confirmed) {
      const canvas = document.getElementById("canvas");
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height); 
      setElements([]); 
    }
  };
  

  
  const handleToolSelect = (toolName) => {
    setTool(toolName);
    setSelectedTool(toolName);
  };
  
  const handleToolClick = (toolName) => {
    if (toolName !== selectedTool) {
      handleToolSelect(toolName);
    } else if (toolName === "pencil") {
      setShowPencilBox(!showPencilBox);
    }
  };
  
const handlePencilColorChange = (event) => {
  setPencilColor(event.target.value);
  if (darkMode) {
    event.target.style.color = "#ffffff";
  } else {
    event.target.style.color = "#000000";
  }
};


const handlePencilSizeChange = (event) => {
  setPencilSize(parseInt(event.target.value));
};

const toggleDarkMode = () => {
  setDarkMode(prevDarkMode => !prevDarkMode);
}

const handleTouchStart = event => {
  event.preventDefault();
  const { clientX, clientY } = event.touches[0];
  
  if (tool !== "selection") {
    const id = elements.length;
    const element = createElement(id, clientX, clientY, clientX, clientY, tool, pencilColor);
    setElements(prevState => [...prevState, element]);
    setSelectedElement(element);
    setAction(tool === "text" ? "writing" : "drawing");
  }
};

const handleTouchMove = event => {
  event.preventDefault(); 
  const { clientX, clientY } = event.touches[0];
  handleMouseMove({ clientX, clientY });
};

const handleTouchEnd = event => {
  event.preventDefault(); 
  handleMouseUp();
};

const handleTouchCancel = event => {
  event.preventDefault();
};

const handleShare = () => {
  const canvas = document.getElementById("canvas");
  const canvasDataURL = canvas.toDataURL("image/png");
  if (navigator.share) {
    navigator.share({
      title: "Share Title",
      text: "Share Description",
      url: window.location.href,
      files: [new File([canvasDataURL], "canvas_image.png", { type: "image/png" })],
    })
      .then(() => console.log("Successfully shared"))
      .catch((error) => console.log("Error sharing:", error));
  } else {
    console.log("Web Share API not supported");
  }
};

  return (
    <div>
      <Popup darkMode={darkMode} />
      <div>
      <Options 
        darkMode={darkMode} 
        toggleDropdown={toggleDropdown} 
        handleOpen={handleOpen} 
        handleSave={handleSave} 
        handleResetCanvas={handleResetCanvas} 
        toggleDarkMode={toggleDarkMode} 
        showDropdown={showDropdown} 
        handleFileInputChange={handleFileInputChange}
      />
      
      <div className="sharebtn">
      <button onClick={handleShare} title="Share"><FaShare />&nbsp;&nbsp;Share</button>
      </div>
    </div>
    <Toolbox
        selectedTool={selectedTool}
        handleToolClick={handleToolClick}
        undo={undo}
        redo={redo}
        darkMode={darkMode}
      />
      {action === "writing" ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: "fixed",
            top: selectedElement.y1 - 2 + panOffset.y,
            left: selectedElement.x1 + panOffset.x,
            font: "24px sans-serif",
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0, 
            resize: "auto",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent",
            zIndex: 2,
          }}
        />
      ) : null}
        {showPencilBox && (
          <div className={`pencil-box ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }}>
            <label htmlFor="pencil-color">Pen Color:</label>
            <input type="color" id="pencil-color" value={pencilColor} onChange={handlePencilColorChange} />
            <label htmlFor="pencil-size">Pen Size:</label>
            <input type="range" id="pencil-size" min="0.01" max="20" value={pencilSize} onChange={handlePencilSizeChange} />
          </div>
        )}

      <Canvas 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd} 
        onTouchCancel={handleTouchCancel} 
        darkMode={darkMode} 
      />


    </div>
  );
};

export default App;