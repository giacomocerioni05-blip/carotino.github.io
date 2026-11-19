// intro.js – il "video" iniziale su fondo nero
//
// la sequenza (tempo in secondi):
//    0.0 – 1.9  vista laterale, stanghe chiuse: gli occhiali partono dalla colonna 1 e scorrono al centro
//               mentre scorrono le stanghe si aprono e la vista diventa prospettica, un po' dall'alto
//    1.9 – 4.2  girano su se stessi: si vedono il lato, il retro, l'altro lato, il basso e l'alto
//    4.2        vista frontale con le lenti: il video resta fermo e appare il nome
//
// non è un file video: è la scena 3D animata nel browser (più nitida e leggera di un mp4)

import * as THREE from 'three';
import { creaOcchiali } from '../core/modello.js';
import { creaRenderer, creaScena, adatta } from '../core/rendering.js';
import { facilita } from '../core/easing.js';

const DURATA_ENTRATA = 1.9;
const DURATA_GIRO = 2.3;
const FINE = DURATA_ENTRATA + DURATA_GIRO;

// le pose chiave (yaw = rotazione intorno all'asse verticale, pitch = inclinazione verso chi guarda)
const LATO = { yaw: Math.PI / 2, pitch: 0.0 };          // di profilo, frontale verso destra
const PROSPETTICA = { yaw: Math.PI / 4.5, pitch: 0.42 }; // tre quarti, dall'alto
const FRONTE = { yaw: Math.PI * 2, pitch: 0.0 };         // un giro intero e si ferma di fronte

export async function avviaIntro() {
    const sezione = document.querySelector('#intro');
    const canvas = sezione.querySelector('.intro-canvas');
    const colonna1 = sezione.querySelector('.segna-colonna-1');
    const caricamento = sezione.querySelector('.intro-caricamento');

    const renderer = creaRenderer(canvas);
    const scena = creaScena(renderer);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const occhiali = await creaOcchiali();
    scena.add(occhiali.radice);
    caricamento.classList.add('nascosto');

    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // per controllare un fotogramma: index.html?t=3.5 ferma l'animazione a 3.5 secondi
    const tFisso = new URLSearchParams(location.search).get('t');

    // scala: su schermi stretti gli occhiali devono stare nella larghezza
    function scalaSchermo() {
        const altezzaVista = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const larghezzaVista = altezzaVista * camera.aspect;
        return Math.min(1.25, (larghezzaVista * 0.7) / 2, (altezzaVista * 0.5) / 1.2);
    }
    // la x (nel mondo) di partenza: appena fuori dal bordo sinistro dello schermo
    function xPartenza() {
        const r = colonna1.getBoundingClientRect();
        const ndc = ((r.left + r.width / 2) / canvas.clientWidth) * 2 - 1;
        const altezzaVista = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const metaLarghezza = (altezzaVista * camera.aspect) / 2;
        return Math.min(ndc * metaLarghezza, -metaLarghezza) - 1.2 * scalaSchermo();
    }

    let inizio = null;
    let finito = false;
    let visibile = true;

    function posa(t) {
        const r = occhiali.radice;
        const s = scalaSchermo();
        r.scale.setScalar(s);
        if (t < DURATA_ENTRATA) {
            const k = 1 - Math.pow(1 - t / DURATA_ENTRATA, 4);
            r.position.x = THREE.MathUtils.lerp(xPartenza(), 0, k);
            r.position.y = THREE.MathUtils.lerp(0.1, 0.25, k);
            r.rotation.y = THREE.MathUtils.lerp(LATO.yaw, PROSPETTICA.yaw, k);
            r.rotation.x = THREE.MathUtils.lerp(LATO.pitch, PROSPETTICA.pitch, k);
            // le stanghe si aprono durante lo scorrimento (dal 25% al 90% del tragitto)
            occhiali.apertura(facilita(THREE.MathUtils.clamp((t / DURATA_ENTRATA - 0.25) / 0.65, 0, 1)));
            renderer.domElement.style.opacity = 1;
        } else {
            const k = Math.min(1, (t - DURATA_ENTRATA) / DURATA_GIRO);
            const g = facilita(k);
            r.position.set(0, 0.25, 0);
            r.rotation.y = THREE.MathUtils.lerp(PROSPETTICA.yaw, FRONTE.yaw, g);
            // l'inclinazione passa dall'alto al basso e torna dritta: così si vedono anche sopra e sotto
            r.rotation.x = PROSPETTICA.pitch * Math.cos(k * Math.PI * 1.5) * (1 - k * k * k);
            occhiali.apertura(1);
            renderer.domElement.style.opacity = 1;
        }
    }

    function fotogramma(ora) {
        if (inizio === null) inizio = ora;
        const t = tFisso !== null ? Number(tFisso) : ridotto ? FINE : (ora - inizio) / 1000;
        if (!adatta(renderer, camera)) return;
        posa(Math.min(t, FINE));
        if (t >= FINE && !finito) {
            finito = true;
            sezione.classList.add('intro-finita');   // il CSS fa apparire nome e autore
        }
        renderer.render(scena, camera);
        // finita l'animazione disegno solo quando cambia la misura della finestra
        if (finito) renderer.setAnimationLoop(null);
    }

    renderer.setAnimationLoop(fotogramma);

    // ridisegna la posa finale se si ridimensiona la finestra
    window.addEventListener('resize', () => {
        if (finito && visibile) {
            adatta(renderer, camera);
            posa(FINE);
            renderer.render(scena, camera);
        }
    });

    // salta l'animazione: clic o scorrimento durante il video
    function salta() {
        if (!finito && inizio !== null) inizio = performance.now() - FINE * 1000;
    }
    sezione.querySelector('.intro-salta').addEventListener('click', salta);
    window.addEventListener('wheel', (e) => { if (e.deltaY > 0 && window.scrollY < 10) salta(); }, { passive: true, once: true });

    new IntersectionObserver(([voce]) => { visibile = voce.isIntersecting; }).observe(sezione);
}
