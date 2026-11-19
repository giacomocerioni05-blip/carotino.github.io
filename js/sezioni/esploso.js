// esploso.js – sezione #esploso: scorrendo, le parti si separano e compaiono i nomi
import * as THREE from 'three';
import { scenaSticky, testi } from '../core/sticky.js';
import { PARTI } from '../core/modello.js';

export function avviaEsploso() {
    const sezione = document.querySelector('#esploso');
    const contenitore = sezione.querySelector('.etichette');

    // un'etichetta per ogni tipo di parte: un punto sulla parte, una linea e il nome in una colonna laterale
    //    lato: da quale stanga prendo il punto per le parti doppie (+1 = lontana, a sinistra; -1 = vicina, a destra)
    const LATO_ETICHETTA = { lente: 0, naselli: 0, montatura: 1, cerniera: -1, protezione: -1, asta: 1, terminale: -1 };
    const etichette = Object.entries(PARTI).map(([tipo, info]) => {
        const el = document.createElement('div');
        el.className = 'etichetta';
        el.innerHTML = `<span class="etichetta-linea"></span><span class="etichetta-punto"></span>` +
            `<span class="etichetta-testo"><strong>${info.nome}</strong><small>${info.nota}</small></span>`;
        contenitore.appendChild(el);
        return {
            tipo, el,
            punto: el.querySelector('.etichetta-punto'),
            linea: el.querySelector('.etichetta-linea'),
            testo: el.querySelector('.etichetta-testo')
        };
    });

    const v = new THREE.Vector3();
    const DISTANZA_MINIMA = 46;   // px tra un nome e l'altro nella stessa colonna

    // l'esploso avviene tra il 10% e l'85% della sezione
    const esploso = (p) => THREE.MathUtils.clamp((p - 0.1) / 0.75, 0, 1);

    return scenaSticky(sezione, {
        largo: 0.54,         // resta spazio ai lati per i nomi delle parti
        zoom: true,
        largoStretto: 0.72,
        posa: (occhiali, p) => occhiali.esplodi(esploso(p)),
        dopo: (p, occhiali, camera, renderer) => {
        const e = esploso(p);

        const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
        const stretto = w < 734;
        const centroX = w / 2;   // gli occhiali sono centrati nello schermo

        // 1. dove sta ogni parte sullo schermo
        for (const et of etichette) {
            v.copy(occhiali.centroParte(et.tipo, LATO_ETICHETTA[et.tipo])).project(camera);
            et.x = (v.x * 0.5 + 0.5) * w;
            et.y = (-v.y * 0.5 + 0.5) * h;
            et.sinistra = et.x < centroX;
            const parte = occhiali.parti.find((x) => x.tipo === et.tipo);
            // il nome compare quando la sua parte ha finito di staccarsi
            et.pronta = e >= Math.min(0.98, parte.inizio + 0.3);
        }
        // 2. i nomi in due colonne (a sinistra e a destra degli occhiali), senza sovrapporsi
        for (const sinistra of [true, false]) {
            const colonna = etichette.filter((et) => et.sinistra === sinistra).sort((a, b) => a.y - b.y);
            let ultimo = -Infinity;
            for (const et of colonna) {
                et.ay = Math.max(et.y, ultimo + DISTANZA_MINIMA);
                ultimo = et.ay;
            }
            // se sono scesi troppo, risalgono tutti insieme
            const troppo = ultimo - (h - 70);
            if (troppo > 0) colonna.forEach((et) => { et.ay -= troppo; });
        }
        // 3. disegno punto, linea e nome
        for (const et of etichette) {
            const margine = stretto ? 14 : w * 0.1;
            et.ax = et.sinistra ? Math.min(et.x - 40, margine + (stretto ? 0 : 130)) : Math.max(et.x + 40, w - margine - (stretto ? 0 : 130));
            if (stretto) et.ax = et.sinistra ? Math.min(et.x - 24, w * 0.3) : Math.max(et.x + 24, w * 0.7);
            const dx = et.ax - et.x, dy = et.ay - et.y;
            et.punto.style.transform = `translate(${et.x.toFixed(1)}px, ${et.y.toFixed(1)}px)`;
            et.linea.style.transform = `translate(${et.x.toFixed(1)}px, ${et.y.toFixed(1)}px) rotate(${Math.atan2(dy, dx)}rad)`;
            et.linea.style.setProperty('--lunghezza', Math.hypot(dx, dy).toFixed(1) + 'px');
            et.testo.style.transform = `translate(${et.ax.toFixed(1)}px, ${et.ay.toFixed(1)}px) translate(${et.sinistra ? '-100%' : '0'}, -50%)`;
            et.el.classList.toggle('a-sinistra', et.sinistra);
            et.el.classList.toggle('attivo', et.pronta);
        }
        testi(sezione, p);
        }
    });
}
