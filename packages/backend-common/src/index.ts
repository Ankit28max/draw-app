const defaultDevSecret = "123123";
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultDevSecret)) {
    console.error("FATAL: JWT_SECRET environment variable must be set to a secure secret in production!");
    process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET || defaultDevSecret;