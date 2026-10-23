/* ============================================================
   MOTOR DO JOGO (regras e cálculos). Sem nada de tela aqui.
   Unidade: R$ mil. No nosso projeto real, 1 dia-tarefa = R$ 1 mil,
   então BAC = 42 dias-tarefa = R$ 42 mil, com 21 itens e 7 sprints.
   ============================================================ */
const Engine = (() => {
  const TOTAL_SPRINTS = 7;
  const STEPS_PER_SPRINT = 2;          // 2 rodadas por sprint: "meio" e "fim"
  const TOTAL_ITEMS = 21;
  let TOTAL_STEPS = 14;                // marcos do cronograma (2 por sprint). O jogo usa configure(n) com n = nº de crises.
  const MAX = { prazo: 30, custo: 30, qualidade: 25, estrategia: 15 };

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const r1 = (x) => Math.round((x + Number.EPSILON) * 100) / 100; // 2 casas internas; a tela mostra 1

  // Estado inicial: fim da sprint 1, tudo no plano (igual para todas as equipes).
  // EV = 6 de 42 e 18 itens restantes: ponto de partida fictício (não é o estado atual do projeto real).
  function initialState() {
    return { step: 2, sprint: 1, bac: 42, pvPrev: 6, pv: 6, ev: 6, ac: 6, q: 80, rework: 0 };
  }

  // Cada crise é um marco do cronograma. Com n crises, o plano termina (PV = BAC) na última.
  function configure(n) { TOTAL_STEPS = n + 2; }
  const when = (s) => `Sprint ${s.sprint} (${s.step % 2 === 1 ? 'meio' : 'fim'})`;
  const idealItems = (step) => Math.max(0, Math.round(TOTAL_ITEMS * (1 - step / TOTAL_STEPS)));

  // PV: o plano distribui o orçamento restante igualmente nas sprints que faltam.
  function planPV(s) {
    return r1(s.pvPrev + (s.bac - s.pvPrev) / (TOTAL_STEPS + 1 - s.step));
  }

  // Começo da rodada: passa uma sprint e o evento de crise acontece.
  // Regra de retrabalho: qualidade abaixo de 60 gera custo extra (R$ 0,25 mil a cada 10 pontos abaixo, por rodada).
  function startRound(prev, shock) {
    const s = { ...prev };
    s.step = prev.step + 1;
    s.sprint = Math.ceil(s.step / STEPS_PER_SPRINT);
    s.rework = prev.q < 60 ? Math.ceil((60 - prev.q) / 10) * 0.25 : 0;
    s.pvPrev = prev.pv;
    s.pv = planPV(s);
    s.ac = r1(s.ac + s.rework + shock.ac);
    s.ev = clamp(r1(s.ev + shock.ev), 0, s.bac);
    s.q = clamp(s.q + shock.q, 0, 100);
    return s;
  }

  // Efeito da decisão escolhida (ou nada, se a equipe não decidiu).
  // Sem decisão: a crise piora (menos trabalho entregue, mais gasto, qualidade em queda).
  const NO_DECISION = { ev: -0.5, ac: 0.5, q: -3, bac: 0 };

  function applyDecision(pre, opt) {
    const s = { ...pre };
    if (!opt) opt = NO_DECISION;
    s.bac = r1(s.bac + (opt.bac || 0));
    s.ev = clamp(r1(s.ev + opt.ev), 0, s.bac);
    s.ac = r1(s.ac + opt.ac);
    s.q = clamp(s.q + opt.q, 0, 100);
    if (opt.bac) s.pv = planPV(s);
    return s;
  }

  // Indicadores sempre calculados a partir de PV, EV, AC e BAC (nunca digitados à mão).
  // Divisão por zero devolve null, e a tela mostra "não calculável".
  function indicators(s) {
    const spi = s.pv > 0 ? s.ev / s.pv : null;
    const cpi = s.ac > 0 ? s.ev / s.ac : null;
    const eac = cpi && cpi > 0 ? s.bac / cpi : null;
    return {
      spi, cpi,
      sv: s.ev - s.pv,
      cv: s.ev - s.ac,
      eac,
      etc: eac === null ? null : eac - s.ac,
      vac: eac === null ? null : s.bac - eac,
      items: Math.round(TOTAL_ITEMS * (1 - s.ev / s.bac)),
      done: s.ev / s.bac
    };
  }

  // Semáforo (sempre acompanhado de texto na tela).
  function level(kind, v) {
    if (v === null || v === undefined) return { level: 'na', label: 'Não calculável' };
    if (kind === 'q') {
      return v >= 75 ? { level: 'good', label: 'Favorável' } : v >= 60 ? { level: 'warn', label: 'Atenção' } : { level: 'bad', label: 'Risco' };
    }
    if (kind === 'vac') {
      return v >= 0 ? { level: 'good', label: 'Dentro do orçamento' } : v > -4 ? { level: 'warn', label: 'Atenção' } : { level: 'bad', label: 'Estouro previsto' };
    }
    return v >= 1 ? { level: 'good', label: 'Favorável' } : v >= 0.9 ? { level: 'warn', label: 'Atenção' } : { level: 'bad', label: 'Risco' };
  }

  // Pontuação da rodada (até 100): prazo 30 + custo 30 + qualidade 25 + estratégia 15.
  function scoreRound(post, opt) {
    const i = indicators(post);
    const prazo = Math.round(MAX.prazo * clamp(((i.spi ?? 0) - 0.5) / 0.5, 0, 1));
    const custo = Math.round(MAX.custo * clamp(((i.cpi ?? 0) - 0.5) / 0.5, 0, 1));
    const qualidade = Math.round(MAX.qualidade * clamp((post.q - 40) / 60, 0, 1));
    const estrategia = opt ? opt.s : 0;
    return { prazo, custo, qualidade, estrategia, total: prazo + custo + qualidade + estrategia };
  }

  return { TOTAL_SPRINTS, TOTAL_ITEMS, MAX, configure, when, idealItems, totalSteps: () => TOTAL_STEPS, initialState, startRound, applyDecision, indicators, level, scoreRound, clamp, r1 };
})();
if (typeof module !== 'undefined') module.exports = Engine;
