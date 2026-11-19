// navigazione.js – nav che si scurisce, voce corrente, comparsa dei testi, tasto G per la griglia

// la navigazione: diventa più compatta e scura dopo l'intro, evidenzia la sezione in vista
const nav = document.querySelector('.nav-locale');
const voci = [...document.querySelectorAll('.nav-locale a[href^="#"]')];
window.addEventListener('scroll', () => {
    nav.classList.toggle('scorsa', window.scrollY > window.innerHeight * 0.6);
}, { passive: true });
const osservatore = new IntersectionObserver((elenco) => {
    elenco.forEach((v) => {
        if (!v.isIntersecting) return;
        voci.forEach((a) => a.classList.toggle('corrente', a.getAttribute('href') === '#' + v.target.id));
    });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach((s) => osservatore.observe(s));

// le comparse dei testi quando entrano nello schermo (stile Apple)
const comparse = new IntersectionObserver((elenco) => {
    elenco.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('visibile'); comparse.unobserve(v.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.compare').forEach((el) => comparse.observe(el));

// tasto G: mostra/nasconde le 12 colonne della griglia (utile per controllare l'impaginazione)
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !/input|textarea/i.test(e.target.tagName)) {
        document.body.classList.toggle('mostra-griglia');
    }
});
