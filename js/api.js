(() => {
  "use strict";

  const DEFAULT_BASE_URL = "/api/v1";
  const configuredBaseUrl = window.PrimeItConfig?.apiBaseUrl || DEFAULT_BASE_URL;
  const API_BASE_URL = String(configuredBaseUrl).replace(/\/+$/, "");

  class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "PrimeItApiError";
      this.status = Number(options.status || 0);
      this.code = options.code || "";
      this.details = options.details ?? null;
      this.data = options.data ?? null;
      this.retryable = Boolean(options.retryable);
    }
  }

  function safeMessage(status, data) {
    const message = typeof data?.message === "string" ? data.message.trim() : "";
    if (status >= 500) return "The server is temporarily unavailable. Please try again later.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 409) return message || "This request conflicts with the current data.";
    if (status === 422 || status === 400) return message || "Please check the submitted information.";
    if (status === 403) return message || "You do not have permission to perform this action.";
    if (status === 401) return "Your session is no longer valid. Please sign in again.";
    return message || "The request could not be completed.";
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try { return await response.json(); } catch { return {}; }
    }
    try {
      const text = await response.text();
      return text ? { message: text } : {};
    } catch {
      return {};
    }
  }

  function createError(response, data) {
    return new ApiError(safeMessage(response.status, data), {
      status: response.status,
      code: data?.code || "",
      details: Array.isArray(data?.errors) ? data.errors : (data?.details ?? null),
      data,
      retryable: response.status >= 500 || response.status === 429
    });
  }

  async function request(path, options = {}) {
    const {
      method = "GET",
      body,
      headers = {},
      signal,
      credentials = "include",
      timeoutMs = 30000,
      redirectOn401 = false,
      loginPath = "",
      ...rest
    } = options;

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");
    if (body !== undefined && body !== null && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    let response;
    let data;
    try {
      response = await fetch(path.startsWith("http") ? path : API_BASE_URL + "/" + String(path).replace(/^\/+/, ""), {
        method,
        headers: requestHeaders,
        credentials,
        body: body instanceof FormData || typeof body === "string" ? body : body == null ? undefined : JSON.stringify(body),
        signal: controller.signal,
        ...rest
      });
      data = await parseResponse(response);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new ApiError("The request timed out or was cancelled. Please try again.", { code: "REQUEST_ABORTED", retryable: true });
      }
      throw new ApiError("Unable to connect to the server. Please check your connection and try again.", { code: "NETWORK_ERROR", retryable: true });
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }

    if (!response.ok) {
      const error = createError(response, data);
      if (response.status === 401 && redirectOn401 && loginPath) {
        const separator = loginPath.includes("?") ? "&" : "?";
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(loginPath + separator + "next=" + next);
      }
      throw error;
    }

    return data;
  }

  const get = (path, options = {}) => request(path, { ...options, method: "GET" });
  const post = (path, body, options = {}) => request(path, { ...options, method: "POST", body });
  const put = (path, body, options = {}) => request(path, { ...options, method: "PUT", body });
  const patch = (path, body, options = {}) => request(path, { ...options, method: "PATCH", body });
  const del = (path, options = {}) => request(path, { ...options, method: "DELETE" });

  function unwrap(data) {
    if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "data")) return data.data;
    return data;
  }

  function getValidationErrors(error) {
    if (!error) return [];
    if (Array.isArray(error.details)) return error.details;
    if (Array.isArray(error.data?.errors)) return error.data.errors;
    return [];
  }

  async function getCurrentUser(options = {}) {
    const data = await get("/auth/me", options);
    return data?.user || unwrap(data)?.user || unwrap(data) || null;
  }

  async function logout() {
    try {
      return await post("/auth/logout", undefined);
    } catch (error) {
      if (error.status === 401) return { success: true };
      throw error;
    }
  }

  window.PrimeItApi = Object.freeze({
    baseUrl: API_BASE_URL,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    unwrap,
    getValidationErrors,
    getCurrentUser,
    logout,
    ApiError
  });
})();