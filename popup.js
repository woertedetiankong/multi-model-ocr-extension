// popup.js - Logic for the Multi-Model OCR Extension popup

const resultArea = document.getElementById('result-area');
const statusArea = document.getElementById('status-area');
const copyButton = document.getElementById('copy-button');
const fileUpload = document.getElementById('file-upload');
const uploadLabel = document.getElementById('upload-label');
const providerNameSpan = document.getElementById('provider-name');
const openOptionsLink = document.getElementById('open-options');
const modelToggle = document.getElementById('model-toggle');

// Track current provider
let currentProvider = 'gemini';

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showResult") {
    resultArea.textContent = request.text;
    statusArea.textContent = 'Done.';
    copyButton.disabled = false;
    
    // Show which model was used if provided
    if (request.modelUsed) {
      const modelTag = document.createElement('span');
      modelTag.className = 'model-info';
      modelTag.textContent = getModelDisplayName(request.modelUsed);
      statusArea.appendChild(modelTag);
    }
  } else if (request.action === "updateStatus") {
    statusArea.textContent = request.message;
    resultArea.textContent = ''; // Clear previous result
    copyButton.disabled = true;
    
    // Show which model is being used if provided
    if (request.modelUsed) {
      const modelTag = document.createElement('span');
      modelTag.className = 'model-info';
      modelTag.textContent = getModelDisplayName(request.modelUsed);
      statusArea.appendChild(modelTag);
    }
  }
});

// Helper function to convert model ID to display name
function getModelDisplayName(modelId) {
  const modelNames = {
    // Gemini models
    'gemini-2.5-pro-exp-03-25': 'Gemini 2.5 Pro',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    // Qwen models
    'qwen-vl-ocr': 'Qwen VL OCR',
    'qwen-vl-ocr-latest': 'Qwen VL OCR Latest'
  };
  
  return modelNames[modelId] || modelId;
}

// Add event listener for the copy button
copyButton.addEventListener('click', () => {
  const textToCopy = resultArea.textContent;
  if (textToCopy) {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        statusArea.textContent = 'Text copied to clipboard!';
        // Optionally change button text briefly
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy Text';
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        statusArea.textContent = 'Error copying text.';
      });
  } else {
    statusArea.textContent = 'Nothing to copy.';
  }
});

// Add event listener for file upload
fileUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    
    // Update status while reading file
    statusArea.textContent = 'Reading image file...';
    resultArea.textContent = ''; // Clear previous result
    copyButton.disabled = true;
    
    reader.onload = function(e) {
      const imageDataUrl = e.target.result;
      console.log("Image loaded, data URL length:", imageDataUrl?.length);
      statusArea.textContent = 'Processing uploaded image...';
      
      // Send the image data URL to the background script
      chrome.runtime.sendMessage({ 
        action: "processImage", 
        imageDataUrl: imageDataUrl 
      });
    }
    
    reader.onerror = function(e) {
        console.error("File reading error:", e);
        statusArea.textContent = 'Error reading file.';
    }

    reader.readAsDataURL(file);
  } else if (file) {
      statusArea.textContent = 'Please select an image file.';
  }
  // Reset file input to allow uploading the same file again
  event.target.value = null; 
});

// Add click handler for options link
openOptionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Model toggle handling
function setToggleFromStorage() {
  chrome.storage.sync.get(['apiProvider', 'geminiModel', 'qwenModel'], (result) => {
    // Update provider display
    currentProvider = result.apiProvider || 'gemini';
    updateProviderDisplay();
    
    if (currentProvider === 'gemini') {
      // Set the toggle based on the current Gemini model
      // Checked = Accuracy mode (Gemini 2.5 Pro)
      // Unchecked = Speed mode (Gemini 1.5 Flash)
      modelToggle.checked = (result.geminiModel === 'gemini-2.5-pro-exp-03-25');
    } else if (currentProvider === 'qwen') {
      // Set the toggle based on the current Qwen model
      // Checked = Latest model (qwen-vl-ocr-latest)
      // Unchecked = Standard model (qwen-vl-ocr)
      modelToggle.checked = (result.qwenModel === 'qwen-vl-ocr-latest');
    }
  });
}

// Update the provider display
function updateProviderDisplay() {
  if (currentProvider === 'gemini') {
    providerNameSpan.textContent = 'Google Gemini';
  } else if (currentProvider === 'qwen') {
    providerNameSpan.textContent = 'Alibaba Qwen';
  } else {
    providerNameSpan.textContent = currentProvider;
  }
}

// Initialize the toggle state
setToggleFromStorage();

// Handle toggle changes
modelToggle.addEventListener('change', (event) => {
  // Get current API provider
  chrome.storage.sync.get(['apiProvider'], (result) => {
    const provider = result.apiProvider || 'gemini';
    
    let settingToUpdate = {};
    let statusMessage = '';
    
    if (provider === 'gemini') {
      // For Gemini: toggle between accuracy and speed models
      const newModel = event.target.checked ? 
        'gemini-2.5-pro-exp-03-25' : // Accuracy mode selected
        'gemini-1.5-flash';         // Speed mode selected
      
      settingToUpdate = { geminiModel: newModel };
      statusMessage = event.target.checked ? 
        'Switched to Gemini Accuracy mode (more accurate but slower)' : 
        'Switched to Gemini Speed mode (faster but less detailed)';
    } 
    else if (provider === 'qwen') {
      // For Qwen: toggle between latest and standard models
      const newModel = event.target.checked ? 
        'qwen-vl-ocr-latest' : // Latest model
        'qwen-vl-ocr';        // Standard model
      
      settingToUpdate = { qwenModel: newModel };
      statusMessage = event.target.checked ? 
        'Switched to Qwen Latest model (newest features)' : 
        'Switched to Qwen Standard model (stable version)';
    }
    
    // Save the new model preference
    chrome.storage.sync.set(settingToUpdate, () => {
      console.log(`Model switched to: ${JSON.stringify(settingToUpdate)}`);
      
      // Show a brief status message
      const originalText = statusArea.textContent;
      statusArea.textContent = statusMessage;
      
      // Restore previous status after 3 seconds
      setTimeout(() => {
        statusArea.textContent = originalText;
      }, 3000);
    });
  });
});

// Check API key and provider on popup load
chrome.storage.sync.get(['apiProvider', 'geminiApiKey', 'qwenApiKey'], (result) => {
  const provider = result.apiProvider || 'gemini';
  let apiKeyMissing = false;
  
  if (provider === 'gemini' && !result.geminiApiKey) {
    apiKeyMissing = true;
    statusArea.textContent = 'Gemini API Key not configured. Please set your API Key in options.';
  } else if (provider === 'qwen' && !result.qwenApiKey) {
    apiKeyMissing = true;
    statusArea.textContent = 'Qwen API Key not configured. Please set your API Key in options.';
  }
  
  if (apiKeyMissing) {
    // Disable upload functionality
    fileUpload.disabled = true;
    uploadLabel.style.opacity = '0.5';
    uploadLabel.style.cursor = 'not-allowed';
  }
  
  // Update provider display
  currentProvider = provider;
  updateProviderDisplay();
});

// Initial state
copyButton.disabled = true; // Disable copy button initially
console.log("Popup script loaded.");
