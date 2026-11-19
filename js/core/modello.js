// modello.js – carica "giacomocerioni.glb" una volta sola e prepara gli occhiali per tutte le sezioni
//
// com'è fatto il file (unità: metri):
//    3 nodi: "stanga dx", "stanga sx", "lenti" (il frontale)
//    ogni nodo ha molte sotto-parti (primitive) → con GLTFLoader diventano tanti Mesh
//    il frontale guarda verso -z, le stanghe vanno verso +z, l'alto è +y
//
// cosa preparo:
//    - un gruppo "radice" centrato e scalato (largo LARGHEZZA unità) che guarda verso +z (verso la camera)
//    - le stanghe montate su un perno (la cerniera): apertura 1 = aperte, 0 = chiuse
//    - ogni sotto-parte classificata (lente, naselli, montatura, cerniera, protezione, asta, terminale)
//      con la direzione in cui si sposta nell'esploso

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { facilita } from './easing.js';

export const FILE_MODELLO = 'modelli_occhiali_glbxweb/giacomocerioni.glb';
export const LARGHEZZA = 2;   // gli occhiali aperti sono larghi 2 unità

// le cerniere nel file originale (centro dei cardini di frontale e stanga)
const CENTRO_X = 0.0131;                       // il centro del ponte
const PERNO_DX = new THREE.Vector3(0.0836, 0, -0.0188);
const PERNO_SX = new THREE.Vector3(-0.0574, 0, -0.0188);
// angoli di chiusura: una stanga si piega un po' meno, così si appoggia sull'altra senza attraversarla
const CHIUSURA_DX = THREE.MathUtils.degToRad(-90);
const CHIUSURA_SX = THREE.MathUtils.degToRad(77);

// le parti, con il nome che compare nell'esploso
export const PARTI = {
    lente:      { nome: 'Schermo in policarbonato', nota: 'Avvolgente, antiurto' },
    naselli:    { nome: 'Ponte e naselli', nota: 'Appoggio sul naso' },
    montatura:  { nome: 'Montatura', nota: 'Raccordo laterale' },
    cerniera:   { nome: 'Cerniere', nota: 'Apertura a 90°' },
    protezione: { nome: 'Protezioni laterali', nota: 'Con feritoie di ventilazione' },
    asta:       { nome: 'Aste', nota: 'Struttura delle stanghe' },
    terminale:  { nome: 'Terminali', nota: 'Appoggio dietro l’orecchio' }
};

// di quanto si sposta ogni parte nell'esploso (metri, nel file originale; s = lato: +1 destra, -1 sinistra)
// e quando parte (0..1 dell'avanzamento dell'esploso): così i pezzi si staccano uno dopo l'altro
const ESPLOSO = {
    lente:      { d: (s) => [0, 0.004, -0.04], inizio: 0.00 },
    naselli:    { d: (s) => [0, -0.016, -0.062], inizio: 0.10 },
    montatura:  { d: (s) => [s * 0.022, 0, -0.012], inizio: 0.20 },
    cerniera:   { d: (s) => [s * 0.034, 0.01, -0.004], inizio: 0.30 },
    protezione: { d: (s) => [s * 0.055, 0, 0.004], inizio: 0.40 },
    asta:       { d: (s) => [s * 0.026, 0, 0.022], inizio: 0.50 },
    terminale:  { d: (s) => [s * 0.03, 0, 0.06], inizio: 0.60 }
};

// classifica una sotto-parte guardando la sua scatola (nel file originale)
function classifica(box, nodo) {
    const c = box.getCenter(new THREE.Vector3());
    const dim = box.getSize(new THREE.Vector3());
    if (nodo === 'lenti') {
        if (c.z < -0.027) {
            if (Math.abs(c.x - CENTRO_X) < 0.02 && dim.x < 0.03) return 'naselli';
            return 'lente';
        }
        return 'montatura';
    }
    // stanghe
    if (box.max.z <= -0.0154) return 'cerniera';
    if (box.min.z > 0.045) return 'terminale';
    if (box.max.z <= 0.021 && box.min.y >= 0.06 && box.max.y <= 0.097) return 'protezione';
    return 'asta';
}

// i materiali: montatura grafite satinata, schermo trasparente leggermente fumé
export function creaMateriali() {
    return {
        montatura: new THREE.MeshPhysicalMaterial({
            color: 0x3a3d42, roughness: 0.38, metalness: 0.15,
            clearcoat: 0.8, clearcoatRoughness: 0.25, envMapIntensity: 1.1
        }),
        lente: new THREE.MeshPhysicalMaterial({
            color: 0xaecbe0, roughness: 0.04, metalness: 0,
            transparent: true, opacity: 0.32, depthWrite: false,
            clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2,
            side: THREE.DoubleSide
        })
    };
}

let caricamento = null;

