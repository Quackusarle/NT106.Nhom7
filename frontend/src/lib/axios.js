import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "https://192.168.1.70:5001/api" : "/api",
  withCredentials: true,
});
