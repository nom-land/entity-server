import { CharacterMetadata, Contract, Numberish } from "crossbell";

export async function markDuplicate(
    redis: any,
    contract: Contract,
    copy: Numberish,
    original: Numberish
) {
    // 1. Update the copy's metadata to reflect that it is a duplicate
    await contract.character.changeMetadata({
        characterId: copy,
        modifier: (metadata: CharacterMetadata | undefined) => {
            if (!metadata) {
                return {
                    duplicate: original,
                } as CharacterMetadata;
            }
            (metadata as any).duplicate = original;
            return metadata;
        },
    });

    // 2. Store the relationship between the original and the copy in Redis
    const value: string = await redis.get(original.toString());
    if (value) {
        const parsed = JSON.parse(value);
        if ("original" in parsed) {
            throw new Error("Already marked as duplicate.");
        } else if (parsed.duplicates instanceof Array) {
            parsed.duplicates.push(copy.toString());
            await redis.set(original.toString(), JSON.stringify(parsed));
        } else {
            throw new Error("Something went wrong.");
        }
    } else {
        await redis.set(
            original.toString(),
            JSON.stringify({
                duplicates: [copy.toString()],
            })
        );
    }

    await redis.set(
        copy.toString(),
        JSON.stringify({
            original: original.toString(),
        })
    );
}

export async function unmarkDuplicate(
    redis: any,
    contract: Contract,
    copy: Numberish,
    original: Numberish
) {
    // 1. Update the copy's metadata to reflect that it is not a duplicate
    await contract.character.changeMetadata({
        characterId: copy,
        modifier: (metadata: CharacterMetadata | undefined) => {
            if (!metadata) {
                return {};
            }
            if ((metadata as any).duplicate === original) {
                const { duplicate, ...rest } = metadata as any;
                return rest;
            }
            return metadata;
        },
    });

    // 2. Remove the relationship between the original and the copy in Redis
    const value: string = await redis.get(original.toString());

    if (value) {
        const parsed = JSON.parse(value);
        if (parsed.duplicates instanceof Array) {
            const found = parsed.duplicates.indexOf(copy.toString());
            parsed.duplicates.splice(found);
            await redis.set(original.toString(), JSON.stringify(parsed));
        }
    }

    await redis.set(copy.toString(), "");
}

export async function getAllCopies(redis: any, entityId: Numberish) {
    const value = await redis.get(entityId.toString());

    if (!value) return [];

    const parsed = JSON.parse(value);

    if (parsed.duplicates instanceof Array) {
        if (parsed.duplicates.length === 0) {
            return [];
        }
        return (parsed.duplicates as Array<string>).concat(entityId.toString());
    } else if ("original" in parsed) {
        const original = parsed.original;
        const copies = await redis.get(original);
        return (JSON.parse(copies).duplicates as Array<string>).concat(
            original
        );
    }
}
