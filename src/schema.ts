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
        .union([
            z
                .string()
                .toLowerCase()
                .transform((x) => x === "true")
                .pipe(z.boolean()),
            z.boolean(),
        ])
        .optional(),
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
        .union([
            z
                .string()
                .toLowerCase()
                .transform((x) => x === "true")
                .pipe(z.boolean()),
            z.boolean(),
        ])
        .optional(),
});

export const updateRequestSchema = z.object({
    id: union([z.string(), z.number()]), // entity id
    entity: entitySchema,
    submittedBy: submitLogSchema,
});

export const markDuplicateRequestSchema = z.object({
    copy: union([z.string(), z.number()]), // entity id
    original: union([z.string(), z.number()]), // entity id
    revert: z.union([
        z
            .string()
            .toLowerCase()
            .transform((x) => x === "true")
            .pipe(z.boolean()),
        z.boolean().optional(),
    ]),
    // revert the duplicate relationship, if it exists
});

export const getAllCopiesRequestSchema = z.object({
    entityId: z.string(), // entity id
});

export const batchGetAllCopiesRequestSchema = z.object({
    entityIds: z.string(), // entity ids
});
