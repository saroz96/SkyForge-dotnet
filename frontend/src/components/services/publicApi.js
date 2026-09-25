// services/publicApi.js
import axios from 'axios';

const publicApi = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: false,   // no cookies needed
});

export default publicApi;