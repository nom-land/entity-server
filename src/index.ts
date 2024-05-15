import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createRequestSchema } from "./schema";
import { logger } from "hono/logger";
import { getEntity } from "./entity";
import { Contract } from "crossbell/contract";
import { privateKeyToAddress } from "viem/accounts";
import "dotenv/config";
import { log } from "./logger";

const app = new Hono();

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

app.use(logger());
app.post(
    "/createEntity",
    validator("json", (value, c) => {
        const parsed = createRequestSchema.safeParse(value);
        // TODO: metadata is corresponding to the type
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        // TODO: app sig verification and character permission check
        return parsed.data;
    }),
    async (c) => {
        const params = c.req.valid("json");
        // TODO: local chain options
        const { handle, id } = await getEntity(
            params.entity,
            contract,
            admin,
            params.createdBy,
            params.prod || false
        );
        return c.json({ handle, id });
    }
);

const port = 3001;
const privateKey = process.env.PRI_KEY as `0x${string}`;
const contract = new Contract(privateKey);
const admin = privateKeyToAddress(privateKey);

log.info(`🎉 Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});
