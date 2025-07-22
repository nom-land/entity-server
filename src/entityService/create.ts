import { CharacterMetadata, Contract } from "crossbell";
import { log } from "../logger";
import { Entity } from "entity-types";
import { SubmitLog } from ".";
import { parseGwei } from "viem";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createEntityWithRetry = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    profile: CharacterMetadata,
    maxRetries = 5
) => {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            log.info(`Creating entity attempt ${attempt + 1}/${maxRetries}`, {
                handle,
                attempt: attempt + 1,
            });

            const { data } = await c.character.create(
                {
                    owner: admin,
                    handle,
                    metadataOrUri: profile,
                },
                {
                    gasPrice: parseGwei("3"),
                }
            );

            log.info(`Entity created successfully on attempt ${attempt + 1}`, {
                handle,
                characterId: data,
            });

            return data;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.message || "";

            const isIPFSError =
                errorMessage.includes("Unexpected token") ||
                errorMessage.includes("Internal S") ||
                errorMessage.includes("JSON") ||
                errorMessage.includes("ipfs");

            if (isIPFSError) {
                log.warn(`IPFS service error on attempt ${attempt + 1}`, {
                    handle,
                    error: errorMessage,
                    attempt: attempt + 1,
                });

                const waitTime = Math.min(2000 * Math.pow(2, attempt), 30000); // 最大等待30秒
                log.info(`Waiting ${waitTime}ms before retry...`);
                await sleep(waitTime);
            } else {
                log.error(`Non-IPFS error on attempt ${attempt + 1}`, {
                    handle,
                    error: errorMessage,
                });
                throw error;
            }
        }
    }

    log.error(`Failed to create entity after ${maxRetries} attempts`, {
        handle,
        lastError: lastError?.message,
    });
    throw lastError;
};

export const createNewEntityIfNotExist = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    metadata: Entity,
    createdBy: SubmitLog
) => {
    const { data } = await c.character.getByHandle({ handle });
    if (data.characterId) {
        return data.characterId;
    } else {
        return createNewEntity(c, admin, handle, metadata, createdBy);
    }
};

export const createNewEntity = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    entity: Entity,
    createdBy: SubmitLog
) => {
    const profile = {
        ...entity,
        created_by: {
            ...createdBy,
        },
        variant: "entity",
    } as CharacterMetadata;

    try {
        log.info(`Starting entity creation`, {
            handle,
            url: entity.url,
        });

        const result = await createEntityWithRetry(c, admin, handle, profile);

        log.info(`Entity creation completed`, {
            handle,
            characterId: result,
            url: entity.url,
        });

        return result;
    } catch (error: any) {
        log.error("Failed to create entity", {
            handle,
            url: entity.url,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
};
