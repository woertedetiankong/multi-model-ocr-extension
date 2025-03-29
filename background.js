// background.js - Handles background tasks for Gemini OCR Extension

// Add more error handling for the Gemini 2.5 model
function shouldAutoRetryWithFallbackModel(error, model) {
  // Always retry with fallback model if the primary model is 2.5 Pro and we get these errors
  if (model === 'gemini-2.5-pro-exp-03-25') {
    // List of errors that warrant an automatic fallback
    const fallbackErrors = [
      'TIMEOUT_ERROR',
      'Rate limit',
      'non-JSON response',
      'SyntaxError',
      'unexpected token',
      'Unexpected token',
      'DOCTYPE'
    ];
    
    // Check if error message contains any of the fallback triggers
    return fallbackErrors.some(errorText => 
      error.message && error.message.includes(errorText)
    );
  }
  
  return false;
}

// Listen for the shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  // Log ALL commands received for debugging
  console.log(`Command received: ${command}`); 
  if (command === "take-screenshot") {
    console.log("Take screenshot command confirmed. Injecting content script...");
    // Inject content script to handle screenshot selection
    await injectContentScript(); 
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);

  if (request.action === "processImage") {
    console.log("Received uploaded image data URL, processing...");
    updatePopupStatus("Processing uploaded image...");
    
    // Get API Key and model from storage
    getApiSettings().then(settings => {
      const provider = settings.apiProvider;
      
      // Check for API key based on selected provider
      if (provider === 'gemini' && !settings.geminiApiKey) {
        const errorMsg = "Gemini API Key not configured. Please set your API Key in extension options.";
        console.error(errorMsg);
        showNotification("Configuration Required", errorMsg);
        updatePopupStatus(errorMsg);
        return;
      } else if (provider === 'qwen' && !settings.qwenApiKey) {
        const errorMsg = "Qwen API Key not configured. Please set your API Key in extension options.";
        console.error(errorMsg);
        showNotification("Configuration Required", errorMsg);
        updatePopupStatus(errorMsg);
        return;
      }
      
      // Add extra debugging for image data
      console.log("Image data URL length:", request.imageDataUrl?.length);
      console.log("Image data URL type:", typeof request.imageDataUrl);
      if (typeof request.imageDataUrl !== 'string' || !request.imageDataUrl.startsWith('data:')) {
        const errMsg = "Invalid image data received. Please try again.";
        console.error(errMsg);
        updatePopupStatus(errMsg);
        return;
      }
      
      try {
        // Call appropriate API based on provider setting
        if (settings.apiProvider === 'gemini') {
          callGeminiApi(request.imageDataUrl, settings.geminiApiKey, settings.geminiModel)
            .then(result => {
              console.log("API call successful, sending result");
              sendTextResult(result.text, result.model);
            })
            .catch(error => {
              console.error("API call failed for uploaded image:", error);
              showNotification("Error", `OCR failed: ${error.message}`);
              updatePopupStatus(`Error: ${error.message}`);
            });
        } else if (settings.apiProvider === 'qwen') {
          // Call Qwen OCR API directly
          callQwenOcrApi(request.imageDataUrl, settings.qwenApiKey, settings.qwenModel)
            .then(result => {
              console.log("Qwen API call successful, sending result");
              sendTextResult(result.text, result.model);
            })
            .catch(error => {
              console.error("Qwen API call failed for uploaded image:", error);
              showNotification("Error", `OCR failed: ${error.message}`);
              updatePopupStatus(`Error: ${error.message}`);
            });
        }
      } catch (error) {
        console.error("Exception during API call:", error);
        updatePopupStatus(`Error: ${error.message}`);
      }
    });
    
    // Keep the message channel open for asynchronous response
    return true; 
  } else if (request.action === "captureArea") {
    console.log("Background received captureArea request with coords:", request.coords);
    handleCaptureArea(request.coords);
    return true; // Keep channel open for async capture/crop
  } else if (request.action === "croppedImageResult") {
    console.log("Background received cropped image result. Data URL length:", request.imageDataUrl?.length); // Log reception
    // Now process the cropped image
    updatePopupStatus("Processing cropped image...");
    // Get API Key and model from storage
    getApiSettings().then(settings => {
      const provider = settings.apiProvider;
      
      // Check for API key based on selected provider
      if (provider === 'gemini' && !settings.geminiApiKey) {
        const errorMsg = "Gemini API Key not configured. Please set your API Key in extension options.";
        console.error(errorMsg);
        showNotification("Configuration Required", errorMsg);
        updatePopupStatus(errorMsg);
        closeOffscreenDocument();
        return;
      } else if (provider === 'qwen' && !settings.qwenApiKey) {
        const errorMsg = "Qwen API Key not configured. Please set your API Key in extension options.";
        console.error(errorMsg);
        showNotification("Configuration Required", errorMsg);
        updatePopupStatus(errorMsg);
        closeOffscreenDocument();
        return;
      }
    
      // Try to crop the image with higher precision
      console.log("Processing cropped image..."); // Log before API call
      try {
        // Call appropriate API based on provider setting
        if (settings.apiProvider === 'gemini') {
          callGeminiApi(request.imageDataUrl, settings.geminiApiKey, settings.geminiModel)
            .then(result => {
              console.log("API call successful for cropped image. Sending result to popup.");
              sendTextResult(result.text, result.model);
            })
            .catch(error => {
              console.error("API call failed for cropped image:", error); // Log failure
              showNotification("Error", `OCR failed: ${error.message}`);
              updatePopupStatus(`Error: ${error.message}`);
            })
            .finally(() => {
              // Close the offscreen document as it's no longer needed for this task
              closeOffscreenDocument(); 
            });
        } else if (settings.apiProvider === 'qwen') {
          // Call Qwen OCR API directly
          callQwenOcrApi(request.imageDataUrl, settings.qwenApiKey, settings.qwenModel)
            .then(result => {
              console.log("Qwen API call successful for cropped image. Sending result to popup.");
              sendTextResult(result.text, result.model);
            })
            .catch(error => {
              console.error("Qwen API call failed for cropped image:", error);
              showNotification("Error", `OCR failed: ${error.message}`);
              updatePopupStatus(`Error: ${error.message}`);
            })
            .finally(() => {
              // Close the offscreen document as it's no longer needed for this task
              closeOffscreenDocument();
            });
        }
      } catch (error) {
        console.error("Exception during API call setup:", error);
        showNotification("Error", `Processing failed: ${error.message}`);
        updatePopupStatus(`Error: ${error.message}`);
        closeOffscreenDocument();
      }
    });
    return true; // Indicate async handling if API call is async
  } else if (request.action === "croppingError") {
    console.error("Background received cropping error:", request.error);
    showNotification("Error", `Image cropping failed: ${request.error}`);
    updatePopupStatus(`Error: ${request.error}`);
    closeOffscreenDocument(); // Close even on error
  }
  // Handle other messages if needed
});

