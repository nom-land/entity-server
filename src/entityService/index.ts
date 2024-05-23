import { CharacterMetadata, Contract, Indexer, Numberish } from "crossbell";
import { createNewEntityIfNotExist } from "./create";
import { hashOf } from "./utils";
import { Entity } from "entity-types";
import { isAddressEqual } from "viem";

export interface SubmitLog {
    characterId: Numberish;
    appKey: `0x${string}`;
    appSig: `0x${string}`;
}

// Get the entity from the metadata, if it doesn't exist, create it
export async function getEntity(
    entity: Entity,
    submitBy: SubmitLog,
    c: Contract,
    admin: `0x${string}`,
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
        submitBy
    );
    return { handle, id: characterId.toString() };
}

export const getEntityById = async (
    c: Contract,
    admin: `0x${string}`,
    characterId: Numberish
) => {
    // TODO: use permission check: c.contract.read.getOperatorPermissions();
    // const owner = await c.contract.read.ownerOf([BigInt(characterId)]);

    const indexer = new Indexer();
    const data = await indexer.character.get(characterId);

    if (data && data.metadata?.content) {
        const hasPermission = isAddressEqual(data?.owner, admin);

        const { type, connected_accounts, variant, ...metadata } = data.metadata
            ?.content as CharacterMetadata & { variant: string };

        return {
            handle: data.handle,
            id: data.characterId.toString(),
            metadata,
            hasPermission,
        };
    } else {
        return null;
    }
};

export const searchEntity = async (url: string, c: Contract, prod: boolean) => {
    const prefix = prod ? "" : "test-";

    const handle = prefix + hashOf(url, 12);

    const { data } = await c.character.getByHandle({ handle });
    if (data.characterId && data.metadata) {
        const { type, connected_accounts, variant, ...metadata } =
            data.metadata as CharacterMetadata & { variant: string };

        return {
            handle,
            id: data.characterId.toString(),
            metadata,
        };
    } else {
        return null;
    }
};

export const updateEntityMetadata = (
    c: Contract,
    characterId: Numberish,
    newEntity: Entity,
    updatedBy: SubmitLog
) => {
    return c.character.changeMetadata({
        characterId,
        modifier: (oldMetadata: CharacterMetadata | undefined) => {
            if (!oldMetadata) {
                return {};
            }
            const {
                updated_by,
                created_by,
                type,
                connected_accounts,
                variant,
                duplicate,
            } = oldMetadata as any;

            const new_updated_by = ((updated_by as SubmitLog[]) || []).concat([
                updatedBy,
            ]);

            // TODO: wrap it in a type
            return {
                ...newEntity,
                updated_by: new_updated_by,
                created_by,
                variant,
                type,
                connected_accounts,
                duplicate,
            } as CharacterMetadata;
        },
    });
};
