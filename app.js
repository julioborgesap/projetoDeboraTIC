/* ============================================================
   SALVEM O PROJETO! · versão individual por equipe
   Cada equipe joga no próprio aparelho. Nada é enviado para servidor.
   Ajustes rápidos:
   ============================================================ */
const CONFIG = {
  ROUND_S: 45,    // segundos para decidir em cada rodada
  RESULT_S: 12,   // segundos da tela de consequências antes de avançar sozinho
  // Código dos apresentadores: sem ele, os atalhos de URL (?reset, ?t=, ?r=) são ignorados.
  // Uso: .../index.html?k=SEU-CODIGO&reset   ou   ?k=SEU-CODIGO&t=60&r=20   TROQUE ESTE VALOR!
  ADMIN_CODE: 'g10-prof-7x2q'
};

(() => {
  const KEY = 'salvem-projeto-equipe-v2'; // v2: jogo com 12 crises (descarta partidas salvas da versão de 6)
  const P = new URLSearchParams(location.search);
  const ADMIN = P.get('k') === CONFIG.ADMIN_CODE;
  if (ADMIN && P.has('reset')) { try { localStorage.removeItem(KEY); } catch (e) {} }
  if (P.toString()) history.replaceState(null, '', location.pathname);   // some com os parâmetros da barra de endereço
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 3 ? Math.min(n, 300) : d; };
  const ROUND_S = ADMIN ? num(P.get('t'), CONFIG.ROUND_S) : CONFIG.ROUND_S;
  const RESULT_S = ADMIN ? num(P.get('r'), CONFIG.RESULT_S) : CONFIG.RESULT_S;
  let storageOK = true; try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); } catch (e) { storageOK = false; }
  const N = EVENTS.length;
  Engine.configure(N);   // o plano (PV) se ajusta ao número de crises
  const ICON = { good: '✓', warn: '!', bad: '✕', na: '–' };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  /* ---------------- estado ---------------- */
  let G = load();
  const ui = { modal: null, name: '', err: '' };
  function load() {
    try { const g = JSON.parse(localStorage.getItem(KEY)); if (g && g.group && ['brief', 'round', 'result', 'final'].includes(g.phase)) return g; } catch (e) {}
    return null;
  }
  const save = () => { try { if (G) localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} };

  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const newId = () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)] + (10 + Math.floor(Math.random() * 90));
  // As alternativas aparecem embaralhadas (e em ordem diferente para cada grupo): não adianta copiar a letra do vizinho.
  const ordered = (r) => (G.order && G.order[r] ? G.order[r].map((k) => EVENTS[r].options.find((o) => o.k === k)) : EVENTS[r].options);
  const L = (r, k) => String.fromCharCode(65 + Math.max(0, ordered(r).findIndex((o) => o.k === k)));   // letra exibida
  const total = () => G.hist.reduce((a, h) => a + h.score.total, 0);
  const pazoCusto = () => G.hist.reduce((a, h) => a + h.score.prazo + h.score.custo, 0);
  const best = (ev) => ev.options.reduce((a, o) => (o.s > a.s ? o : a));
  const pill = (l) => `<span class="pill ${l.level}"><i aria-hidden="true">${ICON[l.level]}</i>${l.label}</span>`;
  function rate(h) {
    if (!h.choice) return { lv: 'bad', t: 'Sem decisão' };
    const s = EVENTS[h.round].options.find((o) => o.k === h.choice).s;
    return s >= 15 ? { lv: 'good', t: 'Excelente escolha' } : s >= 11 ? { lv: 'good', t: 'Boa escolha' }
      : s >= 6 ? { lv: 'warn', t: 'Escolha razoável' } : { lv: 'bad', t: 'Escolha arriscada' };
  }

  /* ---------------- fluxo ---------------- */
  function start(name) {
    G = { group: name, id: newId(), order: EVENTS.map((ev) => shuffle(ev.options.map((o) => o.k))), phase: 'brief', round: 0, state: Engine.initialState(), base: null, pre: null, hist: [], selected: null, deadline: 0, resultEnd: 0 };
    save(); render();
  }
  function beginRound() {
    const ev = EVENTS[G.round];
    G.base = { ...G.state }; G.pre = Engine.startRound(G.state, ev.shock);
    G.selected = null; G.phase = 'round'; G.deadline = Date.now() + ROUND_S * 1000;
    save(); render(); window.scrollTo(0, 0);
  }
  function submit(choice) {
    if (G.phase !== 'round') return;
    const ev = EVENTS[G.round], opt = ev.options.find((o) => o.k === choice) || null;
    const post = Engine.applyDecision(G.pre, opt);
    G.hist.push({ round: G.round, choice: opt ? opt.k : null, base: G.base, pre: G.pre, post, score: Engine.scoreRound(post, opt) });
    G.state = post; G.phase = 'result'; G.resultEnd = Date.now() + RESULT_S * 1000;
    save(); render(); window.scrollTo(0, 0);
  }
  function next() {
    if (!G || G.phase !== 'result') return;
    if (G.round + 1 < N) { G.round++; beginRound(); } else { G.phase = 'final'; save(); render(); window.scrollTo(0, 0); }
  }
  function select(k) {
    if (G.phase !== 'round') return;
    G.selected = k; save();
    document.querySelectorAll('.opt').forEach((b) => { const on = b.dataset.k === k; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); });
    const c = $('#btn-confirm'); if (c) c.disabled = false;
  }

  /* ---------------- relógio (usa horário real: recarregar não ganha tempo) ---------------- */
  const clock = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function tick() {
    if (!G) return;
    const now = Date.now();
    if (G.phase === 'round') {
      const left = Math.max(0, G.deadline - now);
      const mc = $('#mclock'); if (mc) mc.textContent = clock(left);
      const c = $('#clock'); if (c) { c.textContent = clock(left); c.parentElement.classList.toggle('urgent', left <= 10000); }
      const f = $('#tfill'); if (f) { f.style.transform = `scaleX(${left / (ROUND_S * 1000)})`; f.classList.toggle('urgent', left <= 10000); }
      if (left <= 0) { try { navigator.vibrate && navigator.vibrate(250); } catch (e) {} submit(G.selected); }
    } else if (G.phase === 'result') {
      const left = Math.max(0, G.resultEnd - now);
      const l = $('#nextlbl'); if (l) l.textContent = (G.round + 1 >= N ? 'Resultado final em ' : 'Próxima rodada em ') + Math.ceil(left / 1000) + 's';
      const f = $('#nfill'); if (f) f.style.transform = `scaleX(${left / (RESULT_S * 1000)})`;
      if (left <= 0) next();
    }
  }
  setInterval(tick, 200);

  /* ---------------- gráfico ---------------- */
  function chart(series, o) {
    const W = 560, H = 280, L = 40, R = 14, T = 14, B = 34;
    const n = o.xLabels.length, x = (i) => L + i * (W - L - R) / (n - 1), y = (v) => T + (H - T - B) * (1 - v / o.yMax);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">`;
    [0, 7, 14, 21].forEach((v) => { s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`; });
    o.xLabels.forEach((l, i) => { s += `<text x="${x(i)}" y="${H - 12}" class="ax" text-anchor="middle">${l}</text>`; });
    series.forEach((se) => {
      s += `<polyline points="${se.pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${se.color}" stroke-width="${se.ideal ? 3 : 5}" ${se.ideal ? 'stroke-dasharray="3 8" stroke-linecap="round"' : 'stroke-linejoin="round"'}/>`;
      if (!se.ideal) se.pts.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="5.5" fill="${se.color}" stroke="#0b1220" stroke-width="2"/>`; });
    });
    return s + '</svg>';
  }

  /* ---------------- telas ---------------- */
  const bar = (mid) => `<header class="bar"><div class="who"><b>${esc(G.group)}</b><span>Rodada ${G.round + 1} de ${N} · ${Engine.when(G.phase === 'round' ? G.pre : G.state)} de ${Engine.TOTAL_SPRINTS}</span></div>
    ${mid}<div class="pts"><b>${total()}</b> pts</div><button class="btn sm" data-act="glossary">ⓘ Guia</button></header>`;

  function viewSetup() {
    const s0 = Engine.initialState();
    return `<main class="center"><div class="card start">
      <p class="tag">Dinâmica da turma · Grupo 10</p>
      <h1>Salvem o Projeto!</h1>
      <p class="lead">Seu grupo gerencia o Crediário Digital. A cada crise, leia os indicadores e escolha a melhor estratégia.</p>
      <form id="form" autocomplete="off">
        <label for="gname">Nome do grupo</label>
        <input id="gname" maxlength="30" placeholder="Ex.: Grupo 4" value="${esc(ui.name)}" required>
        ${ui.err ? `<p class="error" role="alert">${esc(ui.err)}</p>` : ''}
        <button class="btn primary big" type="submit">Próximo</button>
      </form>
      <p class="small">Um aparelho por grupo. Orçamento de R$ ${fmt(s0.bac, 0)} mil, 21 itens, 7 sprints, ${N} rodadas.</p>
      <div class="row"><button class="btn" data-act="rules">Como jogar</button><button class="btn" data-act="glossary">Guia de indicadores</button></div>
    </div></main>`;
  }

  function viewBrief() {
    const s = G.state;
    return `<main class="center"><div class="card brief">
      <p class="tag">${esc(G.group)} · código ${G.id}</p>
      <h1>Vocês são a gerência do projeto</h1>
      <ul class="bl">
        <li>Projeto: <b>Crediário Digital</b>, sistema do Escritório Contábil Atual.</li>
        <li>Orçamento: <b>R$ ${fmt(s.bac, 0)} mil</b> · 21 itens · 7 sprints. A sprint 1 já passou, tudo no plano.</li>
        <li>Em cada rodada surge uma <b>crise</b>. Vocês têm <b>${ROUND_S} segundos</b> para escolher uma alternativa e tocar em <b>Confirmar decisão</b>.</li>
        <li>Se o tempo acabar com uma alternativa marcada, ela é enviada. Sem alternativa marcada, o grupo fica sem decisão.</li>
        <li>Cada rodada vale até <b>100 pontos</b> (prazo 30, custo 30, qualidade 25, estratégia 15). Anotem a pontuação final para os apresentadores.</li>
        <li>Use o <b>ⓘ</b> sempre que esquecer o que uma sigla significa. No computador, valem também as teclas <b>A</b>, <b>B</b>, <b>C</b>, <b>D</b> e <b>Enter</b>.</li>
      </ul>
      <button class="btn primary big" data-act="begin">Começar a rodada 1</button>
    </div></main>`;
  }

  function viewRound() {
    const ev = EVENTS[G.round], s = G.pre, ind = Engine.indicators(s), vel = s.ev - G.base.ev;   // itens por sprint (2 rodadas por sprint)
    const watch = (k) => ev.watch.includes(k) ? ' watch' : '';
    const metric = (key, label, val, lvl) => `<div class="metric${watch(key)}"><button class="info" data-act="info" data-key="${key}">${label} ⓘ</button><b>${val}</b>${pill(lvl)}</div>`;
    const left = Math.max(0, G.deadline - Date.now());
    return `${bar(`<div class="clock ${left <= 10000 ? 'urgent' : ''}" aria-label="Tempo restante"><span id="clock">${clock(left)}</span></div>`)}
    <div class="tline"><i id="tfill" style="transform:scaleX(${left / (ROUND_S * 1000)})"></i></div>
    <main class="play">
      <section class="colA">
        <article class="event"><h2>${ev.icon} ${esc(ev.title)}</h2><p>${esc(ev.story)}</p></article>
        <article class="ind">
          <div class="metrics">${metric('SPI', 'SPI', fmt(ind.spi, 2), Engine.level('spi', ind.spi))}${metric('CPI', 'CPI', fmt(ind.cpi, 2), Engine.level('cpi', ind.cpi))}${metric('Qualidade', 'Qualidade', fmt(s.q, 0), Engine.level('q', s.q))}</div>
          <p class="chips">${['PV', 'EV', 'AC'].map((k) => `<button class="chip" data-act="info" data-key="${k}">${k} ${fmt(s[k.toLowerCase()])}</button>`).join('')}
            <button class="chip${watch('BAC')}" data-act="info" data-key="BAC">BAC ${fmt(s.bac)}</button>
            <button class="chip${watch('EAC')}" data-act="info" data-key="EAC">EAC ${fmt(ind.eac)}</button>
            <button class="chip${watch('Velocidade')}" data-act="info" data-key="Velocidade">Velocidade ${fmt(vel)} itens/sprint</button>
            <button class="chip" data-act="info" data-key="Burndown">Restam ${ind.items} de 21 itens</button></p>
          <p class="unit">Valores em R$ mil${s.rework > 0 ? ` · <span class="rw">Retrabalho nesta rodada: +${fmt(s.rework, 2)} por qualidade baixa</span>` : ''}</p>
        </article>
      </section>
      <section class="colB">
        <h2 class="qh">Qual estratégia o grupo adota?</h2>
        <div class="opts" role="radiogroup" aria-label="Alternativas">${ordered(G.round).map((o, i) => `
          <button class="opt${G.selected === o.k ? ' sel' : ''}" role="radio" aria-checked="${G.selected === o.k}" data-act="pick" data-k="${o.k}">
            <span class="ok">${String.fromCharCode(65 + i)}</span><span class="tx"><b>${esc(o.t)}</b><small>${esc(o.d)}</small></span></button>`).join('')}</div>
        <div class="confirm"><button id="btn-confirm" class="btn primary big" data-act="confirm" ${G.selected ? '' : 'disabled'}>Confirmar decisão</button></div>
      </section>
    </main>`;
  }

  function viewResult() {
    const ev = EVENTS[G.round], h = G.hist[G.round], a = Engine.indicators(h.pre), b = Engine.indicators(h.post);
    const opt = ev.options.find((o) => o.k === h.choice), rt = rate(h), last = G.round + 1 >= N;
    const row = (lab, x, y, d, inv) => { const diff = y - x, cls = Math.abs(diff) < 0.005 ? '' : (diff > 0) !== !!inv ? 'up' : 'down';
      return `<tr><th>${lab}</th><td>${fmt(x, d)}</td><td class="ar ${cls}">${cls === 'up' ? '▲' : cls === 'down' ? '▼' : '='}</td><td><b>${fmt(y, d)}</b></td></tr>`; };
    const sb = (lab, v, max) => `<div class="sb"><span>${lab}</span><i><u style="width:${v / max * 100}%"></u></i><em>${v}/${max}</em></div>`;
    return `${bar(`<div class="clock plain">Resultado</div>`)}
    <main class="play res">
      <section class="colA"><article class="event ok-ev">
        <p class="gain">+${h.score.total} <small>pontos</small></p>
        <p class="choice">${opt ? `<span class="ok">${L(G.round, opt.k)}</span> ${esc(opt.t)}` : '<span class="ok none">–</span> Sem decisão'}</p>
        <p>${pill({ level: rt.lv, label: rt.t })}</p>
        <p class="rtext">${opt ? esc(opt.r) : 'Sem ação, o atraso e os gastos seguiram o seu curso.'}</p></article>
        <div class="sbs">${sb('Prazo', h.score.prazo, 30)}${sb('Custo', h.score.custo, 30)}${sb('Qualidade', h.score.qualidade, 25)}${sb('Estratégia', h.score.estrategia, 15)}</div>
      </section>
      <section class="colB">
        <table class="delta"><caption>Indicadores: antes e depois da decisão</caption>
          ${row('SPI', a.spi, b.spi, 2)}${row('CPI', a.cpi, b.cpi, 2)}${row('Qualidade', h.pre.q, h.post.q, 0)}${row('EAC (R$ mil)', a.eac, b.eac, 1, true)}</table>
        <aside class="lesson"><h2>O que aprendemos</h2><p>${esc(ev.lesson)}</p></aside>
      </section>
    </main>
    <footer class="nextbar"><span id="nextlbl"></span><div class="ntrack"><i id="nfill"></i></div>
      <button class="btn primary" data-act="next">${last ? 'Ver resultado final' : 'Próxima rodada'}</button></footer>`;
  }

  function insights() {
    const s = G.state, i = Engine.indicators(s), good = [], warn = [];
    const rework = G.hist.reduce((a, h) => a + (h.pre.rework || 0), 0);
    const exc = G.hist.filter((h) => rate(h).t === 'Excelente escolha').length;
    const risky = G.hist.filter((h) => rate(h).lv === 'bad' && h.choice).length;
    const none = G.hist.filter((h) => !h.choice).length;
    if (i.spi >= 1) good.push(`Prazo sob controle: SPI ${fmt(i.spi, 2)}.`);
    else warn.push(`Prazo: SPI ${fmt(i.spi, 2)}. Entregaram menos valor do que o planejado até aqui.`);
    if (i.cpi >= 1) good.push(`Custo eficiente: CPI ${fmt(i.cpi, 2)}.`);
    else warn.push(`Custo: CPI ${fmt(i.cpi, 2)}. Cada R$ 1,00 gasto gerou R$ ${fmt(i.cpi, 2)} de valor. A EAC final ficou em R$ ${fmt(i.eac)} mil.`);
    if (s.q >= 75) good.push(`Qualidade alta (${fmt(s.q, 0)}).`);
    else warn.push(`Qualidade ${fmt(s.q, 0)}${rework > 0 ? `: o retrabalho custou R$ ${fmt(rework)} mil no total` : ''}.`);
    if (exc >= Math.ceil(N / 2)) good.push(`${exc} de ${N} escolhas foram excelentes.`);
    if (risky) warn.push(`${risky} decisão(ões) trocaram ganho imediato por problema depois (cortar testes, aceitar escopo sem controle, horas extras).`);
    if (none) warn.push(`${none} rodada(s) sem decisão: sem ação, a crise segue sem correção.`);
    return { good, warn };
  }

  function viewFinal() {
    const rp = Verify.replay(G.hist.map((h) => h.choice));          // recalcula a partir das escolhas
    const pts = rp.total, s = G.state, ind = Engine.indicators(s);
    const code = Verify.code(G.id, G.hist.map((h) => h.choice));
    const pct = pts / (N * 100);
    const [vt, vx] = pct >= 0.80 ? ['Gestão exemplar', 'Vocês leram bem os indicadores e equilibraram prazo, custo e qualidade.']
      : pct >= 0.70 ? ['Boa gestão', 'Boas decisões na maior parte das crises. Alguns trade-offs poderiam ter sido melhores.']
      : pct >= 0.62 ? ['Gestão regular', 'O projeto terminou, mas várias decisões trocaram ganho imediato por custo ou qualidade depois.']
      : ['Projeto em risco', 'Muitas escolhas aceleraram hoje e cobraram caro depois. Releiam os indicadores antes de decidir.'];
    const ins = insights();
    const bd = [{ color: '#38bdf8', pts: [Engine.indicators(Engine.initialState()).items, ...G.hist.map((h) => Engine.indicators(h.post).items)] },
      { color: '#94a3b8', ideal: true, pts: Array.from({ length: N + 1 }, (_, k) => Engine.idealItems(2 + k)) }];
    const fb = G.hist.map((h) => {
      const ev = EVENTS[h.round], opt = ev.options.find((o) => o.k === h.choice), rt = rate(h), bo = best(ev);
      return `<li class="${rt.lv}"><div class="fh"><b>R${h.round + 1}. ${esc(ev.title)}</b><span class="fp">+${h.score.total}</span></div>
        <p>${opt ? `<span class="ok sm">${L(h.round, opt.k)}</span> ${esc(opt.t)}` : 'Sem decisão registrada'} ${pill({ level: rt.lv, label: rt.t })}</p>
        <p class="sub">${opt ? esc(opt.r) : 'A crise seguiu sem correção.'}</p>
        ${(!opt || opt.s < bo.s) ? `<p class="tip">Mais equilibrada: <b>${L(h.round, bo.k)}</b>, ${esc(bo.t)}.</p>` : ''}</li>`;
    }).join('');
    return `<header class="bar"><div class="who"><b>${esc(G.group)}</b><span>Fim de jogo</span></div><div class="clock plain">🏁 Resultado</div><div class="pts"></div><button class="btn sm" data-act="glossary">ⓘ Guia</button></header>
    <main class="final">
      <section class="hero2"><p class="tag">Pontuação final · ${esc(G.group)} (${G.id})</p><p class="big">${pts}</p><p class="of">de ${N * 100} pontos possíveis</p>
        <h2>${vt}</h2><p>${vx}</p>
        <p class="tie">Para desempate: prazo + custo = <b>${rp.pc}</b> · qualidade final = <b>${fmt(rp.state.q, 0)}</b></p>
        <p class="code">Código de conferência: <b>${code}</b></p>
        <button class="btn" data-act="copy">Copiar resultado</button>
        <p class="note">Mostre esta tela aos apresentadores.</p></section>
      <section class="panel"><h2>Métricas finais do projeto</h2>
        <dl class="mf"><div><dt>SPI</dt><dd>${fmt(ind.spi, 2)}</dd>${pill(Engine.level('spi', ind.spi))}</div>
          <div><dt>CPI</dt><dd>${fmt(ind.cpi, 2)}</dd>${pill(Engine.level('cpi', ind.cpi))}</div>
          <div><dt>Qualidade</dt><dd>${fmt(s.q, 0)}</dd>${pill(Engine.level('q', s.q))}</div>
          <div><dt>EAC (R$ mil)</dt><dd>${fmt(ind.eac)}</dd><span class="sm2">Orçamento: ${fmt(s.bac)}</span></div>
          <div><dt>VAC (R$ mil)</dt><dd>${ind.vac >= 0 ? '+' : '−'}${fmt(Math.abs(ind.vac))}</dd>${pill(Engine.level('vac', ind.vac))}</div>
          <div><dt>Concluído</dt><dd>${fmt(ind.done * 100, 0)}%</dd><span class="sm2">Valor entregue (EV)</span></div></dl></section>
      <section class="panel"><h2>Burndown: itens restantes por rodada</h2>${chart(bd, { xLabels: ['Início', ...G.hist.map((_, k) => 'R' + (k + 1))], yMax: 21, label: 'Burndown do grupo comparado à linha ideal' })}
        <ul class="legend"><li><span style="color:#38bdf8">●</span> ${esc(G.group)}</li><li><span style="color:#94a3b8">┈</span> Linha ideal</li></ul></section>
      <section class="panel fbk"><h2>Feedback do grupo</h2>
        ${ins.good.length ? `<h3 class="gh">Pontos fortes</h3><ul class="ins good">${ins.good.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${ins.warn.length ? `<h3 class="gh">Pontos de atenção</h3><ul class="ins warn">${ins.warn.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</section>
      <section class="panel wide"><h2>Rodada a rodada</h2><ol class="fl">${fb}</ol></section>
    </main>`;
  }

  /* ---------------- janelas ---------------- */
  function viewModal() {
    const m = ui.modal; if (!m) return '';
    let body;
    if (m.type === 'rules') {
      body = `<h2>Como jogar</h2><ol class="rules">
        <li>O grupo gerencia o <b>Crediário Digital</b>: orçamento de R$ 42 mil, 21 itens, 7 sprints.</li>
        <li>A cada rodada acontece uma crise e os indicadores do projeto aparecem na tela.</li>
        <li>Escolham <b>uma</b> alternativa e toquem em <b>Confirmar decisão</b> antes do tempo acabar.</li>
        <li>Não existe resposta mágica: cada alternativa melhora algo e piora outra coisa.</li>
        <li>Cada rodada vale até <b>100 pontos</b>: prazo 30, custo 30, qualidade 25 e estratégia 15.</li>
        <li>São ${N} rodadas, até ${N * 100} pontos. No final, mostrem a pontuação aos apresentadores. Um aparelho por grupo.</li></ol>`;
    } else {
      const item = GLOSSARY.find((g) => g.key === m.key) || GLOSSARY[0];
      let atual = '';
      if (G && G.state) {
        const st = G.phase === 'round' ? G.pre : G.state, ind = Engine.indicators(st);
        const vel = G.phase === 'round' ? (G.pre.ev - G.base.ev) : undefined;
        atual = `<div class="now"><b>Agora, no projeto de vocês</b><p>${item.atual(st, ind, { velocity: vel })}</p></div>`;
      }
      body = `<h2>Guia de indicadores</h2><div class="glos"><nav class="gnav">${GLOSSARY.map((g) => `<button class="${g.key === item.key ? 'on' : ''}" data-act="mkey" data-key="${g.key}">${esc(g.sigla)}</button>`).join('')}</nav>
        <div class="gdet"><h3>${esc(item.sigla)} <small>${esc(item.nome)}</small></h3>${item.formula !== '—' ? `<p class="formula">${esc(item.formula)}</p>` : ''}
        <h4>Em palavras simples</h4><p>${esc(item.simples)}</p><h4>Exemplo</h4><p>${esc(item.exemplo)}</p>${atual}</div></div>`;
    }
    const mclk = G && G.phase === 'round' ? `<p class="mclock">⏱ Tempo da rodada: <b id="mclock">${clock(Math.max(0, G.deadline - Date.now()))}</b></p>` : '';
    return `<div class="overlay" data-act="close-modal"><div class="dialog" role="dialog" aria-modal="true" data-stop>
      <button class="btn xs close" data-act="close-modal" aria-label="Fechar">Fechar ✕</button>${mclk}${body}</div></div>`;
  }

  function renderModal() { $('#modal').innerHTML = viewModal(); const c = document.querySelector('.dialog .close'); if (c) c.focus(); tick(); }
  function render() {
    const app = $('#app');
    app.className = G ? 'ph-' + G.phase : 'ph-setup';
    app.innerHTML = (storageOK ? '' : '<p class="warn">Este navegador bloqueou o armazenamento. Não recarregue a página, ou o jogo recomeça.</p>') + (!G ? viewSetup() : G.phase === 'brief' ? viewBrief() : G.phase === 'round' ? viewRound() : G.phase === 'result' ? viewResult() : viewFinal());
    $('#modal').innerHTML = viewModal();
    tick();
  }

  /* ---------------- eventos ---------------- */
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'form') return;
    e.preventDefault();
    const name = $('#gname').value.replace(/\s+/g, ' ').trim();
    ui.name = name;
    if (!name) { ui.err = 'Digite o nome do grupo para continuar.'; render(); return; }
    ui.err = ''; start(name);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'close-modal' && e.target.closest('[data-stop]') && !b.classList.contains('close')) return;
    const d = b.dataset;
    switch (d.act) {
      case 'rules': ui.modal = { type: 'rules' }; renderModal(); break;
      case 'glossary': ui.modal = { type: 'glossary', key: 'SPI' }; renderModal(); break;
      case 'info': ui.modal = { type: 'glossary', key: d.key }; renderModal(); break;
      case 'mkey': ui.modal.key = d.key; renderModal(); break;
      case 'close-modal': ui.modal = null; renderModal(); break;
      case 'begin': beginRound(); break;
      case 'pick': select(d.k); break;
      case 'confirm': if (G && G.selected) submit(G.selected); break;
      case 'next': next(); break;
      case 'hide-rotate': $('#rotate').hidden = true; try { sessionStorage.setItem('hr', '1'); } catch (er) {} break;
      case 'copy': { const rp = Verify.replay(G.hist.map((h) => h.choice)), t = `${G.group} (${G.id}): ${rp.total} pontos · conferência ${Verify.code(G.id, G.hist.map((h) => h.choice))}`;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copiado!'; }).catch(() => { b.textContent = t; }); break; }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.modal) { ui.modal = null; renderModal(); return; }
    if (!G || G.phase !== 'round' || ui.modal || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const opts = ordered(G.round), i = Math.max('abcd'.indexOf(e.key.toLowerCase()), '1234'.indexOf(e.key));
    if (i >= 0 && i < opts.length) { select(opts[i].k); e.preventDefault(); }
    else if (e.key === 'Enter' && G.selected && e.target.tagName !== 'BUTTON') { e.preventDefault(); submit(G.selected); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  /* dica de girar o celular */
  try { if (!sessionStorage.getItem('hr')) $('#rotate').hidden = false; } catch (e) { $('#rotate').hidden = false; }

  // Se recarregou no meio de uma rodada, o horário real continua valendo (tick resolve o fim do tempo).
  render();
})();
