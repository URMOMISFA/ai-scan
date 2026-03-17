// State
let currentImageBase64 = null;
let apiKey = localStorage.getItem('openai-api-key') || '';
let mediaStream = null;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const uploadArea = document.getElementById('uploadArea');
const uploadInput = document.getElementById('uploadInput');
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const startWebcamBtn = document.getElementById('startWebcam');
const stopWebcamBtn = document.getElementById('stopWebcam');
const capturePhotoBtn = document.getElementById('capturePhoto');
const previewSection = document.getElementById('previewSection');
const preview = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const analysisResult = document.getElementById('analysisResult');
const resetBtn = document.getElementById('resetBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }
});

// API Key Management
saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('openai-api-key', key);
        apiKey = key;
        showError('API Key saved successfully!', 'success');
    } else {
        showError('Please enter a valid API key');
    }
});

// Upload Handling
uploadArea.addEventListener('click', () => uploadInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleImageFile(files[0]);
    }
});

uploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
    }
});

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        displayPreview(currentImageBase64);
        clearError();
    };
    reader.readAsDataURL(file);
}

function displayPreview(imageSrc) {
    preview.src = imageSrc;
    previewSection.classList.remove('hidden');
    analyzeBtn.classList.remove('hidden');
    stopWebcam();
}

// Webcam Handling
startWebcamBtn.addEventListener('click', async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        webcam.srcObject = mediaStream;
        webcam.style.display = 'block';
        
        startWebcamBtn.classList.add('hidden');
        stopWebcamBtn.classList.remove('hidden');
        capturePhotoBtn.classList.remove('hidden');
        
        clearError();
    } catch (error) {
        showError('Unable to access webcam: ' + error.message);
    }
});

stopWebcamBtn.addEventListener('click', stopWebcam);

function stopWebcam() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    webcam.style.display = 'none';
    startWebcamBtn.classList.remove('hidden');
    stopWebcamBtn.classList.add('hidden');
    capturePhotoBtn.classList.add('hidden');
}

capturePhotoBtn.addEventListener('click', () => {
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcam, 0, 0);
    
    currentImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    displayPreview(currentImageBase64);
});

// Analysis
analyzeBtn.addEventListener('click', analyzeImage);

async function analyzeImage() {
    if (!currentImageBase64) {
        showError('Please select or capture an image first');
        return;
    }

    if (!apiKey) {
        showError('Please enter and save your OpenAI API key first');
        return;
    }

    loadingState.classList.remove('hidden');
    analyzeBtn.disabled = true;
    clearError();

    try {
        // Extract base64 from data URL
        const base64Image = currentImageBase64.split(',')[1];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-vision',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Please analyze this image and describe in detail what you see. Include objects, people, animals, text, settings, colors, and any notable details. Be clear and comprehensive.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const analysisText = data.choices[0].message.content;

        displayResults(analysisText);
    } catch (error) {
        showError('Error analyzing image: ' + error.message);
    } finally {
        loadingState.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
}

function displayResults(text) {
    analysisResult.textContent = text;
    resultsSection.classList.remove('hidden');
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

resetBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    previewSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    analyzeBtn.classList.add('hidden');
    uploadInput.value = '';
    clearError();
});

// Error Handling
function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    if (type === 'success') {
        errorSection.style.background = '#e8f5e9';
        errorSection.style.color = '#2e7d32';
        errorSection.style.borderColor = '#2e7d32';
    } else {
        errorSection.style.background = '#ffebee';
        errorSection.style.color = '#c62828';
        errorSection.style.borderColor = '#c62828';
    }
}

function clearError() {
    errorSection.classList.add('hidden');
}
