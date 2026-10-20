const defaultSecret = "vectorcraft-production-secure-default-jwt-secret-key-38491029482";

export const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 8)
    ? process.env.JWT_SECRET.trim()
    : defaultSecret;

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.warn("[AUTH] Warning: JWT_SECRET environment variable is not set; using secure fallback.");
}