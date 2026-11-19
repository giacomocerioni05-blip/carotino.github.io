// main.js – avvia tutte le sezioni della pagina
//
// ordine: prima l'intro (è la prima cosa che si vede), poi il resto quando il modello è caricato.
// tutte le sezioni usano lo stesso file .glb, scaricato una volta sola (vedi modello.js)

import { solo } from './ui/debug.js';
import './ui/navigazione.js';
import { caricaFile } from './core/modello.js';
import { avviaIntro } from './sezioni/intro.js';
import { creaViste } from './sezioni/viste.js';
import { avviaChiusura } from './sezioni/chiusura.js';
import { avviaEsploso } from './sezioni/esploso.js';
import { avviaIndossa } from './sezioni/indossa.js';

if (!solo || solo === 'intro') avviaIntro().catch(errore);
avviaIndossa();

caricaFile().then(async (dati) => {
    scriviMisure(dati.box);
    await Promise.all([avviaChiusura(), avviaEsploso()]);
    await creaViste();
}).catch(errore);

// le misure vere nella scheda tecnica (il file è in metri)
function scriviMisure(box) {
    const cm = (v) => (v * 100).toLocaleString('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' cm';
    const valori = {
        larghezza: cm(box.max.x - box.min.x),
        altezza: cm(box.max.y - box.min.y),
        profondita: cm(box.max.z - box.min.z)
    };
    document.querySelectorAll('[data-misura]').forEach((el) => { el.textContent = valori[el.dataset.misura]; });
}

function errore(e) {
    console.error(e);
    const avviso = document.querySelector('.intro-caricamento');
    if (avviso) {
        avviso.classList.remove('nascosto');
        avviso.textContent = location.protocol === 'file:'
            ? 'Apri il sito da un server locale (es. Live Server): dal file il modello 3D non si carica.'
            : 'Non riesco a caricare il modello 3D.';
    }
}
