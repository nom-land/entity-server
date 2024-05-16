import { entitySchema } from "entity-types";
import { union, z } from "zod";

export const searchRequestSchema = z.object({
    url: z.string().refine(
        // TODO: support more protocols, e.g. ipfs://
        (value) => value.startsWith("http://") || value.startsWith("https://"),
        {
            message: "Invalid URL. Must start with 'http://' or 'https://'.",
        }
    ),
    prod: z
        .string()
        .toLowerCase()
        .transform((x) => x === "true")
        .pipe(z.boolean()),
});

export const submitLogSchema = z.object({
    characterId: union([z.string(), z.number()]), // character id
    appKey: z.custom<`0x${string}`>((val: any) => /^0x/.test(val)),
    appSig: z.custom<`0x${string}`>((val: any) => /^0x/.test(val)), // app signature
});

export const createRequestSchema = z.object({
    entity: entitySchema,
    submittedBy: submitLogSchema,
    prod: z
        .string()
        .toLowerCase()
        .transform((x) => x === "true")
        .pipe(z.boolean()),
});

export const updateRequestSchema = z.object({
    id: union([z.string(), z.number()]), // entity id
    entity: entitySchema,
    submittedBy: submitLogSchema,
});
