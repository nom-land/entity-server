import { CharacterMetadata, Contract, Numberish } from "crossbell";
import { log } from "../logger";
import { Entity } from "entity-types";

interface UpdateLog {
    characterId: Numberish;
    appKey: `0x${string}`;
    appSig: `0x${string}`;
}

export const createNewEntityIfNotExist = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    metadata: Entity,
    createdBy: Numberish
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
    createdBy: Numberish
) => {
    const profile = {
        ...entity,
        created_by: {
            characterId: createdBy,
            appKey: "0x", // TODO: use app key
            appSig: "0x", // TODO: app sig
        } as UpdateLog,
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

    const { data } = await c.character.create({
        owner: admin,
        handle,
        metadataOrUri: profile,
    });
    return data;
};
