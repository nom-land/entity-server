import { entitySchema } from "entity-types";
import { union, z } from "zod";

export const createRequestSchema = z.object({
    entity: entitySchema,
    appSig: z.string(), // app signature
    createdBy: union([z.string(), z.number()]), // character id
    prod: z.boolean().optional(), // production or test
});
