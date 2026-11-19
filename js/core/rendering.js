// rendering.js – renderer, scena con luci da studio e adattamento alla misura del canvas
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// scena con luci "da studio" e riflessi: uguale per tutte le sezioni

export function creaRenderer(canvas, opzioni = {}) {
    const renderer = new THREE.WebGLRenderer({
        canvas, antialias: true, alpha: true,
        preserveDrawingBuffer: !!opzioni.conserva
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    return renderer;
}

export function creaScena(renderer, chiara = false) {
    const scena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    // luci di contorno: sul nero fanno risaltare la sagoma (come nelle foto prodotto)
    const chiave = new THREE.DirectionalLight(0xffffff, chiara ? 1.6 : 2.2);
    chiave.position.set(2, 3, 4);
    const contro1 = new THREE.DirectionalLight(0xcfe3ff, chiara ? 1.0 : 2.4);
    contro1.position.set(-4, 2, -3);
    const contro2 = new THREE.DirectionalLight(0xffffff, chiara ? 0.8 : 1.8);
    contro2.position.set(4, -1, -4);
    scena.add(chiave, contro1, contro2, new THREE.HemisphereLight(0xffffff, 0x202024, chiara ? 0.9 : 0.5));
    return scena;
}

// adatta renderer e camera alla misura del canvas
export function adatta(renderer, camera) {
    const c = renderer.domElement;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return false;
    if (c.width !== Math.round(w * renderer.getPixelRatio()) || c.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false);
        if (camera.isPerspectiveCamera) camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    return true;
}
