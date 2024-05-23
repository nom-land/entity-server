import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { generateChallenge, signin } from "./authService";
import { SiweChallengeSchema, SiweSigninSchema } from "./schema";
import { logger } from "hono/logger";
import { jwt } from "hono/jwt";
import config from "./config";

const auth = new Hono();

auth.use(logger((str) => (new Date(), str)));
auth.post("/challenge", zValidator("json", SiweChallengeSchema), async (c) => {
    const { address, domain, uri, statement } = c.req.valid("json");
    const message = await generateChallenge({
        address,
        domain,
        uri,
        statement,
    });

    return c.json({ message });
});

auth.use(logger((str) => (new Date(), str)));
auth.post("signin", zValidator("json", SiweSigninSchema), async (c) => {
    const { message, signature } = c.req.valid("json");
    const token = await signin(message, signature);
    return c.json({ token });
});

auth.use(
    "/account",
    jwt({
        secret: config.jwtSecret,
    })
);
auth.get("/account", async (c) => {
    const payload = c.get("jwtPayload");
    return c.json(payload);
});

export default auth;
