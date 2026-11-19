// curve di velocità
export function facilita(t) {   // ease in-out cubica
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function uscita(t) {     // ease out cubica
    return 1 - Math.pow(1 - t, 3);
}
