import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaMousePointer, FaPencilAlt, FaFont, FaUndo, FaRedo, FaFolderOpen } from "react-icons/fa";
import { MdOutlineRectangle, MdOutlineSaveAlt, MdDelete, MdDarkMode  } from "react-icons/md";
import { IoRemoveOutline,IoCloseSharp } from "react-icons/io5";
import rough from "roughjs/bundled/rough.esm";
import { HiOutlineBars3 } from "react-icons/hi2";
import getStroke from "perfect-freehand";
import Draggable from "react-draggable";
import "./App.css";
const generator = rough.generator();

const createElement = (id, x1, y1, x2, y2, type, pencilColor) => {
  switch (type) {
    case "line":
    case "rectangle":
    case "triangle":
    case "ellipse":
      const roughElement =
        type === "line"
          ? generator.line(x1, y1, x2, y2)
          : type === "rectangle"
          ? generator.rectangle(x1, y1, x2 - x1, y2 - y1)
          : type === "triangle"
          ? generator.polygon([
              [x1, y1],
              [(x1 + x2) / 2, y2],
              [x2, y1],
            ])
          : generator.ellipse((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
      return { id, x1, y1, x2, y2, type, roughElement, pencilColor };
    case "pencil":
      return { id, type, points: [{ x: x1, y: y1 }], pencilColor };
    case "text":
      return { id, type, x1, y1, x2, y2, text: "", pencilColor };
    default:
      throw new Error(`Type not recognised: ${type}`);
  }
};


const nearPoint = (x, y, x1, y1, name) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

const onLine = (x1, y1, x2, y2, x, y, maxDistance = 1) => {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };
  const offset = distance(a, b) - (distance(a, c) + distance(b, c));
  return Math.abs(offset) < maxDistance ? "inside" : null;
};

const positionWithinElement = (x, y, element) => {
  const { type, x1, x2, y1, y2 } = element;
  switch (type) {
    case "line":
      const on = onLine(x1, y1, x2, y2, x, y);
      const start = nearPoint(x, y, x1, y1, "start");
      const end = nearPoint(x, y, x2, y2, "end");
      return start || end || on;
    case "rectangle":
      const topLeft = nearPoint(x, y, x1, y1, "tl");
      const topRight = nearPoint(x, y, x2, y1, "tr");
      const bottomLeft = nearPoint(x, y, x1, y2, "bl");
      const bottomRight = nearPoint(x, y, x2, y2, "br");
      const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
      return topLeft || topRight || bottomLeft || bottomRight || inside;
    case "pencil":
      const betweenAnyPoint = element.points.some((point, index) => {
        const nextPoint = element.points[index + 1];
        if (!nextPoint) return false;
        return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null;
      });
      return betweenAnyPoint ? "inside" : null;
    case "text":
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    default:
      throw new Error(`Type not recognised: ${type}`);
  }
};

const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const getElementAtPosition = (x, y, elements) => {
  return elements
    .map(element => ({ ...element, position: positionWithinElement(x, y, element) }))
    .find(element => element.position !== null);
};

const adjustElementCoordinates = element => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === "rectangle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
};

const cursorForPosition = position => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    default:
      return "move";
  }
};

const resizedCoordinates = (clientX, clientY, position, coordinates) => {
  const { x1, y1, x2, y2 } = coordinates;
  switch (position) {
    case "tl":
    case "start":
      return { x1: clientX, y1: clientY, x2, y2 };
    case "tr":
      return { x1, y1: clientY, x2: clientX, y2 };
    case "bl":
      return { x1: clientX, y1, x2, y2: clientY };
    case "br":
    case "end":
      return { x1, y1, x2: clientX, y2: clientY };
    default:
      return null;
  }
};

const useHistory = initialState => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = (action, overwrite = false) => {
    const newState = typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex(prevState => prevState + 1);
    }
  };

  const undo = () => index > 0 && setIndex(prevState => prevState - 1);
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1);

  return [history[index], setState, undo, redo];
};

const getSvgPathFromStroke = stroke => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};

const drawElement = (roughCanvas, context, element, pencilColor, pencilSize, darkMode) => {
  switch (element.type) {
    case "line":
    case "rectangle":
      context.strokeStyle = darkMode ? '#ffffff' : pencilColor; 
      roughCanvas.draw(element.roughElement);
      break;
    case "pencil":
      context.fillStyle = darkMode ? '#ffffff' : pencilColor; 
      context.strokeStyle = darkMode ? '#ffffff' : pencilColor; 
      context.lineWidth = pencilSize;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.beginPath();
      const stroke = getStroke(element.points);
      const path = new Path2D(getSvgPathFromStroke(stroke));
      context.stroke(path);
      context.fill(path);
      break;
    case "text":
      context.fillStyle = darkMode ? '#ffffff' : pencilColor; 
      context.textBaseline = "top";
      context.font = "24px sans-serif";
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      throw new Error(`Type not recognised: ${element.type}`);
  }
};





const adjustmentRequired = type => ["line", "rectangle"].includes(type);