// --- Offscreen Document Management ---
let creatingOffscreen; // Promise
let offscreenDocumentPath = 'offscreen.html';

// Function to ensure the offscreen document is available
async function setupOffscreenDocument() {
  // Check if we already have an offscreen document.
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(offscreenDocumentPath)]
  });

  if (existingContexts.length > 0) {
    console.log("Offscreen document already exists.");
    return;
  }

  // Avoid race conditions create only one instance
  if (creatingOffscreen) {
    await creatingOffscreen;
  } else {
    console.log("Creating offscreen document...");
    creatingOffscreen = chrome.offscreen.createDocument({
      url: offscreenDocumentPath,
      reasons: ['BLOBS', 'DOM_PARSER'],
      justification: 'Image cropping requires Canvas API access.',
    });
    try {
        await creatingOffscreen;
        console.log("Offscreen document created successfully.");
    } catch (error) {
        console.error("Error creating offscreen document:", error);
    } finally {
        creatingOffscreen = null;
    }
  }
}

// Function to close the offscreen document
async function closeOffscreenDocument() {
    // Check if an offscreen document exists before trying to close it.
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(offscreenDocumentPath)]
    });
    if (existingContexts.length > 0) {
        console.log("Closing offscreen document...");
        await chrome.offscreen.closeDocument();
        console.log("Offscreen document closed.");
    } else {
        console.log("No active offscreen document to close.");
    }
}

