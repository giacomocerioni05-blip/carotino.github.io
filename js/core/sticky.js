// scorrimento.js – le due sezioni guidate dallo scorrimento della pagina
//
// tutte e due funzionano così: la sezione è alta (es. 300vh) e dentro c'è un "palco" sticky alto 100vh.
// mentre la pagina scorre il palco resta fermo e "avanzamento" va da 0 a 1:
// quando arriva a 1 il palco si sblocca e si continua a scorrere.
//
//    #chiusura: vista prospettica, scorrendo le stanghe si chiudono
//    #esploso:  stessa vista, scorrendo le parti si allontanano e compaiono i nomi

import * as THREE from 'three';
import { creaOcchiali } from './modello.js';
import { creaRenderer, creaScena, adatta } from './rendering.js';

// la vista prospettica comune alle due sezioni (fissa: durante lo scorrimento non gira)
const YAW = -0.45;
const PITCH = 0.36;

// quanto è avanzata una sezione sticky (0 = appena bloccata, 1 = sta per sbloccarsi)
//    la corsa usa l'altezza del palco (100svh) e non window.innerHeight:
//    su telefono la barra degli indirizzi che compare/scompare non fa più saltare l'animazione
const P_FISSO = new URLSearchParams(location.search).get('p');   // solo per controlli (vedi main.js)
function avanzamento(sezione, palco) {
    if (P_FISSO !== null) return Number(P_FISSO);
    const r = sezione.getBoundingClientRect();
    const corsa = r.height - palco.offsetHeight;
    return THREE.MathUtils.clamp(-r.top / corsa, 0, 1);
}

// prepara una scena sticky
//    opzioni.posa(occhiali, p): mette gli occhiali nella posa per l'avanzamento p (stanghe, esploso)
//    opzioni.dopo(p, occhiali, camera, renderer): etichette, testi, barra
//    opzioni.largo / opzioni.largoStretto: quanta larghezza dello schermo possono occupare
export async function scenaSticky(sezione, opzioni) {
    const palco = sezione.querySelector('.palco');
    const canvas = sezione.querySelector('canvas');
    const testiPalco = sezione.querySelector('.palco-testi');
    const renderer = creaRenderer(canvas);
    const scena = creaScena(renderer, opzioni.chiara);
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const occhiali = await creaOcchiali();
    const r = occhiali.radice;
    r.rotation.set(PITCH, YAW, 0);
    scena.add(r);

    // 1. l'ingombro di TUTTO il movimento (dall'inizio alla fine), calcolato una volta sola:
    //    così posizione e grandezza restano fisse e gli occhiali non "ballano" mentre si chiudono o esplodono
    const ingombro = new THREE.Box3();
    r.position.set(0, 0, 0);
    r.scale.setScalar(1);
    for (let i = 0; i <= 10; i++) {
        opzioni.posa(occhiali, i / 10);
        r.updateMatrixWorld(true);
        ingombro.union(new THREE.Box3().setFromObject(r));
    }
    const misuraIngombro = ingombro.getSize(new THREE.Vector3());   // per la grandezza fissa

    // 2. lo spazio libero tra i titoli e il fondo del palco (ricalcolato solo quando cambia la misura)
    const spazio = {};
    function sistema() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const altezzaVista = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        spazio.unita = altezzaVista / h;                 // quante unità del mondo per pixel
        const sopra = testiPalco ? testiPalco.getBoundingClientRect().bottom - palco.getBoundingClientRect().top + 16 : 0;
        spazio.h = Math.max(h - 40 - sopra, h * 0.5);
        spazio.w = w * (w < 734 ? (opzioni.largoStretto || 0.88) : (opzioni.largo || 0.6));
        spazio.y = (h / 2 - (sopra + spazio.h / 2)) * spazio.unita;   // centro verticale dello spazio libero
        spazio.scalaFissa = adattaA(misuraIngombro);
    }
    // la scala che fa stare una scatola nello spazio libero
    //    (la profondità conta un po': in prospettiva le parti vicine sembrano più grandi)
    function adattaA(m) {
        return Math.min((spazio.w * spazio.unita) / (m.x + m.z * 0.15), (spazio.h * spazio.unita * 0.92) / m.y, 1.8);
    }
    // centra la posa attuale: il centro della sua scatola va al centro dello spazio libero
    //    con opzioni.zoom anche la grandezza segue la posa (l'esploso parte grande e si allarga restando nello schermo)
    const scatola = new THREE.Box3(), centro = new THREE.Vector3(), misura = new THREE.Vector3();
    function centra() {
        r.position.set(0, 0, 0);
        r.scale.setScalar(1);
        r.updateMatrixWorld(true);
        scatola.setFromObject(r).getCenter(centro);
        scatola.getSize(misura);
        const scala = opzioni.zoom ? adattaA(misura) : spazio.scalaFissa;
        r.scale.setScalar(scala);
        r.position.set(-centro.x * scala, spazio.y - centro.y * scala, -centro.z * scala);
        r.updateMatrixWorld(true);
    }

    // 3. scorrimento morbido: l'avanzamento mostrato insegue quello vero (niente scatti con rotella o trackpad)
    let visibile = false;
    let mostrato = null;
    let ultimaMisura = '';
    let tempo = performance.now();

    function disegna(ora) {
        const dt = Math.min(0.1, (ora - tempo) / 1000);
        tempo = ora;
        if (!visibile) return;
        const vero = avanzamento(sezione, palco);
        const misura = canvas.clientWidth + 'x' + canvas.clientHeight;
        const cambiataMisura = misura !== ultimaMisura;
        if (mostrato === null || P_FISSO !== null) mostrato = vero;
        const prima = mostrato;
        mostrato += (vero - mostrato) * (1 - Math.exp(-dt * 9));
        if (Math.abs(vero - mostrato) < 0.0004) mostrato = vero;
        if (mostrato === prima && !cambiataMisura && ultimaMisura) return;   // niente da ridisegnare
        if (!adatta(renderer, camera)) return;
        if (cambiataMisura) { ultimaMisura = misura; sistema(); }
        opzioni.posa(occhiali, mostrato);
        centra();
        camera.updateMatrixWorld();   // serve per proiettare i punti delle etichette già al primo fotogramma
        if (opzioni.dopo) opzioni.dopo(mostrato, occhiali, camera, renderer);
        renderer.render(scena, camera);
    }

    new IntersectionObserver(([voce]) => {
        visibile = voce.isIntersecting;
        if (visibile) {
            mostrato = null;        // rientrando nella sezione parto subito dal punto giusto
            ultimaMisura = '';
            tempo = performance.now();
        }
        renderer.setAnimationLoop(visibile ? disegna : null);
    }, { rootMargin: '100px' }).observe(sezione);
}

// mostra i testi della sezione in base all'avanzamento (data-da / data-a sugli elementi)
export function testi(sezione, p) {
    sezione.querySelectorAll('[data-da]').forEach((el) => {
        const da = Number(el.dataset.da), a = Number(el.dataset.a ?? 1.01);
        el.classList.toggle('attivo', p >= da && p < a);
    });
}
