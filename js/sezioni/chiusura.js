// chiusura.js – sezione #chiusura: scorrendo, le stanghe si chiudono
import * as THREE from 'three';
import { scenaSticky, testi } from '../core/sticky.js';
import { facilita } from '../core/easing.js';

export function avviaChiusura() {
    const sezione = document.querySelector('#chiusura');
    const barra = sezione.querySelector('.avanzamento-barra');
    // aperte fino al 15%, si chiudono tra il 15% e l'80%, poi restano chiuse
    const chiusura = (p) => facilita(THREE.MathUtils.clamp((p - 0.15) / 0.65, 0, 1));
    return scenaSticky(sezione, {
        largo: 0.62,
        posa: (occhiali, p) => occhiali.apertura(1 - chiusura(p)),
        dopo: (p) => {
            barra.style.transform = `scaleX(${chiusura(p)})`;
            testi(sezione, p);
        }
    });
}