// --- Screenshot Handling ---
async function handleCaptureArea(coords) {
  try {
    // 1. Capture the visible tab
    console.log("Capturing visible tab...");
    updatePopupStatus("Capturing screen..."); // Inform popup
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    console.log("Screenshot captured (Data URL length):", screenshotDataUrl.length);
    updatePopupStatus("Cropping selection...");

    // 2. Ensure offscreen document is ready
    await setupOffscreenDocument();

    // 3. Send image and coordinates to offscreen document for cropping
    console.log("Sending image to offscreen document for cropping...");
    chrome.runtime.sendMessage({
      action: 'cropImage',
      imageDataUrl: screenshotDataUrl,
      coords: coords
    });

  } catch (error) {
    console.error("Error during capture or sending to offscreen:", error);
    showNotification("Error", `Screenshot capture/crop failed: ${error.message}`);
    updatePopupStatus(`Error: ${error.message}`);
    closeOffscreenDocument(); // Attempt cleanup on error
  }
}

async function injectContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if the tab exists and has an ID and URL
    if (tab?.id && tab.url) {
      // Check if the URL is restricted
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/webstore/')) {
        console.warn(`Attempted to inject script into restricted URL: ${tab.url}`);
        showNotification("Cannot Screenshot Here", "This extension cannot take screenshots on Chrome internal pages or the Web Store.");
        return; // Stop execution if the URL is restricted
      }

      // Proceed with injection if the URL is okay
      console.log(`Injecting content script into tab ${tab.id} with URL: ${tab.url}`);
      
      // Check if content script is already injected to avoid duplicates
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "ping" });
        if (response && response.status === "active") {
          console.log("Content script already active, sending start selection message");
          chrome.tabs.sendMessage(tab.id, { action: "startSelection" });
          return;
        }
      } catch (e) {
        // No content script exists, proceed with injection
        console.log("Content script not yet injected");
      }
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_script.js']
      });
      console.log("Injected content_script.js");
      
      // Wait a short time before sending the message to ensure script is loaded
      setTimeout(() => {
        // Send a message to content script to start selection UI
        chrome.tabs.sendMessage(tab.id, { action: "startSelection" });
      }, 100);
    } else {
      console.error("Could not find active tab ID.");
      showNotification("Error", "Could not find active tab to take screenshot.");
    }
  } catch (error) {
    console.error("Error injecting content script:", error);
    showNotification("Error", `Failed to initiate screenshot: ${error.message}`);
  }
}

// Function to send result back to popup
function sendTextResult(text, modelUsed) {
  // Ensure popup is open before sending message (optional but good practice)
  // chrome.action.openPopup(() => { // Requires callback in MV3? Check docs. Might not be needed if popup opens automatically.
       chrome.runtime.sendMessage({ 
         action: "showResult", 
         text: text,
         modelUsed: modelUsed // Include which model was used
       });
  // });
}

// Function to update status in the popup
function updatePopupStatus(message, modelUsed) {
    chrome.runtime.sendMessage({ 
      action: "updateStatus", 
      message: message,
      modelUsed: modelUsed // Include which model is being used
    });
}

// Function to show notifications (requires "notifications" permission)
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.svg',
    title: title,
    message: message,
    priority: 1
  });
}

// Function to get API settings from storage
async function getApiSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'apiProvider', 
      'geminiApiKey', 
      'geminiModel', 
      'qwenApiKey', 
      'qwenModel'
    ], (result) => {
      resolve({
        apiProvider: result.apiProvider || 'gemini',
        geminiApiKey: result.geminiApiKey || '',
        geminiModel: result.geminiModel || 'gemini-2.5-pro-exp-03-25',
        qwenApiKey: result.qwenApiKey || '',
        qwenModel: result.qwenModel || 'qwen-vl-ocr'
      });
    });
  });
}

