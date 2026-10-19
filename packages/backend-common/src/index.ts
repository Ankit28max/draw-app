const defaultDevSecret = "123123";
const disallowedSecrets = ["123123", "super-secure-production-jwt-secret-replace-me", "secret", "password"];

if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET || disallowedSecrets.includes(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 16) {
        console.error("FATAL: In production, JWT_SECRET must be set to a cryptographically strong secret with at least 16 characters!");
        process.exit(1);
    }
}

export const JWT_SECRET = process.env.JWT_SECRET || defaultDevSecret;