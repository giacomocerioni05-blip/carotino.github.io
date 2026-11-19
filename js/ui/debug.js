// per controllare una sezione da sola: index.html?solo=esploso&p=0.5
//    (solo = mostra solo quella sezione, p = avanzamento fisso delle sezioni sticky)
export const solo = new URLSearchParams(location.search).get('solo');
if (solo) document.querySelectorAll('main > section').forEach((s) => { if (s.id !== solo) s.style.display = 'none'; });
