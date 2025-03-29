// content_script.js - Handles screenshot selection UI in the active tab

let overlay = null;
let selectionBox = null;
let startX, startY, isSelecting = false;

// Listen for message from background script to start selection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelection") {
    console.log("Content script received startSelection message.");
    createOverlay();
    sendResponse({ status: "Selection UI initiated" }); // Optional: send confirmation
    // The async part happens when the user finishes selection and we send 'captureArea' back.
  } else if (request.action === "ping") {
    // Respond to ping to check if content script is already injected
    console.log("Received ping, responding with active status");
    sendResponse({ status: "active" });
  }
  // Return true to indicate we'll send an async response
  return true;
});

function createOverlay() {
  // Avoid creating multiple overlays
  if (document.getElementById('ocr-selection-overlay')) {
    console.log("Overlay already exists.");
    return;
  }

  console.log("Creating overlay...");
  overlay = document.createElement('div');
  overlay.id = 'ocr-selection-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black
  overlay.style.cursor = 'crosshair';
  overlay.style.zIndex = '99999999'; // Ensure it's on top

  selectionBox = document.createElement('div');
  selectionBox.id = 'ocr-selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #fff'; // White dashed border
  selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Slightly visible box
  selectionBox.style.display = 'none'; // Initially hidden
  overlay.appendChild(selectionBox);

  document.body.appendChild(overlay);

  // Add event listeners for selection
  overlay.addEventListener('mousedown', handleMouseDown);
  overlay.addEventListener('mousemove', handleMouseMove);
  overlay.addEventListener('mouseup', handleMouseUp);
  
  // Add listener for Escape key to cancel
  document.addEventListener('keydown', handleKeyDown);

  console.log("Overlay created and listeners added.");
}

function handleMouseDown(e) {
  // Prevent dragging images or links
  e.preventDefault(); 
  
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block'; // Show the box
  console.log("Mouse down at:", startX, startY);
}

function handleMouseMove(e) {
  if (!isSelecting) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  // Calculate dimensions and position, handling dragging in any direction
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(currentX, startX);
  const top = Math.min(currentY, startY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function handleMouseUp(e) {
  if (!isSelecting) return;
  isSelecting = false;
  console.log("Mouse up");

  const rect = selectionBox.getBoundingClientRect();
  cleanupOverlay(); // Remove overlay after selection

  if (rect.width > 5 && rect.height > 5) { // Basic check for a valid selection
    console.log("Selection made:", rect);
    // Send coordinates to background script to capture the screen area
    chrome.runtime.sendMessage({ 
        action: "captureArea", 
        coords: { 
            left: Math.round(rect.left), 
            top: Math.round(rect.top), 
            width: Math.round(rect.width), 
            height: Math.round(rect.height),
            devicePixelRatio: window.devicePixelRatio // Important for high-DPI screens
        } 
    });
  } else {
    console.log("Selection too small, cancelled.");
  }
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        console.log("Escape pressed, cancelling selection.");
        cleanupOverlay();
    }
}

function cleanupOverlay() {
  console.log("Cleaning up overlay...");
  if (overlay) {
    overlay.removeEventListener('mousedown', handleMouseDown);
    overlay.removeEventListener('mousemove', handleMouseMove);
    overlay.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    overlay = null;
    selectionBox = null;
    console.log("Overlay removed.");
  }
}

// Initial log to confirm script injection
console.log("Content script loaded.");
