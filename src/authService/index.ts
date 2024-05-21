import { sign } from "hono/jwt";
import { SiweMessage, generateNonce } from "siwe";
import { getAddress } from "viem";
import { crossbell } from "viem/chains";

export async function generateChallenge({
    address,
    domain,
    uri,
    statement,
}: {
    address: `0x${string}`;
    domain: string;
    uri: string;
    statement: string;
}) {
    const nonce = generateNonce();
    const siweMessage = new SiweMessage({
        domain,
        address: getAddress(address),
        statement,
        uri,
        version: "1",
        chainId: crossbell.id,
        nonce,
        issuedAt: new Date().toISOString(),
    });

    const message = siweMessage.prepareMessage();

    // await this.redis.set(`siwe:challenge:${address}`, message, 'EX', 60 * 5);
    return message;
}

export async function signin(
    message: string,
    signature: string
): Promise<string> {
    const siweMessage = new SiweMessage(message);
    siweMessage.verify({ signature });
    const jwtPayload = {
        address: siweMessage.address,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
    };

    const token = await sign(jwtPayload, "secret");

    return token;
}