// Function to get model-specific generation config
function getGenerationConfig(model) {
  // Base config that works for most models
  const baseConfig = {
    "temperature": 0.2,
    "topP": 1,
    "topK": 32,
    "maxOutputTokens": 2048,
  };
  
  // Model-specific adjustments
  if (model === 'gemini-2.5-pro-exp-03-25') {
    return {
      "temperature": 0.1,  // Lower temperature for more deterministic/accurate results
      "topP": 0.95,
      "topK": 40,
      "maxOutputTokens": 4096,  // Allow longer outputs
    };
  }
  
  return baseConfig;
}

// --- Gemini API Call with auto-fallback ---
async function callGeminiApi(imageDataUrl, apiKey, model) {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in the extension options.");
  }
  
  // Use the selected model or fall back to a default
  const primaryModel = model || 'gemini-2.5-pro-exp-03-25';
  const fallbackModel = 'gemini-1.5-flash'; // Faster fallback model
  
  // Decide if we should try the primary model first (always try if it's not 2.5 Pro)
  let shouldTryPrimary = true;
  
  // Check if we've had issues with the primary model recently
  if (primaryModel === 'gemini-2.5-pro-exp-03-25') {
    // Get the failure flag from chrome.storage.local
    const failureStatus = await new Promise(resolve => {
      chrome.storage.local.get('gemini_ocr_2_5_pro_failed', (result) => {
        resolve(result.gemini_ocr_2_5_pro_failed || false);
      });
    });
    
    shouldTryPrimary = !failureStatus;
  }
  
  // Determine which model to try first
  let modelToUse = shouldTryPrimary ? primaryModel : fallbackModel;
  let isUsingFallback = !shouldTryPrimary;
  
  try {
    // If using the primary model (2.5 Pro), set a timeout for fallback
    if (modelToUse === 'gemini-2.5-pro-exp-03-25') {
      // Setup a race between the API call and a timeout
      updatePopupStatus("Processing with advanced model...", modelToUse);
      const result = await Promise.race([
        // The actual API call
        makeApiRequest(imageDataUrl, apiKey, modelToUse),
        // A timeout that will reject after 10 seconds
        new Promise((_, reject) => setTimeout(() => {
          reject(new Error("TIMEOUT_ERROR"));
        }, 10000)) // 10 second timeout
      ]);
      
      // If we got here, the primary model worked within the timeout
      // Clear any previous failure flag
      chrome.storage.local.remove('gemini_ocr_2_5_pro_failed', () => {
        console.log('Cleared model failure flag due to successful response');
      });
      return result;
    } else {
      // For other models, just make the API call without a timeout
      updatePopupStatus(isUsingFallback ? 
        "Using faster model due to previous timeout..." : 
        "Processing image...", modelToUse);
      return await makeApiRequest(imageDataUrl, apiKey, modelToUse);
    }
  } catch (error) {
    console.error(`API call failed with model ${modelToUse}:`, error);
    
    // If we get an error that warrants automatic fallback, try the fallback model
    if (shouldAutoRetryWithFallbackModel(error, modelToUse)) {
      // Set a flag to remember that 2.5 Pro had issues
      chrome.storage.local.set({ 
        'gemini_ocr_2_5_pro_failed': true,
        'gemini_ocr_2_5_pro_failed_timestamp': Date.now()
      }, () => {
        console.log('Set model failure flag due to timeout or rate limit');
      });
      
      // Set up automatic expiration after 30 minutes
      setTimeout(() => {
        chrome.storage.local.remove('gemini_ocr_2_5_pro_failed', () => {
          console.log('Auto-cleared model failure flag after timeout period');
        });
      }, 30 * 60 * 1000); // 30 minutes
      
      // Inform user we're switching models with more details
      console.log(`Switching to fallback model due to error: ${error.message}`);
      updatePopupStatus(`高级模型暂时不可用，正在使用更快的模型...`, fallbackModel);
      
      // Try with the fallback model
      try {
        const fallbackResult = await makeApiRequest(imageDataUrl, apiKey, fallbackModel);
        return fallbackResult; // Now includes both text and model info
      } catch (fallbackError) {
        console.error("Fallback model also failed:", fallbackError);
        throw fallbackError; // Re-throw the fallback error
      }
    }
    
    // For other errors, just re-throw
    throw error;
  }
}

