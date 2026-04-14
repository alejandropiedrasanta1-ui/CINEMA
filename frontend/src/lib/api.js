import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: BASE });

export const getStats = () => api.get("/stats").then(r => r.data);
export const getReservations = () => api.get("/reservations").then(r => r.data);
export const getReservation = (id) => api.get(`/reservations/${id}`).then(r => r.data);
export const createReservation = (data) => api.post("/reservations", data).then(r => r.data);
export const updateReservation = (id, data) => api.put(`/reservations/${id}`, data).then(r => r.data);
export const deleteReservation = (id) => api.delete(`/reservations/${id}`).then(r => r.data);
export const getCalendarEvents = () => api.get("/calendar").then(r => r.data);

export const uploadReceipt = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/reservations/${id}/receipts`, form, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data);
};

export const deleteReceipt = (id, receiptId) =>
  api.delete(`/reservations/${id}/receipts/${receiptId}`).then(r => r.data);
