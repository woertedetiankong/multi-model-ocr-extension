// offscreen.js - Handles image cropping using Canvas API in an offscreen document

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Offscreen received message type:", request.action);
  
  if (request.action === 'cropImage') {
    console.log("Processing cropImage request");
    
    // Check if we have valid data
    if (!request.imageDataUrl || typeof request.imageDataUrl !== 'string') {
      console.error("Invalid image data URL received");
      chrome.runtime.sendMessage({
        action: "croppingError",
        error: "Invalid image data received"
      }).catch(err => console.error("Failed to send error:", err));
      return true;
    }
    
    if (!request.coords || typeof request.coords !== 'object') {
      console.error("Invalid coordinates received");
      chrome.runtime.sendMessage({
        action: "croppingError",
        error: "Invalid coordinates received"
      }).catch(err => console.error("Failed to send error:", err));
      return true;
    }
    
    cropImage(request.imageDataUrl, request.coords)
      .then(croppedDataUrl => {
        console.log("Image cropped successfully, sending result");
        chrome.runtime.sendMessage({
          action: "croppedImageResult",
          imageDataUrl: croppedDataUrl
        }).catch(err => console.error("Failed to send cropped result:", err));
      })
      .catch(error => {
        console.error("Cropping error:", error);
        chrome.runtime.sendMessage({
          action: "croppingError",
          error: error.message || "Unknown cropping error"
        }).catch(err => console.error("Failed to send error:", err));
      });
    
    return true; // Keep the message channel open
  }
});

// Log when the script loads
console.log("Offscreen document script loaded and listening for messages");

