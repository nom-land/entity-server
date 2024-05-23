import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { validator } from "hono/validator";
import {
    batchGetAllCopiesRequestSchema,
    createRequestSchema,
    getAllCopiesRequestSchema,
    markDuplicateRequestSchema,
    searchRequestSchema,
    updateRequestSchema,
} from "./schema";
import { logger } from "hono/logger";
import {
    getEntity,
    getEntityById,
    searchEntity,
    updateEntityMetadata,
} from "./entityService";
import { Contract } from "crossbell/contract";
import { privateKeyToAddress } from "viem/accounts";
import "dotenv/config";
import { log } from "./logger";
import { createClient } from "redis";
import {
    getAllCopies,
    markDuplicate,
    unmarkDuplicate,
} from "./entityService/duplicate";
import auth from "./auth";
import { jwt } from "hono/jwt";
import { readFile } from "fs/promises";
import { resolve } from "path";
import config from "./config";
import { zValidator } from "@hono/zod-validator";
import { isAddressEqual } from "viem";

const app = new Hono();

let contract: Contract;
let admin: `0x${string}`;
let redisClient: any;

app.use("*", cors());

app.use(
    "/entity/edit",
    jwt({
        secret: config.jwtSecret,
    })
);

app.use(
    "/entity/markDuplicate",
    jwt({
        secret: config.jwtSecret,
    })
);

app.use(logger((str) => (new Date(), str)));
app.get(
    "/entity/search",
    zValidator("query", searchRequestSchema),
    async (c) => {
        const url = c.req.valid("query").url;
        const prod = c.req.valid("query").prod || false;

        const result = await searchEntity(url, contract, prod);
        return c.json(result);
    }
);

app.use(logger((str) => (new Date(), str)));
app.get("/entity/:id", async (c) => {
    const id = c.req.param("id");
    const result = await getEntityById(contract, admin, id);
    return c.json(result);
});

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
        return c.json({ handle, id, metadata: params.entity });
    }
);

app.use(logger((str) => (new Date(), str)));
app.post("/entity/edit", zValidator("json", updateRequestSchema), async (c) => {
    const { id, entity, submittedBy } = c.req.valid("json");
    try {
        if (submittedBy)
            return c.json(
                await updateEntityMetadata(contract, id, entity, submittedBy)
            );
        else {
            const admins = process.env.ADMIN_WHITELIST?.split(",") || [];
            const payload = c.get("jwtPayload");
            const user = payload.address;
            const admin = admins.find((admin) =>
                isAddressEqual(admin.split("@")[1] as `0x${string}`, user)
            );
            if (admin) {
                return c.json(
                    await updateEntityMetadata(contract, id, entity, {
                        characterId: admin.split("@")[0],
                        appKey: "0x0",
                        appSig: "0x0",
                    })
                );
            } else {
                throw new Error("Unauthorized");
            }
        }
    } catch (e) {
        log.error(e);
        return c.text("Internal Error.", 400);
    }
});

app.use(logger((str) => (new Date(), str)));
app.post(
    "/entity/markDuplicate",
    validator("json", (value, c) => {
        const parsed = markDuplicateRequestSchema.safeParse(value);
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        return parsed.data;
    }),
    async (c) => {
        const params = c.req.valid("json");
        if (params.revert) {
            await unmarkDuplicate(
                redisClient,
                contract,
                params.copy,
                params.original
            );
            return c.text("Success.");
        }

        try {
            await markDuplicate(
                redisClient,
                contract,
                params.copy,
                params.original
            );
        } catch (e) {
            if (e === "Already marked as duplicate.") {
                return c.text("Internal Error.", 400);
            } else {
                log.error(e);
                return c.text("Internal Error.", 400);
            }
        }

        // params.copy
        return c.text("Success.");
    }
);

app.get(
    "entity/getAllCopies",
    validator("query", (value, c) => {
        const parsed = getAllCopiesRequestSchema.safeParse(value);
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        return parsed.data;
    }),
    async (c) => {
        try {
            const entityId = c.req.valid("query").entityId;
            const copies = await getAllCopies(redisClient, entityId);
            return c.json(copies);
        } catch (e) {
            log.error(e);
            return c.text("Internal Error.", 400);
        }
    }
);

app.get(
    "entity/batchGetAllCopies",
    validator("query", (value, c) => {
        const parsed = batchGetAllCopiesRequestSchema.safeParse(value);
        if (!parsed.success) {
            return c.text("Invalid data", 401);
        }
        return parsed.data;
    }),
    async (c) => {
        try {
            const entityIds = c.req.valid("query").entityIds.split(",");
            const result = [];
            for (let id of entityIds) {
                const copies = await getAllCopies(redisClient, id);
                result.push(copies);
            }
            return c.json(result);
        } catch (e) {
            log.error(e);
            return c.text("Internal Error.", 400);
        }
    }
);

app.get("demo", async (c) => {
    const demoHtml = await readFile(
        resolve(__dirname, "./../examples/demo.html"),
        "utf-8"
    );
    return c.html(demoHtml);
});

app.route("/auth", auth);

const start = async () => {
    // Redis
    redisClient = await createClient()
        .on("error", (err) => log.error("Redis Client Error", err))
        .connect();

    log.info(`🎉 Redis is connected.`);

    // Contract
    const port = 3002;
    const privateKey = config.nomlandPrivateKey;
    contract = new Contract(privateKey);
    admin = privateKeyToAddress(privateKey);

    log.info(`🎉 Server is running on port ${port}`);

    serve({
        fetch: app.fetch,
        port,
    });
};

start();
