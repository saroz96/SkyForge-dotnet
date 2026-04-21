// // services/vatConfirmationService.js
// import axios from 'axios';

// const API_URL = '/api/retailer/vat-confirmation';

// export const getParties = (params = {}) =>
//     axios.get(`${API_URL}/parties`, { params });

// export const getPartySummary = (accountId, params = {}) =>
//     axios.get(`${API_URL}/party-summary/${accountId}`, { params });

// export default {
//     getParties,
//     getPartySummary
// };

//-----------------------------------------------------end

// services/vatConfirmationService.js
import axios from 'axios';

// Remove the /vat-confirmation from the base URL
const API_URL = '/api/retailer';

export const getParties = (params = {}) =>
    axios.get(`${API_URL}/parties`, { params });

export const getPartySummary = (accountId, params = {}) =>
    axios.get(`${API_URL}/party-summary/${accountId}`, { params });

export default {
    getParties,
    getPartySummary
};