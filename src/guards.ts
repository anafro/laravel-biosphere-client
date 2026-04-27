function usable(value: any): value is undefined | null {
    return typeof value !== 'undefined' && value !== null;
}

export function require(parameter: string, value: any): void {
    if (usable(value)) {
        return;
    }

    throw new Error(`The ${parameter} must be set, yet it was ${value}.`);
}
