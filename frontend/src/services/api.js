const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}`);
  }

  if (response.status === 204) return null;

  return response.json();
};

const api = {
  get:    (endpoint) => request(endpoint, { method: "GET" }),
  post:   (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch:  (endpoint, body) => request(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),

  patchForm: (endpoint, formData) => {
    const token = localStorage.getItem("token");
    return fetch(`${BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(res => {
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || `Error ${res.status}`) });
      if (res.status === 204) return null;
      return res.json();
    });
  },
};

export default api;