// viste.js – la griglia delle viste (sezione scura, 6 colonne, 2 immagini per riga)
//
// le immagini non sono file: le disegno una volta sola con three.js all'apertura della pagina
// (così sono sempre uguali al modello) e le metto nei tag <img> della griglia.
// le viste ortogonali usano una camera "piatta" (ortografica) come nel disegno tecnico.

import * as THREE from 'three';
import { creaOcchiali } from '../core/modello.js';
import { creaRenderer, creaScena } from '../core/rendering.js';

// [nome, yaw, pitch, ortografica, apertura stanghe]
const VISTE = [
    ['frontale',    0,              0,              true,  1],
    ['posteriore',  Math.PI,        0,              true,  1],
    ['laterale-dx', Math.PI / 2 ,   0,              true,  1],
    ['laterale-sx', -Math.PI / 2,  0,              true,  1],
    ['alto',        0,              Math.PI / 2,    true,  1],
    ['basso',       0,              -Math.PI / 2,   true,  1],
    ['prospettica', -Math.PI / 5,   0.42,           false, 1],
    ['tre-quarti',  Math.PI * 0.8,  0.3,            false, 1],
    ['chiusi',      Math.PI / 6,    0.35,           false, 0]
];

export async function creaViste() {
    const immagini = document.querySelectorAll('#viste img[data-vista]');
    if (!immagini.length) return;

    const canvas = document.createElement('canvas');
    const renderer = creaRenderer(canvas, { conserva: true });
    renderer.setPixelRatio(1);
    renderer.setSize(1200, 900, false);
    const scena = creaScena(renderer);
    const occhiali = await creaOcchiali();
    scena.add(occhiali.radice);

    const ortografica = new THREE.OrthographicCamera(-1.2, 1.2, 0.9, -0.9, 0.1, 100);
    ortografica.position.set(0, 0, 10);
    const prospettica = new THREE.PerspectiveCamera(26, 4 / 3, 0.1, 100);
    prospettica.position.set(0, 0, 7.2);

    for (const [nome, yaw, pitch, orto, apertura] of VISTE) {
        const img = document.querySelector(`#viste img[data-vista="${nome}"]`);
        if (!img) continue;
        occhiali.apertura(apertura);
        occhiali.radice.rotation.set(pitch, yaw, 0, 'XYZ');
        // centra la vista sulla sagoma che si vede
        occhiali.radice.position.set(0, 0, 0);
        occhiali.radice.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(occhiali.radice);
        const c = box.getCenter(new THREE.Vector3());
        occhiali.radice.position.set(-c.x, -c.y, 0);
        renderer.render(scena, orto ? ortografica : prospettica);
        img.src = canvas.toDataURL('image/png');
        img.closest('figure').classList.add('pronta');
        // lascio respirare il browser tra un disegno e l'altro
        await new Promise((r) => requestAnimationFrame(r));
    }
    renderer.dispose();
    renderer.forceContextLoss();
}
