// qwen_ocr.js - Handles Alibaba Cloud Qwen OCR API calls

/**
 * Call the Alibaba Cloud Qwen OCR API using the OpenAI-compatible API
 * @param {string} imageDataUrl - The base64 encoded image data URL
 * @param {string} apiKey - The Qwen API Key
 * @param {string} model - The Qwen model ID (e.g., 'qwen-vl-ocr')
 * @returns {Promise<{text: string, model: string}>} - The extracted text and model used
 */
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

/**
 * Alternative implementation using Alibaba Cloud DashScope API directly
 * Note: This is kept as a reference but not currently used
 */
async function callQwenOcrDashscopeApi(imageDataUrl, apiKey, model) {
  if (!apiKey) {
    throw new Error("Qwen API Key is missing. Please configure it in the extension options.");
  }
  
  // Define the DashScope API endpoint
  const apiUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  
  // Extract the base64 data (remove the data:image/xyz;base64, prefix)
  const base64ImageData = imageDataUrl.split(',')[1];
  
  // Create request body with the standard Qwen OCR prompt
  const requestBody = {
    model: model,
    input: {
      messages: [
        {
          role: "user",
          content: [
            {
              image: imageDataUrl,
              min_pixels: 3136,     // 28 * 28 * 4
              max_pixels: 1003520   // 28 * 28 * 1280
            },
            { 
              type: "text", 
              text: "Read all the text in the image." 
            }
          ]
        }
      ]
    }
  };

  try {
    console.log(`Calling Qwen OCR DashScope API with model: ${model}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("Qwen DashScope API Error Response:", errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`Qwen DashScope API Success Response:`, data);

    // Extract text from DashScope response format
    if (data.output && 
        data.output.choices && 
        data.output.choices[0] && 
        data.output.choices[0].message && 
        data.output.choices[0].message.content && 
        data.output.choices[0].message.content[0] &&
        data.output.choices[0].message.content[0].text) {
      const resultText = data.output.choices[0].message.content[0].text.trim();
      console.log(`Successfully extracted text with Qwen DashScope API, length: ${resultText.length}`);
      return { text: resultText, model: model };
    } else {
      console.error("Could not find text in Qwen DashScope API response structure:", data);
      throw new Error("Unexpected API response structure. Check console for details.");
    }
  } catch (error) {
    console.error(`Error calling Qwen DashScope API:`, error);
    throw error;
  }
}

// Export functions for use in background.js
if (typeof module !== 'undefined') {
  module.exports = {
    callQwenOcrApi
  };
}
