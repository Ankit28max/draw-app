import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const TEST_JWT_SECRET = "production_test_secret_key_excali_2026";

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored.includes(":")) {
        // Safe backward-compatibility for legacy accounts
        return password === stored;
    }
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(hash, "hex"));
}

function sanitizeBearerToken(rawToken) {
    if (!rawToken) return "";
    let clean = rawToken.trim();
    if (clean.startsWith("Bearer ")) {
        clean = clean.slice(7).trim();
    }
    return clean;
}

function checkUser(token, secret) {
    try {
        const cleanToken = sanitizeBearerToken(token);
        if (cleanToken) {
            const decoded = jwt.verify(cleanToken, secret);
            if (decoded && decoded.userId) {
                return decoded.userId;
            }
        }
    } catch (e) {
        // Fall back to guest session
    }
    return `guest-${Math.random().toString(36).substring(2, 10)}`;
}

test("Cryptographic Password Hashing & Verification Suite", async (t) => {
    await t.test("generates different salts and hashes for the same password", () => {
        const pass = "StrongPassword@123";
        const hash1 = hashPassword(pass);
        const hash2 = hashPassword(pass);

        assert.notEqual(hash1, hash2, "Salts must ensure unique hashes for identical passwords");
        assert.equal(hash1.includes(":"), true);
        assert.equal(hash2.includes(":"), true);
    });

    await t.test("verifies valid password against generated hash", () => {
        const pass = "EnterpriseGradeAuth!#2026";
        const storedHash = hashPassword(pass);
        assert.equal(verifyPassword(pass, storedHash), true);
    });

    await t.test("rejects invalid password", () => {
        const storedHash = hashPassword("CorrectPassword");
        assert.equal(verifyPassword("WrongPassword", storedHash), false);
        assert.equal(verifyPassword("correctpassword", storedHash), false); // Case-sensitivity check
    });

    await t.test("safely handles legacy un-salted passwords without throwing", () => {
        const legacyPlain = "old_legacy_password";
        assert.equal(verifyPassword(legacyPlain, legacyPlain), true);
        assert.equal(verifyPassword("wrong_attempt", legacyPlain), false);
    });

    await t.test("safely handles corrupt hash strings", () => {
        assert.equal(verifyPassword("pass", "invalid_format_without_delimiter"), false);
        assert.equal(verifyPassword("pass", ":"), false);
        assert.equal(verifyPassword("pass", "salt_only:"), false);
    });
});

test("JWT Authentication & Token Lifecycle Suite", async (t) => {
    await t.test("successfully signs and verifies JWT with valid claims", () => {
        const userId = "user-uuid-9876-5432";
        const token = jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: "1h" });

        const verifiedUserId = checkUser(token, TEST_JWT_SECRET);
        assert.equal(verifiedUserId, userId);
    });

    await t.test("normalizes and accepts 'Bearer <token>' headers", () => {
        const userId = "user-bearer-123";
        const rawToken = jwt.sign({ userId }, TEST_JWT_SECRET);
        const headerValue = `Bearer ${rawToken}`;

        const verifiedUserId = checkUser(headerValue, TEST_JWT_SECRET);
        assert.equal(verifiedUserId, userId);
    });

    await t.test("falls back to guest session when token is expired", () => {
        // Expired token (1 second in the past)
        const expiredToken = jwt.sign({ userId: "expired-user" }, TEST_JWT_SECRET, { expiresIn: -1 });
        const result = checkUser(expiredToken, TEST_JWT_SECRET);
        assert.match(result, /^guest-[a-z0-9]+$/);
    });

    await t.test("falls back to guest session when token signature is invalid", () => {
        const forgedToken = jwt.sign({ userId: "attacker" }, "wrong_secret");
        const result = checkUser(forgedToken, TEST_JWT_SECRET);
        assert.match(result, /^guest-[a-z0-9]+$/);
    });

    await t.test("falls back to guest session when token is empty or null", () => {
        assert.match(checkUser("", TEST_JWT_SECRET), /^guest-[a-z0-9]+$/);
        assert.match(checkUser(null, TEST_JWT_SECRET), /^guest-[a-z0-9]+$/);
        assert.match(checkUser("malformed.garbage.token", TEST_JWT_SECRET), /^guest-[a-z0-9]+$/);
    });
});