// Function to make the actual API request
async function makeApiRequest(imageDataUrl, apiKey, model) {
  // Create the API URL with the chosen model
  // Make sure all parameters are properly encoded
  const encodedModel = encodeURIComponent(model);
  const encodedKey = encodeURIComponent(apiKey);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodedKey}`;
  
  // Remove the Data URL prefix (e.g., "data:image/png;base64,")
  const base64ImageData = imageDataUrl.split(',')[1];
  
  // Create request body based on the selected model
  let requestPrompt = "Extract all text from this image. Preserve the original formatting as much as possible and output the result as Markdown.";
  
  // Use enhanced prompt for Gemini 2.5 Pro Experimental
  if (model === 'gemini-2.5-pro-exp-03-25') {
    requestPrompt = "Perform accurate OCR on this image. Extract ALL text visible in the image with perfect accuracy. Maintain the original formatting, including paragraphs, bullet points, tables, and any other structural elements. Preserve the hierarchical structure of headings and sections. Output the result as clean, well-formatted Markdown. If there are any ambiguous characters or words that you're uncertain about, indicate them with [?].";
  }
  
  const requestBody = {
    contents: [
      {
        parts: [
          // Customized prompt based on model
          { text: requestPrompt }, 
          {
            inline_data: {
              mime_type: imageDataUrl.substring(imageDataUrl.indexOf(":") + 1, imageDataUrl.indexOf(";")), // Extract MIME type
              data: base64ImageData
            }
          }
        ]
      }
    ],
    // Add model-specific generation config
    generationConfig: getGenerationConfig(model)
  };

  console.log(`Calling Gemini API with model: ${model}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Not JSON, so it's likely an error page
      const textResponse = await response.text();
      console.error(`Received non-JSON response from ${model} API:`, 
        textResponse.substring(0, 200) + '...');
      throw new Error(`API returned non-JSON response (received ${contentType}). Try using a different model.`);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(e => {
        console.error('Failed to parse error response as JSON:', e);
        return { error: { message: 'Unknown error, failed to parse response' } };
      });
      console.error("API Error Response:", errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`API Success Response from ${model}:`, data);

    // Extract text from the response - structure might vary slightly
    if (data.candidates && data.candidates[0] && data.candidates[0].content && 
        data.candidates[0].content.parts && data.candidates[0].content.parts[0] && 
        data.candidates[0].content.parts[0].text) {
      const resultText = data.candidates[0].content.parts[0].text.trim();
      console.log(`Successfully extracted text with model ${model}, length: ${resultText.length}`);
      return { text: resultText, model: model };
    } else if (data.promptFeedback?.blockReason) {
      // Handle cases where content is blocked
      console.warn("API response blocked:", data.promptFeedback.blockReason);
      throw new Error(`Content blocked by API: ${data.promptFeedback.blockReason}. ${data.promptFeedback.safetyRatings?.map(r => r.category + ': ' + r.probability).join(', ')}`);
    } 
    else {
      console.error("Could not find text in API response structure:", data);
      throw new Error("Unexpected API response structure. Check console for details.");
    }
  } catch (error) {
    console.error(`Error calling Gemini API with model ${model}:`, error);
    // Re-throw the error to be caught by the caller
    throw error; 
  }
}

