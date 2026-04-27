export function isJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch (e) {
        return false;
    }
}
