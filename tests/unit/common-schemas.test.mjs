import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Mirroring packages/common/src/types.ts
export const CreateUserSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(3).max(100),
    name: z.string().min(1).max(100).optional().default("User")
});

export const SigninSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(3).max(100),
});

export const CreateRoomSchema = z.object({
    name: z.string().min(1).max(100),
});

test("CreateUserSchema Validation Suite", async (t) => {
    await t.test("accepts valid email and password", () => {
        const input = {
            username: "engineer@example.com",
            password: "supersecretpassword",
            name: "Alex Dev"
        };
        const result = CreateUserSchema.safeParse(input);
        assert.equal(result.success, true);
        if (result.success) {
            assert.equal(result.data.username, "engineer@example.com");
            assert.equal(result.data.name, "Alex Dev");
        }
    });

    await t.test("defaults name to 'User' when omitted", () => {
        const input = {
            username: "lead@tech.io",
            password: "validpassword123"
        };
        const result = CreateUserSchema.safeParse(input);
        assert.equal(result.success, true);
        if (result.success) {
            assert.equal(result.data.name, "User");
        }
    });

    await t.test("rejects username shorter than 3 characters", () => {
        const input = {
            username: "al",
            password: "securepassword"
        };
        const result = CreateUserSchema.safeParse(input);
        assert.equal(result.success, false);
    });

    await t.test("rejects password shorter than 3 characters", () => {
        const input = {
            username: "alexander",
            password: "12"
        };
        const result = CreateUserSchema.safeParse(input);
        assert.equal(result.success, false);
    });

    await t.test("rejects payload exceeding max length (100 characters)", () => {
        const longString = "a".repeat(101);
        const input = {
            username: longString,
            password: "securepassword"
        };
        const result = CreateUserSchema.safeParse(input);
        assert.equal(result.success, false);
    });

    await t.test("rejects empty objects and null values", () => {
        assert.equal(CreateUserSchema.safeParse({}).success, false);
        assert.equal(CreateUserSchema.safeParse(null).success, false);
        assert.equal(CreateUserSchema.safeParse(undefined).success, false);
    });
});

test("SigninSchema Validation Suite", async (t) => {
    await t.test("validates valid signin payload", () => {
        const input = {
            username: "architect@cloud.dev",
            password: "production_password"
        };
        const result = SigninSchema.safeParse(input);
        assert.equal(result.success, true);
    });

    await t.test("rejects missing password", () => {
        const input = { username: "architect@cloud.dev" };
        const result = SigninSchema.safeParse(input);
        assert.equal(result.success, false);
    });

    await t.test("rejects extra long inputs (>100 chars)", () => {
        const input = {
            username: "user@test.com",
            password: "p".repeat(101)
        };
        const result = SigninSchema.safeParse(input);
        assert.equal(result.success, false);
    });
});

test("CreateRoomSchema Validation Suite", async (t) => {
    await t.test("accepts valid room slug name", () => {
        const input = { name: "hld-event-streaming" };
        const result = CreateRoomSchema.safeParse(input);
        assert.equal(result.success, true);
        if (result.success) {
            assert.equal(result.data.name, "hld-event-streaming");
        }
    });

    await t.test("rejects empty room name", () => {
        const input = { name: "" };
        const result = CreateRoomSchema.safeParse(input);
        assert.equal(result.success, false);
    });

    await t.test("rejects room name exceeding 100 characters", () => {
        const input = { name: "r".repeat(101) };
        const result = CreateRoomSchema.safeParse(input);
        assert.equal(result.success, false);
    });
});
