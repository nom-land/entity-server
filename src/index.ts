import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { validator } from "hono/validator";
import {
    createRequestSchema,
    searchRequestSchema,
    updateRequestSchema,
} from "./schema";
import { logger } from "hono/logger";
import { getEntity, searchEntity } from "./entity";
import { Contract } from "crossbell/contract";
import { privateKeyToAddress } from "viem/accounts";
import "dotenv/config";
import { log } from "./logger";

const app = new Hono();

app.use(logger((str) => (new Date(), str)));
app.get(
    "/entity/search",
    validator("query", (value, c) => {
        const parsed = searchRequestSchema.safeParse(value);
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        return parsed.data;
    }),
    async (c) => {
        const url = c.req.valid("query").url;
        const prod = c.req.valid("query").prod || false;

        const result = await searchEntity(url, contract, prod);
        return c.json(result);
    }
);

app.use(logger((str) => (new Date(), str)));
app.post(
    "/entity/create",
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
            params.submittedBy,
            contract,
            admin,
            params.prod || false
        );
        return c.json({ handle, id });
    }
);

app.use(logger((str) => (new Date(), str)));
app.post(
    "/entity/edit",
    validator("json", (value, c) => {
        const parsed = updateRequestSchema.safeParse(value);
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        return parsed.data;
    }),
    async (c) => {
        const params = c.req.valid("json");
        // TODO: CHANGE THIS
        return c.text("Not implemented", 501);
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
