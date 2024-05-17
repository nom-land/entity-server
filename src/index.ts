import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { validator } from "hono/validator";
import {
    createRequestSchema,
    getAllCopiesRequestSchema,
    markDuplicateRequestSchema,
    searchRequestSchema,
    updateRequestSchema,
} from "./schema";
import { logger } from "hono/logger";
import { getEntity, searchEntity } from "./entity";
import { Contract } from "crossbell/contract";
import { privateKeyToAddress } from "viem/accounts";
import "dotenv/config";
import { log } from "./logger";
import { createClient } from "redis";
import {
    getAllCopies,
    markDuplicate,
    unmarkDuplicate,
} from "./entity/duplicate";
import { CharacterMetadata } from "crossbell";

const app = new Hono();

let contract: Contract;
let admin: `0x${string}`;
let redisClient: any;

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
        return c.json({ handle, id, metadata: params.entity });
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

const start = async () => {
    // Redis
    redisClient = await createClient()
        .on("error", (err) => log.error("Redis Client Error", err))
        .connect();

    log.info(`🎉 Redis is connected.`);

    // Contract
    const port = 3001;
    const privateKey = process.env.PRI_KEY as `0x${string}`;
    contract = new Contract(privateKey);
    admin = privateKeyToAddress(privateKey);

    // redisClient.set("69869", "");
    // redisClient.set("69870", "");
    // const metadata = await contract.character.get({ characterId: "69870" });
    // console.log(metadata);
    // await contract.character.changeMetadata({
    //     characterId: "69870",
    //     modifier: (metadata: CharacterMetadata | undefined) => {
    //         if (!metadata) {
    //             return {};
    //         }
    //         const { duplicate, ...rest } = metadata as any;
    //         return rest;
    //     },
    // });

    log.info(`🎉 Server is running on port ${port}`);

    serve({
        fetch: app.fetch,
        port,
    });
};

start();
