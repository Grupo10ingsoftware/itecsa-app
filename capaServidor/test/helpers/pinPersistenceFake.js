export function matchesRow(row, where) {
    return Object.entries(where).every(([key, value]) => {
        if (key === 'OR') return value.some(w => matchesRow(row, w));
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            if ('gt' in value) return row[key] > value.gt;
            if ('lt' in value) return row[key] < value.lt;
        }
        return value instanceof Date ? +row[key] === +value : (row[key] ?? null) === value;
    });
}
export function applyRow(row, data) {
    for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? (row[key] ?? 0) + value.increment : value;
    return row;
}
