// options.js - Handles saving and loading extension settings

// Default settings
const defaultSettings = {
  apiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-pro-exp-03-25',
  qwenApiKey: '',
  qwenModel: 'qwen-vl-ocr',
};

// DOM elements
const apiProviderSelect = document.getElementById('api-provider');
const geminiSettings = document.getElementById('gemini-settings');
const qwenSettings = document.getElementById('qwen-settings');

// Gemini elements
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const geminiModelSelection = document.getElementById('gemini-model-selection');
const geminiToggleVisibilityButton = document.getElementById('gemini-toggle-visibility');

// Qwen elements
const qwenApiKeyInput = document.getElementById('qwen-api-key');
const qwenModelSelection = document.getElementById('qwen-model-selection');
const qwenToggleVisibilityButton = document.getElementById('qwen-toggle-visibility');

// Common elements
const saveButton = document.getElementById('save-button');
const statusElement = document.getElementById('status');

// Load saved settings when the options page is opened
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when the save button is clicked
saveButton.addEventListener('click', saveSettings);

// Provider selection change handler
apiProviderSelect.addEventListener('change', toggleProviderSettings);

// Toggle API key visibility for both providers
geminiToggleVisibilityButton.addEventListener('click', () => toggleApiKeyVisibility(geminiApiKeyInput, geminiToggleVisibilityButton));
qwenToggleVisibilityButton.addEventListener('click', () => toggleApiKeyVisibility(qwenApiKeyInput, qwenToggleVisibilityButton));

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(defaultSettings, (items) => {
    // Set provider
    apiProviderSelect.value = items.apiProvider || 'gemini';
    
    // Load Gemini settings
    geminiApiKeyInput.value = items.geminiApiKey || '';
    geminiModelSelection.value = items.geminiModel || 'gemini-1.5-flash';
    
    // Load Qwen settings
    qwenApiKeyInput.value = items.qwenApiKey || '';
    qwenModelSelection.value = items.qwenModel || 'qwen-vl-ocr';
    
    // Mask API keys if they exist
    if (items.geminiApiKey) {
      geminiApiKeyInput.type = 'password';
      geminiToggleVisibilityButton.textContent = 'Show';
    }
    
    if (items.qwenApiKey) {
      qwenApiKeyInput.type = 'password';
      qwenToggleVisibilityButton.textContent = 'Show';
    }
    
    // Show/hide appropriate settings
    toggleProviderSettings();
  });
}

// Save settings to storage
function saveSettings() {
  const apiProvider = apiProviderSelect.value;
  const geminiApiKey = geminiApiKeyInput.value.trim();
  const geminiModel = geminiModelSelection.value;
  const qwenApiKey = qwenApiKeyInput.value.trim();
  const qwenModel = qwenModelSelection.value;
  
  // Basic validation based on selected provider
  if (apiProvider === 'gemini' && !geminiApiKey) {
    showStatus('Gemini API Key is required', 'error');
    return;
  } else if (apiProvider === 'qwen' && !qwenApiKey) {
    showStatus('Qwen API Key is required', 'error');
    return;
  }
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    apiProvider: apiProvider,
    geminiApiKey: geminiApiKey,
    geminiModel: geminiModel,
    qwenApiKey: qwenApiKey,
    qwenModel: qwenModel
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusElement.className = 'status';
      statusElement.textContent = '';
    }, 3000);
  });
}

// Toggle API key visibility between text and password
function toggleApiKeyVisibility(inputElement, buttonElement) {
  if (inputElement.type === 'password') {
    inputElement.type = 'text';
    buttonElement.textContent = 'Hide';
  } else {
    inputElement.type = 'password';
    buttonElement.textContent = 'Show';
  }
  
  // Return focus to the input
  inputElement.focus();
}

// Show/hide provider settings based on selection
function toggleProviderSettings() {
  const provider = apiProviderSelect.value;
  
  if (provider === 'gemini') {
    geminiSettings.style.display = 'block';
    qwenSettings.style.display = 'none';
  } else if (provider === 'qwen') {
    geminiSettings.style.display = 'none';
    qwenSettings.style.display = 'block';
  }
}

// Show status message
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

// Optional: Test API key validity before saving
geminiApiKeyInput.addEventListener('blur', () => {
  const apiKey = geminiApiKeyInput.value.trim();
  
  // Skip validation if empty
  if (!apiKey) return;
  
  // Basic format validation (length, alphanumeric)
  if (apiKey.length < 30) {
    showStatus('Gemini API key seems too short. Please check if it\'s valid.', 'error');
  } else {
    statusElement.className = 'status';
    statusElement.textContent = '';
  }
});

qwenApiKeyInput.addEventListener('blur', () => {
  const apiKey = qwenApiKeyInput.value.trim();
  
  // Skip validation if empty
  if (!apiKey) return;
  
  // Basic format validation for Qwen API keys (usually start with 'sk-')
  if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
    showStatus('Qwen API key should start with "sk-" and be at least 20 characters. Please check if it\'s valid.', 'error');
  } else {
    statusElement.className = 'status';
    statusElement.textContent = '';
  }
});

console.log("Options script loaded");
