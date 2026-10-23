/* ============================================================
   CÓDIGO DE CONFERÊNCIA
   Cada grupo recebe, no final, um código com o ID do grupo e as 12 escolhas
   (ex.: K47-CCBCBAAABACB-9Q2X). A página verificar.html recalcula a pontuação
   a partir das escolhas. Assim os apresentadores conferem o número dito pelo grupo.
   Observação: é uma proteção simples (site estático), não é à prova de especialistas.
   ============================================================ */
const Verify = (() => {
  const SALT = 'g10-uce-2026';   // pode trocar; vale para o jogo e para o verificador (ambos usam este arquivo)
  const hash = (str) => {        // cyrb53
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  const chk = (id, cs) => hash(`${SALT}|${id}|${cs}`).toString(36).toUpperCase().slice(-4).padStart(4, '0');
  const code = (id, choices) => { const cs = choices.map((c) => c || '-').join(''); return `${id}-${cs}-${chk(id, cs)}`; };

  function parse(text) {
    const m = /^\s*([A-Z0-9]{3})-([A-D-]+)-([A-Z0-9]{4})\s*$/i.exec(text || '');
    if (!m) return { ok: false, err: 'Formato inválido. Exemplo: K47-CCBCBAAABACB-9Q2X' };
    const id = m[1].toUpperCase(), cs = m[2].toUpperCase();
    if (cs.length !== EVENTS.length) return { ok: false, err: `O código deve ter ${EVENTS.length} escolhas (tem ${cs.length}).` };
    if (chk(id, cs) !== m[3].toUpperCase()) return { ok: false, err: 'O código não confere: foi digitado errado ou alterado.' };
    for (let i = 0; i < cs.length; i++) if (cs[i] !== '-' && !EVENTS[i].options.some((o) => o.k === cs[i])) return { ok: false, err: `A escolha ${cs[i]} não existe na rodada ${i + 1}.` };
    return { ok: true, id, choices: cs.split('') };
  }

  // Refaz a partida inteira a partir das escolhas (as regras são determinísticas).
  function replay(choices) {
    Engine.configure(EVENTS.length);
    let s = Engine.initialState(), total = 0, pc = 0;
    const rounds = EVENTS.map((ev, i) => {
      const pre = Engine.startRound(s, ev.shock);
      const opt = ev.options.find((o) => o.k === choices[i]) || null;
      const post = Engine.applyDecision(pre, opt), score = Engine.scoreRound(post, opt);
      total += score.total; pc += score.prazo + score.custo; s = post;
      return { ev, opt, pre, post, score };
    });
    return { rounds, total, pc, state: s };
  }
  return { code, parse, replay };
})();