const usePressedKeys = () => {
  const [pressedKeys, setPressedKeys] = useState(new Set());

  useEffect(() => {
    const handleKeyDown = event => {
      setPressedKeys(prevKeys => new Set(prevKeys).add(event.key));
    };

    const handleKeyUp = event => {
      setPressedKeys(prevKeys => {
        const updatedKeys = new Set(prevKeys);
        updatedKeys.delete(event.key);
        return updatedKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return pressedKeys;
};

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
  const [pencilColor, setPencilColor] = useState("#000000"); 
  const [pencilSize, setPencilSize] = useState(1); 
  const [showPopup, setShowPopup] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
      // Check if it's a touch-enabled device
      if ('ontouchstart' in window) {
        setAction("touch-drawing"); // Set a new action for touch devices
        setSelectedElement(null); // Clear selected element
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
    const dataURL = canvas.toDataURL(); 
    const anchor = document.createElement('a');
    anchor.href = dataURL;
    anchor.download = 'webdraw.png'; 
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
  
  const handlePencilClick = () => {
    setShowPencilBox(prevState => !prevState);
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

const handleClosePopup = () => {
  setShowPopup(false);
};
const toggleDarkMode = () => {
  setDarkMode(prevDarkMode => !prevDarkMode);
}

// Remove handleMouseDown event handler

const handleTouchStart = event => {
  event.preventDefault(); // Prevent default touch behavior
  const { clientX, clientY } = event.touches[0];
  
  // Start drawing immediately after selecting a tool
  if (tool !== "selection") {
    const id = elements.length;
    const element = createElement(id, clientX, clientY, clientX, clientY, tool, pencilColor);
    setElements(prevState => [...prevState, element]);
    setSelectedElement(element);
    setAction(tool === "text" ? "writing" : "drawing");
  }
};

const handleTouchMove = event => {
  event.preventDefault(); // Prevent default touch behavior
  const { clientX, clientY } = event.touches[0];
  handleMouseMove({ clientX, clientY });
};

const handleTouchEnd = event => {
  event.preventDefault(); // Prevent default touch behavior
  handleMouseUp();
};

const handleTouchCancel = event => {
  event.preventDefault(); // Prevent default touch behavior
  // Add your touch cancellation handling logic here
};

  return (
    <div>
      {showPopup && (
      <div className={`popup ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000'}}>
          <button className={`popupbtn ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000'}} onClick={handleClosePopup}><IoCloseSharp /></button>
          <div className="popup-content">
            <h2>Notice</h2>
            <p>Currently added : Size and Color of Pen. ( Issues )</p>
            <p>Cursor is now CrossHair.</p>
            <p>Added Dark Mode!</p>
            <p>Note : Website is in Early Development there are issues to be solved.</p>
          </div>
        </div>
      )}
      <div>
      <div className={`options ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }}>
        <button className={`btnoption ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }} onClick={toggleDropdown}><HiOutlineBars3/></button>
        {showDropdown && (
      <div className={`dropdown-content ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }}>
            <button onClick={handleOpen}><FaFolderOpen/>&nbsp;&nbsp;Open</button>
            <input id="file-input" type="file" onChange={handleFileInputChange} style={{ display: 'none' }} />

            <button onClick={handleSave}><MdOutlineSaveAlt/>&nbsp;&nbsp;Save</button>
            <button onClick={handleResetCanvas}><MdDelete/>&nbsp;&nbsp;Reset the Canvas</button> {/* Add the reset button */}
            <button onClick={toggleDarkMode}><MdDarkMode />&nbsp;&nbsp;Dark Mode</button>
          </div>
        )}
      </div>
      

    </div>
    <Draggable>
    <div className={`toolbox-container ${darkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: darkMode ? '#232329' : '#ffffff', color: darkMode ? '#ffffff' : '#000000', border: darkMode ? '#ffffff' : '#000000'  }}>
        <div className="toolbox">
          <button className={selectedTool === "selection" ? "selected" : ""} onClick={() => handleToolClick("selection")} title="Selection"><FaMousePointer /></button>
          <button className={selectedTool === "line" ? "selected" : ""} onClick={() => handleToolClick("line")} title="Line"><IoRemoveOutline /></button>
          <button className={selectedTool === "rectangle" ? "selected" : ""} onClick={() => handleToolClick("rectangle")} title="Rectangle"><MdOutlineRectangle /></button>
          <button className={selectedTool === "pencil" ? "selected" : ""} onClick={() => { handlePencilClick(); handleToolClick("pencil"); }} title="Pen"><FaPencilAlt /></button>
          <button className={selectedTool === "text" ? "selected" : ""} onClick={() => handleToolClick("text")} title="Text"><FaFont /></button>
          <button onClick={undo} title="Undo"><FaUndo /></button>
          <button onClick={redo} title="Redo"><FaRedo /></button>
        </div>
      </div>
    </Draggable>
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
          <div className="pencil-box">
            <label htmlFor="pencil-color">Pen Color:</label>
            <input type="color" id="pencil-color" value={pencilColor} onChange={handlePencilColorChange} />
            <label htmlFor="pencil-size">Pen Size:</label>
            <input type="range" id="pencil-size" min="0.01" max="20" value={pencilSize} onChange={handlePencilSizeChange} />
          </div>
        )}

    <canvas
      id="canvas"
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel} 
      style={{ 
        position: "absolute", 
        zIndex: 1,
        backgroundColor: darkMode ? "#2e2e2e" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000" 
      }}
    >
      Canvas
    </canvas>

    </div>
  );
};

export default App;