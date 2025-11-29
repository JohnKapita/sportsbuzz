// ./frontend/public/js/config.js
const getApiBase = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    } else {
        return '/api'; // Relative path for production
    }
};

const CONFIG = {
    API_BASE: 'https://sportsbuzz-pnpa.onrender.com/api'
};

// Enhanced error handling
const handleApiError = (error) => {
    console.error('API Error:', error);
    // showToast will be called from main.js
    return { success: false, message: error.message };
};