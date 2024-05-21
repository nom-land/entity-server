import md5 from "md5";

export function hashOf(content: string, digits = 4, suffix = true): string {
    const hash = md5(content);
    if (suffix) return hash.slice(hash.length - digits, hash.length);
    else return hash.slice(0, digits);
}
