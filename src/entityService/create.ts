import { CharacterMetadata, Contract } from "crossbell";
import { log } from "../logger";
import { Entity } from "entity-types";
import { SubmitLog } from ".";
import { parseGwei } from "viem";

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
    log.info(
        "[DEBUG] c.character.create({ owner:",
        admin,
        ", handle:",
        handle,
        ", metadataOrUri:",
        profile,
        "}) "
    );

    const { data } = await c.character.create(
        {
            owner: admin,
            handle,
            metadataOrUri: profile,
        },
        {
            gasPrice: parseGwei("3"), // TODO?
        }
    );
    return data;
};
