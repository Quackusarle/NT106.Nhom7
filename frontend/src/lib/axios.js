import axios from "axios";

// URL đầy đủ và duy nhất của server backend
const API_URL = "https://192.168.194.169:5001/api";

console.log(`[Axios] API requests will be sent to: ${API_URL}`);

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});                                             