// indossa.js – sezione #indossali: fotocamera, occhiali su ogni volto (fino a 4), foto da condividere
//
// i volti li trova MediaPipe Face Landmarker (478 punti per viso + come è girata la testa)
// tutto succede nel browser: il video non viene registrato né inviato a nessuno
//
// per ogni viso: posizione = in mezzo agli occhi, grandezza = da tempia a tempia (× slider),
// rotazione = matrice del volto; una "testa invisibile" nasconde le stanghe dietro la testa

import * as THREE from 'three';
import { creaOcchiali, creaMateriali, LARGHEZZA } from '../core/modello.js';
import { creaRenderer, creaScena } from '../core/rendering.js';

const MAX_VOLTI = 4;
const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELLO_VOLTO = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const OCCHIO_DX = [33, 133];
const OCCHIO_SX = [362, 263];
const TEMPIA_DX = 127;
const TEMPIA_SX = 356;
const NOME_FOTO = 'occhiali-protettivi.png';

let riconoscitore = null;
async function preparaRiconoscitore() {
    if (riconoscitore) return riconoscitore;
    const { FaceLandmarker, FilesetResolver } = await import(MEDIAPIPE + '/vision_bundle.mjs');
    const file = await FilesetResolver.forVisionTasks(MEDIAPIPE + '/wasm');
    riconoscitore = await FaceLandmarker.createFromOptions(file, {
        baseOptions: { modelAssetPath: MODELLO_VOLTO, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: MAX_VOLTI,
        outputFacialTransformationMatrixes: true
    });
    return riconoscitore;
}

export function avviaIndossa() {
    const sezione = document.querySelector('#indossali');
    const $ = (s) => sezione.querySelector(s);
    const palco = $('.indossa-palco'), video = $('video'), canvas = $('.indossa-canvas');
    const bottone = $('.indossa-bottone'), scatta = $('.indossa-scatta'), stato = $('.indossa-stato');
    const slider = $('.indossa-slider'), percento = $('.indossa-percento'), lampo = $('.indossa-lampo');
    const foto = $('.indossa-foto'), fotoImg = foto.querySelector('img');
    const condividi = $('.indossa-condividi'), scarica = $('.indossa-scarica');

    let renderer, scena, camera, flusso = null, attiva = false, fattore = 1, ultimaFoto = null;
    const volti = [];

    slider.addEventListener('input', () => {
        fattore = Number(slider.value) / 100;
        percento.textContent = slider.value + '%';
    });

    async function preparaScena() {
        if (renderer) return;
        renderer = creaRenderer(canvas, { conserva: true });   // conserva: serve per copiare il disegno nella foto
        scena = creaScena(renderer, true);
        camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);   // misura in pixel del palco
        const materiali = creaMateriali();   // condivisi da tutte le copie
        const testa = new THREE.SphereGeometry(1, 32, 24);
        const invisibile = new THREE.MeshBasicMaterial({ colorWrite: false });
        for (let i = 0; i < MAX_VOLTI; i++) {
            const gruppo = new THREE.Group();
            gruppo.visible = false;
            gruppo.add((await creaOcchiali({ origine: 'lenti', materiali })).radice);
            const occlusore = new THREE.Mesh(testa, invisibile);
            occlusore.scale.set(0.95, 1.3, 1.25);
            occlusore.position.set(0, -0.3, -1.45);
            occlusore.renderOrder = -1;
            gruppo.add(occlusore);
            scena.add(gruppo);
            volti.push(gruppo);
        }
    }

    function adattaPalco() {
        const w = palco.clientWidth, h = palco.clientHeight;
        renderer.setSize(w, h, false);
        Object.assign(camera, { left: 0, right: w, top: 0, bottom: -h });
        camera.updateProjectionMatrix();
    }

    const matrice = new THREE.Matrix4(), pos = new THREE.Vector3(), sc = new THREE.Vector3();

    function mettiOcchiali(gruppo, punti, m, w, h) {
        const px = (i) => new THREE.Vector3(punti[i].x * w, -punti[i].y * h, -punti[i].z * w);
        const media = (l) => l.reduce((s, i) => s.add(px(i)), new THREE.Vector3()).divideScalar(l.length);
        const centro = media(OCCHIO_DX).add(media(OCCHIO_SX)).multiplyScalar(0.5);
        gruppo.position.set(centro.x, centro.y, 0);
        gruppo.scale.setScalar((px(TEMPIA_DX).distanceTo(px(TEMPIA_SX)) / (LARGHEZZA * 1.05)) * fattore);
        if (m) {
            matrice.fromArray(m.data).decompose(pos, gruppo.quaternion, sc);
        }
        gruppo.visible = true;
    }

    function segui() {
        if (!attiva || video.readyState < 2) return;
        const r = riconoscitore.detectForVideo(video, performance.now());
        const punti = r.faceLandmarks || [], matrici = r.facialTransformationMatrixes || [];
        const w = palco.clientWidth, h = palco.clientHeight;
        volti.forEach((g, i) => {
            if (punti[i]) mettiOcchiali(g, punti[i], matrici[i], w, h);
            else g.visible = false;
        });
        stato.hidden = punti.length > 0;
        if (!punti.length) stato.textContent = 'Cerco i volti… mettiti davanti alla fotocamera';
        else stato.dataset.volti = punti.length;
        renderer.render(scena, camera);
    }

    async function accendi() {
        bottone.disabled = true;
        stato.hidden = false;
        stato.textContent = 'Accendo la fotocamera…';
        sezione.classList.add('indossa-attiva');
        try {
            flusso = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
            });
            video.srcObject = flusso;
            await video.play();
            palco.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
            stato.textContent = 'Preparo il riconoscimento dei volti…';
            await Promise.all([preparaRiconoscitore(), preparaScena()]);
            adattaPalco();
            attiva = true;
            renderer.setAnimationLoop(segui);
            bottone.textContent = 'Spegni la fotocamera';
            scatta.disabled = false;
        } catch (errore) {
            console.error(errore);
            spegni(false);
            stato.hidden = false;
            stato.textContent = errore && errore.name === 'NotAllowedError'
                ? 'Serve il permesso di usare la fotocamera. Puoi darlo dalle impostazioni del browser.'
                : 'Non riesco ad aprire la fotocamera su questo dispositivo.';
        }
        bottone.disabled = false;
    }

    function spegni(pulisci = true) {
        attiva = false;
        scatta.disabled = true;
        if (renderer) { renderer.setAnimationLoop(null); renderer.clear(); }
        if (flusso) flusso.getTracks().forEach((t) => t.stop());
        flusso = null;
        video.srcObject = null;
        volti.forEach((g) => { g.visible = false; });
        bottone.textContent = 'Attiva la fotocamera';
        if (pulisci) { sezione.classList.remove('indossa-attiva'); stato.hidden = true; }
    }

    // la foto: video + occhiali, a specchio come si vede sullo schermo
    function scattaFoto() {
        if (!attiva) return;
        const w = video.videoWidth, h = video.videoHeight;
        const tela = document.createElement('canvas');
        tela.width = w;
        tela.height = h;
        const ctx = tela.getContext('2d');
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.drawImage(renderer.domElement, 0, 0, w, h);
        lampo.classList.remove('scatto');
        void lampo.offsetWidth;   // fa ripartire l'animazione del lampo
        lampo.classList.add('scatto');
        tela.toBlob((blob) => {
            if (ultimaFoto) URL.revokeObjectURL(fotoImg.src);
            ultimaFoto = new File([blob], NOME_FOTO, { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            fotoImg.src = url;
            scarica.href = url;
            // "Condividi" usa il menu di condivisione del dispositivo (se c'è), altrimenti resta solo "Scarica"
            condividi.hidden = !(navigator.canShare && navigator.canShare({ files: [ultimaFoto] }));
            foto.hidden = false;
        }, 'image/png');
    }

    async function condividiFoto() {
        try {
            await navigator.share({ files: [ultimaFoto], title: 'Occhiali Protettivi', text: 'Ho provato gli Occhiali Protettivi di Giacomo Cerioni' });
        } catch (e) {
            if (e.name !== 'AbortError') console.error(e);
        }
    }

    bottone.addEventListener('click', () => (attiva || flusso ? spegni() : accendi()));
    scatta.addEventListener('click', scattaFoto);
    condividi.addEventListener('click', condividiFoto);
    $('.indossa-chiudi-foto').addEventListener('click', () => { foto.hidden = true; });
    window.addEventListener('resize', () => { if (attiva) adattaPalco(); });
    new IntersectionObserver(([v]) => { if (!v.isIntersecting && attiva) spegni(); }).observe(sezione);
}
