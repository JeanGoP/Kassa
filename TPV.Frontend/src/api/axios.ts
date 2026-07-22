import axios from 'axios';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:5292/api`;
    }

    return 'http://localhost:5292/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
