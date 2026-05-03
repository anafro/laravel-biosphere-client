export function regExpEquals(a: RegExp, b: RegExp): boolean {
    return regExpToComparableString(a) === regExpToComparableString(b);
}

export function regExpToComparableString(regex: RegExp): string {
    return regex.source + regex.flags;
}
