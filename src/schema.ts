import { entitySchema } from "entity-types";
import { union, z } from "zod";

export const submitLogSchema = z.object({
    characterId: union([z.string(), z.number()]), // character id
    appKey: z.custom<`0x${string}`>((val: any) => /^0x/.test(val)),
    appSig: z.custom<`0x${string}`>((val: any) => /^0x/.test(val)), // app signature
});

export const createRequestSchema = z.object({
    entity: entitySchema,
    submittedBy: submitLogSchema,
    prod: z.boolean().optional(), // production or test
});

export const updateRequestSchema = z.object({
    id: union([z.string(), z.number()]), // entity id
    entity: entitySchema,
    submittedBy: submitLogSchema,
});