// --- Qwen OCR API functions ---
async function callQwenOcrApi(imageDataUrl, apiKey, model) {
  if (!apiKey) {
    throw new Error("Qwen API Key is missing. Please configure it in the extension options.");
  }
  
  // Define the OpenAI compatible endpoint for Alibaba Cloud
  const apiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  
  // Extract the base64 data (remove the data:image/xyz;base64, prefix)
  const base64ImageData = imageDataUrl.split(',')[1];
  
  // Extract MIME type from the data URL
  const mimeType = imageDataUrl.substring(
    imageDataUrl.indexOf(":") + 1, 
    imageDataUrl.indexOf(";")
  );
  
  // Get default pixel sizes for the model
  const defaultMinPixels = 28 * 28 * 4;    // 3136
  const defaultMaxPixels = 28 * 28 * 1280; // 1003520
  
  // Create request body with the standard Qwen OCR prompt
  // As per documentation, the model internally uses "Read all the text in the image."
  const requestBody = {
    model: model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl
            },
            min_pixels: defaultMinPixels,
            max_pixels: defaultMaxPixels
          },
          { 
            type: "text", 
            text: "Read all the text in the image." 
          }
        ]
      }
    ]
  };

  try {
    // Log request details for debugging
    console.log(`Calling Qwen OCR API with model: ${model}`);
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Not JSON, likely an error page
      const textResponse = await response.text();
      console.error(`Received non-JSON response from ${model} API:`, 
        textResponse.substring(0, 200) + '...');
      throw new Error(`API returned non-JSON response (received ${contentType}). Please check your API key and try again.`);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(e => {
        console.error('Failed to parse error response as JSON:', e);
        return { error: { message: 'Unknown error, failed to parse response' } };
      });
      console.error("Qwen API Error Response:", errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`Qwen API Success Response from ${model}:`, data);

    // Extract text from the Qwen OCR response
    if (data.choices && 
        data.choices[0] && 
        data.choices[0].message && 
        data.choices[0].message.content) {
      const resultText = data.choices[0].message.content.trim();
      console.log(`Successfully extracted text with Qwen model ${model}, length: ${resultText.length}`);
      return { text: resultText, model: model };
    } else {
      console.error("Could not find text in Qwen API response structure:", data);
      throw new Error("Unexpected API response structure. Check console for details.");
    }
  } catch (error) {
    console.error(`Error calling Qwen OCR API with model ${model}:`, error);
    // Re-throw the error to be caught by the caller
    throw error; 
  }
}

console.log("Background service worker started.");
// Add basic error handling or setup if needed on start

// Check if API key is configured on startup
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    getApiSettings().then(settings => {
      const provider = settings.apiProvider;
      let needsConfig = false;
      let message = '';
      
      if (provider === 'gemini' && !settings.geminiApiKey) {
        needsConfig = true;
        message = "Please set your Gemini API Key in the extension options to use OCR.";
      } else if (provider === 'qwen' && !settings.qwenApiKey) {
        needsConfig = true;
        message = "Please set your Qwen API Key in the extension options to use OCR.";
      }
      
      if (needsConfig) {
        // Show notification for first-time users to configure API key
        showNotification("Configuration Required", message);
        
        // Open options page for configuration
        chrome.runtime.openOptionsPage();
      }
    });
  }
});

// Close any lingering offscreen documents on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await closeOffscreenDocument();
  } catch (error) {
    console.error("Error closing offscreen document on startup:", error);
  }
});

// Set up interval to periodically clean up expired failure flags
setInterval(() => {
  // Check how long the failure flag has been set
  chrome.storage.local.get(['gemini_ocr_2_5_pro_failed_timestamp'], (result) => {
    const timestamp = result.gemini_ocr_2_5_pro_failed_timestamp;
    if (timestamp) {
      const now = Date.now();
      if (now - timestamp > 30 * 60 * 1000) { // 30 minutes
        chrome.storage.local.remove(['gemini_ocr_2_5_pro_failed', 'gemini_ocr_2_5_pro_failed_timestamp'], () => {
          console.log('Cleared expired failure flags during cleanup');
        });
      }
    }
  });
}, 5 * 60 * 1000); // Check every 5 minutes