// carica il file una volta sola (tutte le sezioni aspettano la stessa promessa)
export function caricaFile() {
    if (!caricamento) {
        caricamento = new GLTFLoader().loadAsync(FILE_MODELLO).then((gltf) => {
            const originale = gltf.scene;
            originale.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(originale);
            return { originale, box };
        });
    }
    return caricamento;
}

// crea una copia pronta per una sezione
//    opzioni.origine: 'centro' (centro della scatola) oppure 'lenti' (centro delle lenti, per indossarli)
export async function creaOcchiali(opzioni = {}) {
    const { originale, box } = await caricaFile();
    const materiali = opzioni.materiali || creaMateriali();
    const copia = originale.clone(true);

    const scala = LARGHEZZA / (box.max.x - box.min.x);
    const centro = box.getCenter(new THREE.Vector3());
    if (opzioni.origine === 'lenti') centro.set(CENTRO_X, 0.083, -0.03);

    // radice: quella che le sezioni muovono e ruotano
    const radice = new THREE.Group();
    // orienta: gira di 180° così il frontale guarda verso +z (verso chi guarda)
    const orienta = new THREE.Group();
    orienta.rotation.y = Math.PI;
    orienta.scale.setScalar(scala);
    radice.add(orienta);
    const contenuto = new THREE.Group();
    contenuto.position.copy(centro).negate();
    orienta.add(contenuto);

    // GLTFLoader cambia gli spazi dei nomi in "_": "stanga dx" diventa "stanga_dx"
    const trova = (nome) => copia.getObjectByName(nome) || copia.getObjectByName(nome.replace(/ /g, '_'));
    const nodoDx = trova('stanga dx');
    const nodoSx = trova('stanga sx');
    const nodoLenti = trova('lenti');

    // i perni: le stanghe girano intorno alla cerniera (asse verticale)
    function perno(nodo, posizione, nome) {
        const p = new THREE.Group();
        p.name = nome;
        p.position.copy(posizione);
        nodo.position.copy(posizione).negate();
        p.add(nodo);
        contenuto.add(p);
        return p;
    }
    contenuto.add(nodoLenti);
    const pernoDx = perno(nodoDx, PERNO_DX, 'perno-dx');
    const pernoSx = perno(nodoSx, PERNO_SX, 'perno-sx');

    // classifico le sotto-parti, do i materiali e preparo l'esploso
    const parti = [];
    [[nodoLenti, 'lenti', 0], [nodoDx, 'stanga', 1], [nodoSx, 'stanga', -1]].forEach(([nodo, tipo, latoNodo]) => {
        nodo.traverse((o) => {
            if (!o.isMesh) return;
            o.geometry.computeBoundingBox();
            const b = o.geometry.boundingBox.clone();   // nessuna trasformazione nel file: coordinate originali
            const tipoParte = classifica(b, tipo);
            const cx = b.getCenter(new THREE.Vector3()).x;
            const lato = latoNodo !== 0 ? latoNodo : (cx >= CENTRO_X ? 1 : -1);
            o.material = tipoParte === 'lente' ? materiali.lente : materiali.montatura;
            o.renderOrder = tipoParte === 'lente' ? 2 : 0;
            o.castShadow = false;
            const e = ESPLOSO[tipoParte];
            parti.push({
                mesh: o, tipo: tipoParte, lato,
                base: o.position.clone(),
                spostamento: new THREE.Vector3(...e.d(lato)),
                inizio: e.inizio
            });
        });
    });

    // misure vere (cm) per la scheda tecnica
    const misure = {
        larghezza: (box.max.x - box.min.x) * 100,
        altezza: (box.max.y - box.min.y) * 100,
        profondita: (box.max.z - box.min.z) * 100
    };

    const occhiali = {
        radice, parti, misure, materiali,
        // 1 = aperte, 0 = chiuse
        apertura(valore) {
            const v = 1 - THREE.MathUtils.clamp(valore, 0, 1);
            pernoDx.rotation.y = CHIUSURA_DX * v;
            pernoSx.rotation.y = CHIUSURA_SX * v;
        },
        // 0 = montati, 1 = esplosi del tutto
        esplodi(valore) {
            for (const p of parti) {
                const t = facilita(THREE.MathUtils.clamp((valore - p.inizio) / 0.4, 0, 1));
                p.mesh.position.copy(p.base).addScaledVector(p.spostamento, t);
            }
        },
        // dove mettere il punto dell'etichetta: il centro del pezzo più grande di quel tipo
        //    (su un lato: +1 / -1, oppure 0 = tutti e due)
        centroParte(tipo, lato = 0) {
            let migliore = null;
            for (const p of parti) {
                if (p.tipo !== tipo || (lato !== 0 && p.lato !== lato)) continue;
                const n = p.mesh.geometry.attributes.position.count;
                if (!migliore || n > migliore.n) migliore = { p, n };
            }
            return new THREE.Box3().setFromObject(migliore.p.mesh).getCenter(new THREE.Vector3());
        }
    };
    occhiali.apertura(1);
    return occhiali;
}