function cropImage(imageDataUrl, coords) {
  return new Promise((resolve, reject) => {
    // Validate coordinates
    if (!coords || typeof coords !== 'object' || 
        coords.width <= 0 || coords.height <= 0 || 
        coords.left < 0 || coords.top < 0) {
      return reject(new Error("Invalid coordinates for cropping"));
    }
    
    // Create an image element to load the screenshot
    const img = new Image();
    
    // Set up event handlers for the image
    img.onload = () => {
      console.log("Image loaded in offscreen document. Size:", img.width, "x", img.height);
      
      try {
        const canvas = document.createElement('canvas');
        
        // Adjust coordinates and dimensions based on device pixel ratio for accurate cropping
        const scale = coords.devicePixelRatio || window.devicePixelRatio || 1;
        const sourceX = Math.round(coords.left * scale);
        const sourceY = Math.round(coords.top * scale);
        const sourceWidth = Math.round(coords.width * scale);
        const sourceHeight = Math.round(coords.height * scale);

        // Set canvas dimensions to the desired output size (not scaled)
        canvas.width = coords.width;
        canvas.height = coords.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D context from canvas"));
        }

        console.log(`Cropping parameters: sx=${sourceX}, sy=${sourceY}, sw=${sourceWidth}, sh=${sourceHeight}, dx=0, dy=0, dw=${canvas.width}, dh=${canvas.height}`);
        console.log(`Source image size: ${img.width} x ${img.height}, Scale factor: ${scale}`);

        // Safety checks to ensure we're not trying to crop outside the image bounds
        if (sourceX + sourceWidth > img.width || sourceY + sourceHeight > img.height) {
          console.warn("Crop region extends beyond image boundaries, adjusting...");
          // Adjust source dimensions to fit within the image
          const adjustedWidth = Math.min(sourceWidth, img.width - sourceX);
          const adjustedHeight = Math.min(sourceHeight, img.height - sourceY);
          
          // Adjust canvas dimensions proportionally
          canvas.width = Math.round(adjustedWidth / scale);
          canvas.height = Math.round(adjustedHeight / scale);
          
          console.log(`Adjusted parameters: sw=${adjustedWidth}, sh=${adjustedHeight}, dw=${canvas.width}, dh=${canvas.height}`);
        }

        // Draw the specified portion of the source image onto the canvas
        // void ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        ctx.drawImage(
          img,
          sourceX, 
          sourceY, 
          sourceWidth, 
          sourceHeight, 
          0, 
          0, 
          canvas.width, 
          canvas.height
        );

        console.log("Image drawn onto canvas successfully.");

        // Get the cropped image as a Data URL (default is PNG)
        try {
          const croppedDataUrl = canvas.toDataURL('image/png');
          console.log("Cropped image generated (Data URL length):", croppedDataUrl.length);
          resolve(croppedDataUrl);
        } catch (e) {
          console.error("Error generating Data URL:", e);
          // Handle potential security errors if canvas is tainted
          reject(new Error(`Failed to generate Data URL: ${e.message}`));
        }
      } catch (err) {
        console.error("Error during canvas operations:", err);
        reject(new Error(`Canvas operation failed: ${err.message}`));
      }
    };
    
    img.onerror = (error) => {
      console.error("Image loading failed in offscreen document:", error);
      reject(new Error("Failed to load image for cropping"));
    };
    
    // Set a timeout in case the image load hangs
    const timeout = setTimeout(() => {
      img.src = ''; // Cancel the image load
      reject(new Error("Image loading timed out"));
    }, 10000); // 10 second timeout
    
    // Clear the timeout if the image loads successfully
    img.onload = function() {
      clearTimeout(timeout);
      this.onload = null; // Remove the first handler
      
      // Now call the real handler
      console.log("Image loaded in offscreen document. Size:", img.width, "x", img.height);
      
      try {
        const canvas = document.createElement('canvas');
        
        // Adjust coordinates and dimensions based on device pixel ratio for accurate cropping
        const scale = coords.devicePixelRatio || window.devicePixelRatio || 1;
        const sourceX = Math.round(coords.left * scale);
        const sourceY = Math.round(coords.top * scale);
        const sourceWidth = Math.round(coords.width * scale);
        const sourceHeight = Math.round(coords.height * scale);

        // Set canvas dimensions to the desired output size (not scaled)
        canvas.width = coords.width;
        canvas.height = coords.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D context from canvas"));
        }

        console.log(`Cropping parameters: sx=${sourceX}, sy=${sourceY}, sw=${sourceWidth}, sh=${sourceHeight}, dx=0, dy=0, dw=${canvas.width}, dh=${canvas.height}`);
        console.log(`Source image size: ${img.width} x ${img.height}, Scale factor: ${scale}`);

        // Safety checks to ensure we're not trying to crop outside the image bounds
        if (sourceX + sourceWidth > img.width || sourceY + sourceHeight > img.height) {
          console.warn("Crop region extends beyond image boundaries, adjusting...");
          // Adjust source dimensions to fit within the image
          const adjustedWidth = Math.min(sourceWidth, img.width - sourceX);
          const adjustedHeight = Math.min(sourceHeight, img.height - sourceY);
          
          // Adjust canvas dimensions proportionally
          canvas.width = Math.round(adjustedWidth / scale);
          canvas.height = Math.round(adjustedHeight / scale);
          
          console.log(`Adjusted parameters: sw=${adjustedWidth}, sh=${adjustedHeight}, dw=${canvas.width}, dh=${canvas.height}`);
        }

        // Draw the specified portion of the source image onto the canvas
        // void ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        ctx.drawImage(
          img,
          sourceX, 
          sourceY, 
          sourceWidth, 
          sourceHeight, 
          0, 
          0, 
          canvas.width, 
          canvas.height
        );

        console.log("Image drawn onto canvas successfully.");

        // Get the cropped image as a Data URL (default is PNG)
        try {
          const croppedDataUrl = canvas.toDataURL('image/png');
          console.log("Cropped image generated (Data URL length):", croppedDataUrl.length);
          resolve(croppedDataUrl);
        } catch (e) {
          console.error("Error generating Data URL:", e);
          // Handle potential security errors if canvas is tainted
          reject(new Error(`Failed to generate Data URL: ${e.message}`));
        }
      } catch (err) {
        console.error("Error during canvas operations:", err);
        reject(new Error(`Canvas operation failed: ${err.message}`));
      }
    };
    
    console.log("Setting image source in offscreen document.");
    img.src = imageDataUrl;
  });
}

console.log("Offscreen script loaded.");
