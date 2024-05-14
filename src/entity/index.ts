import { Contract, Numberish } from "crossbell";
import { createNewEntityIfNotExist } from "./crossbell";
import { hashOf } from "./utils";
import { Entity } from "entity-types";

// Get the entity from the metadata, if it doesn't exist, create it
export async function getEntity(
    entity: Entity,
    c: Contract,
    admin: `0x${string}`,
    createdBy: Numberish,
    prod: boolean
): Promise<{
    handle: string;
    id: string;
}> {
    let characterId: bigint;

    characterId = BigInt(0);
    const { url } = entity;

    const prefix = prod ? "" : "test-";

    const handle = prefix + hashOf(url, 12);

    characterId = await createNewEntityIfNotExist(
        c,
        admin,
        handle,
        entity,
        createdBy
    );
    return { handle, id: characterId.toString() };
}
