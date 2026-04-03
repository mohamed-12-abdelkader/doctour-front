import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  // ❌ لا تحدد Content-Type هنا — axios بيحدده تلقائياً:
  //   - application/json    → لما تبعت object عادي
  //   - multipart/form-data → لما تبعت FormData (مع الـ boundary تلقائياً)
});

// Add a request interceptor to include the token in requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // تأكيد: لو الـ data هو FormData، امسح أي Content-Type محدد يدوياً
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
