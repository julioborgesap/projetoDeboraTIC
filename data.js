/* ============================================================
   CRISES DO JOGO (12 desafios, 2 por sprint). Pode editar textos e números.
   shock  : o que o problema faz com a rodada (ev, ac, q)
   options: k = letra, t = texto, d = dica curta,
            ev/ac/q/bac = efeito da decisão, s = pontos de estratégia (0 a 15),
            r = o que aconteceu (mostrado depois da decisão)
   Unidade: R$ mil. Cada item do backlog vale 2 (R$ 2 mil).
   Plano: o PV sobe 3 por rodada (42 em 12 rodadas, a partir de 6).
   Se mudar a quantidade de crises, o plano se ajusta sozinho (ver Engine.configure).
   ============================================================ */
const EVENTS = [
  { title: 'O projeto está atrasado', icon: '⏱',
    story: 'Login e perfis de acesso (BL-03 e BL-04) levaram mais tempo do que o previsto. O escritório já perguntou quando o Crediário Digital fica pronto.',
    shock: { ev: 2, ac: 2.5, q: 0 }, watch: ['SPI', 'CPI'],
    options: [
      { k: 'A', t: 'Contratar um desenvolvedor extra', d: 'Mais braços, mas custa e leva tempo para integrar.', ev: 1, ac: 1.5, q: -2, s: 6,
        r: 'Recuperou parte do atraso, mas o custo subiu e o novato ainda estava se adaptando.' },
      { k: 'B', t: 'Manter o plano e observar', d: 'Sem mudanças agora.', ev: 0, ac: 0, q: 0, s: 3,
        r: 'Nada mudou. O atraso e o gasto continuam como estavam.' },
      { k: 'C', t: 'Reorganizar prioridades e focar no maior valor', d: 'Remove impedimentos e entrega primeiro o que importa.', ev: 1, ac: 0.5, q: 0, s: 15,
        r: 'Priorizou o que mais importa ao escritório e reduziu o atraso com pouco custo extra.' },
      { k: 'D', t: 'Reduzir os testes para acelerar', d: 'Ganha tempo agora.', ev: 1, ac: 0, q: -8, s: 2,
        r: 'Ganhou velocidade, mas a qualidade caiu e o risco de retrabalho aumentou.' }
    ],
    lesson: 'SPI abaixo de 1 mostra que entregamos menos valor do que o planejado. Contratar mais gente aumenta a capacidade, mas custa e não acelera de imediato. Priorizar as entregas de maior valor costuma ser a resposta mais barata.' },

  { title: 'O escritório pediu 3 itens novos', icon: '➕',
    story: 'Angelita e Rogério querem 3 funcionalidades novas, sem aumentar prazo nem orçamento. O plano já está apertado.',
    shock: { ev: 2.5, ac: 2.5, q: 0 }, watch: ['SPI', 'BAC'],
    options: [
      { k: 'A', t: 'Aceitar tudo sem revisar o plano', d: 'O cliente fica feliz hoje.', ev: 0, ac: 1.5, q: -4, s: 2,
        r: 'O trabalho extra consumiu horas fora do plano: o custo subiu, o valor agregado não e a qualidade caiu.' },
      { k: 'B', t: 'Adiar os itens novos para uma 2ª versão', d: 'Protege o plano atual.', ev: 0, ac: 0, q: 1, s: 9,
        r: 'O plano foi protegido, mas o escritório ficou com um pedido pendente.' },
      { k: 'C', t: 'Trocar: entram os novos, saem itens de baixa prioridade', d: 'Mudança controlada, escopo equilibrado.', ev: 0.5, ac: 0.5, q: 0, s: 15,
        r: 'Mudança controlada: o escopo ficou equilibrado e o cliente foi atendido sem estourar o plano.' }
    ],
    lesson: 'Mudança de escopo sem controle gasta tempo e dinheiro sem aparecer no valor agregado. O controle de mudanças existe para decidir o que entra e o que sai.' },

  { title: 'Os módulos não conversam entre si', icon: '🔌',
    story: 'Na primeira integração, clientes, serviços e cobranças não se entendem: o saldo mostrado para o cliente não bate com os serviços lançados.',
    shock: { ev: 2, ac: 2.5, q: -4 }, watch: ['Qualidade', 'SPI'],
    options: [
      { k: 'A', t: 'Deixar para resolver na validação com o escritório', d: 'Não mexe no cronograma agora.', ev: 0.5, ac: 0, q: -6, s: 2,
        r: 'O problema ficou escondido e vai aparecer na pior hora, na frente do cliente.' },
      { k: 'B', t: 'Testar a integração e revisar as dependências entre módulos', d: 'Gasta um pouco agora para evitar surpresa.', ev: 0, ac: 1, q: 6, s: 15,
        r: 'A equipe achou a causa, corrigiu as dependências e os módulos passaram a funcionar juntos.' },
      { k: 'C', t: 'Corrigir só o que quebrou, sem revisar o resto', d: 'Conserta o sintoma mais visível.', ev: 0.5, ac: 0.5, q: 1, s: 8,
        r: 'O erro mais visível sumiu, mas outras dependências continuam sem ser verificadas.' }
    ],
    lesson: 'Módulos prontos separadamente não garantem um sistema que funciona. Teste de integração cedo evita descobrir o problema só na validação com o cliente.' },

  { title: 'A qualidade caiu', icon: '🐞',
    story: 'Os testes de cadastro e cobranças (BL-05 a BL-09) acharam muitos defeitos. O escritório não aceita um sistema que erra valores.',
    shock: { ev: 2.5, ac: 2.5, q: -6 }, watch: ['Qualidade', 'CPI'],
    options: [
      { k: 'A', t: 'Seguir em frente e corrigir depois', d: 'Não perde ritmo agora.', ev: 0.5, ac: 0, q: -3, s: 2,
        r: 'Manteve o ritmo, mas os defeitos se acumularam e vão virar retrabalho.' },
      { k: 'B', t: 'Corrigir só os defeitos críticos e testar o essencial', d: 'Meio-termo.', ev: 0, ac: 0.5, q: 5, s: 11,
        r: 'Eliminou os defeitos mais graves e manteve boa parte do ritmo.' },
      { k: 'C', t: 'Parar para corrigir e reforçar os testes', d: 'Perde um pouco de prazo hoje.', ev: -0.5, ac: 0.5, q: 9, s: 15,
        r: 'Perdeu um pouco de ritmo agora, mas a qualidade se recuperou e evitou retrabalho depois.' }
    ],
    lesson: 'Economizar em testes parece ganhar tempo, mas os defeitos viram retrabalho e custo extra nas próximas rodadas. Qualidade também faz parte do desempenho.' },

  { title: 'A produtividade caiu', icon: '📉',
    story: 'Um dos três integrantes ficou indisponível. A velocidade do time caiu para 2 itens por sprint (o plano espera 3).',
    shock: { ev: 2, ac: 2.5, q: 0 }, watch: ['Velocidade', 'SPI'],
    options: [
      { k: 'A', t: 'Pedir horas extras ao time', d: 'Entrega mais, por um tempo.', ev: 1, ac: 0.5, q: -4, s: 3,
        r: 'Entregou mais no curto prazo, mas o cansaço aumentou o custo e derrubou a qualidade.' },
      { k: 'B', t: 'Prometer só o que cabe na sprint e remover impedimentos', d: 'Ajusta a meta ao ritmo real.', ev: 0.5, ac: 0, q: 1, s: 15,
        r: 'Ajustou a meta ao ritmo real e removeu bloqueios. O time voltou a entregar com previsibilidade.' },
      { k: 'C', t: 'Trazer um colega de outro projeto', d: 'Reforço temporário.', ev: 1, ac: 1, q: -1, s: 9,
        r: 'O reforço ajudou, mas custou caro e o colega precisou de tempo para entender o sistema.' }
    ],
    lesson: 'A velocidade mostra o ritmo real do time. Quando ela cai, prometer mais do que o time entrega só esconde o problema. Horas extras sobem o custo e derrubam a qualidade.' },

  { title: 'O servidor travou e os dados sumiram', icon: '💾',
    story: 'O computador do escritório travou durante um teste e os cadastros de exemplo foram perdidos. Ainda não existe rotina de backup.',
    shock: { ev: 2, ac: 3, q: -4 }, watch: ['Qualidade', 'CPI'],
    options: [
      { k: 'A', t: 'Criar uma rotina de backup e testar a restauração', d: 'Custa agora, protege o resto do projeto.', ev: 0, ac: 1, q: 6, s: 15,
        r: 'O backup passou a rodar sozinho e a restauração foi testada. Uma falha futura não será mais um desastre.' },
      { k: 'B', t: 'Refazer os cadastros à mão e deixar o backup para depois', d: 'Resolve o problema de hoje.', ev: 0.5, ac: 1, q: 0, s: 6,
        r: 'Os dados voltaram, mas o risco continua: se travar de novo, tudo se repete.' },
      { k: 'C', t: 'Seguir sem backup e torcer para não repetir', d: 'Não gasta tempo nem dinheiro.', ev: 0.5, ac: 0, q: -4, s: 2,
        r: 'Economizou hoje, mas o projeto segue exposto a perder tudo de novo.' }
    ],
    lesson: 'Perda de dados tem impacto alto e prevenir custa pouco. Backup só vale se a restauração for testada. É um risco que já estava na nossa gestão de riscos.' },

  { title: 'Os funcionários se perderam nas telas', icon: '🧭',
    story: 'Na demonstração, a equipe do escritório não achou os botões e pediu ajuda várias vezes. A interface deveria ser simples e parecida com o caderno.',
    shock: { ev: 2, ac: 2.5, q: -3 }, watch: ['Qualidade', 'SPI'],
    options: [
      { k: 'A', t: 'Testar com os usuários e simplificar os fluxos', d: 'Ajusta a tela a partir do que eles fazem.', ev: 0.5, ac: 0.5, q: 5, s: 15,
        r: 'Observar os usuários mostrou onde estava a confusão. Os fluxos ficaram mais simples e parecidos com o caderno.' },
      { k: 'B', t: 'Dar um treinamento longo e manter a interface como está', d: 'Ensina a usar do jeito que está.', ev: 0, ac: 1.5, q: 1, s: 6,
        r: 'O treinamento ajudou, mas custou tempo e a tela continua confusa para quem entrar depois.' },
      { k: 'C', t: 'Seguir como está: eles se acostumam', d: 'Não mexe em nada.', ev: 0.5, ac: 0, q: -4, s: 2,
        r: 'Sem ajuste, as dificuldades continuaram e o escritório começou a perder a confiança no sistema.' }
    ],
    lesson: 'Usabilidade se verifica observando usuários reais. Treinar muito para compensar uma interface confusa gasta tempo e dinheiro.' },

  { title: 'Hora de trocar de gerente', icon: '🔄',
    story: 'Breno, Hugo e Júlio se revezam na gerência. O quadro de tarefas está desatualizado e ninguém lembra o que está bloqueado.',
    shock: { ev: 2, ac: 2.5, q: 0 }, watch: ['SPI', 'CPI'],
    options: [
      { k: 'A', t: 'Fazer uma reunião de transição e entregar cronograma, quadro e registros atualizados', d: 'Passa o contexto completo.', ev: 0.5, ac: 0.5, q: 1, s: 15,
        r: 'O novo gerente assumiu sabendo o que estava feito, o que estava bloqueado e quais eram os próximos passos.' },
      { k: 'B', t: 'Mandar uma mensagem curta e o novo gerente se vira', d: 'Rápido e barato.', ev: 0, ac: 0, q: -2, s: 3,
        r: 'Faltou contexto: o novo gerente perdeu tempo descobrindo o que estava pendente e deixou um bloqueio passar.' },
      { k: 'C', t: 'Adiar a troca até o fim do projeto', d: 'Evita mudança agora.', ev: 0, ac: 0.5, q: 0, s: 8,
        r: 'Evitou o risco da troca, mas o gerente atual ficou sobrecarregado e o plano de revezamento foi quebrado.' }
    ],
    lesson: 'Trocar de gerente sem passar as informações perde contexto. Cronograma, quadro de tarefas e impedimentos precisam ser entregues juntos.' },

  { title: 'Duas pessoas fizeram a mesma tarefa', icon: '🗣',
    story: 'Por falta de comunicação, dois integrantes desenvolveram a mesma tela e uma outra tarefa ficou sem dono.',
    shock: { ev: 2, ac: 3, q: 0 }, watch: ['CPI', 'SPI'],
    options: [
      { k: 'A', t: 'Marcar uma reunião longa de uma hora todos os dias', d: 'Todo mundo fica sabendo de tudo.', ev: 0, ac: 1, q: 0, s: 6,
        r: 'A informação circulou, mas as reuniões longas tomaram horas que poderiam virar entrega.' },
      { k: 'B', t: 'Atualizar o quadro de tarefas e fazer reuniões rápidas de acompanhamento', d: 'Cada tarefa com dono, em poucos minutos por dia.', ev: 1, ac: 0.5, q: 0, s: 15,
        r: 'O quadro deixou claro quem faz o quê e a daily curta evitou novos retrabalhos.' },
      { k: 'C', t: 'Deixar cada um se organizar sozinho', d: 'Confia na boa vontade do time.', ev: 0, ac: 0, q: -2, s: 2,
        r: 'Sem coordenação, o problema voltou a acontecer e o retrabalho continuou sem aparecer no valor entregue.' }
    ],
    lesson: 'Falta de comunicação gera retrabalho invisível: tarefa duplicada custa dinheiro sem aumentar o valor agregado. Quadro atualizado e reuniões curtas resolvem a maior parte.' },

  { title: 'O custo final estimado aumentou', icon: '💸',
    story: 'A estimativa de custo final (EAC) passou do orçamento aprovado. O escritório quer saber quanto o sistema vai custar de verdade.',
    shock: { ev: 2.5, ac: 2.5, q: 0 }, watch: ['EAC', 'CPI'],
    options: [
      { k: 'A', t: 'Reduzir o escopo: retirar 2 itens de baixa prioridade', d: 'Ataca a causa do estouro.', ev: 0, ac: 0.5, q: 0, bac: -4, s: 15,
        r: 'Com menos escopo, o orçamento final ficou mais realista e o estouro previsto diminuiu.' },
      { k: 'B', t: 'Pedir mais orçamento ao cliente', d: 'Cobre o rombo, não resolve a causa.', ev: 0, ac: 0, q: 0, bac: 4, s: 6,
        r: 'O orçamento subiu, mas a eficiência de custo continuou igual: o problema foi empurrado para frente.' },
      { k: 'C', t: 'Revisar o plano e cortar desperdícios', d: 'Faz mais com o mesmo gasto.', ev: 0.5, ac: 0, q: 2, s: 11,
        r: 'Cortou desperdícios e melhorou a eficiência, mas só isso não elimina todo o desvio.' }
    ],
    lesson: 'A EAC é uma previsão: ela avisa antes de o estouro acontecer. Reduzir escopo ou melhorar a eficiência ataca a causa. Só pedir mais verba empurra o problema.' },

  { title: 'O sistema ficou lento com vários usuários', icon: '🐢',
    story: 'Nos testes com 10 pessoas ao mesmo tempo, o sistema travou. O escritório pediu suporte a até 15 usuários simultâneos.',
    shock: { ev: 2.5, ac: 2.5, q: -3 }, watch: ['Qualidade', 'CPI'],
    options: [
      { k: 'A', t: 'Ignorar: o escritório é pequeno e quase nunca usa ao mesmo tempo', d: 'Não gasta nada.', ev: 0.5, ac: 0, q: -4, s: 2,
        r: 'O problema vai aparecer justo nos horários de pico, quando mais gente estiver usando.' },
      { k: 'B', t: 'Trocar por um servidor bem maior, sem medir antes', d: 'Resolve na força.', ev: 0, ac: 2, q: 1, s: 5,
        r: 'Gastou bastante e ninguém sabe se o gargalo era mesmo o servidor.' },
      { k: 'C', t: 'Simular acessos simultâneos, achar o gargalo e ajustar', d: 'Mede primeiro, depois corrige.', ev: 0.5, ac: 0.5, q: 5, s: 15,
        r: 'A simulação mostrou o gargalo. Com um ajuste certeiro, o sistema passou a atender os 15 usuários.' }
    ],
    lesson: 'Requisito de desempenho se verifica com teste, não com opinião. Gastar com infraestrutura sem medir nem sempre resolve o gargalo.' },

  { title: 'Chegou o prazo final', icon: '🏁',
    story: 'É a última rodada e ainda há entregas pendentes. O escritório quer começar a usar o sistema na segunda-feira.',
    shock: { ev: 2.5, ac: 3, q: 0 }, watch: ['SPI', 'Qualidade'],
    options: [
      { k: 'A', t: 'Acelerar com horas extras e testes mínimos', d: 'Tenta entregar tudo.', ev: 1, ac: 1, q: -6, s: 4,
        r: 'Entregou mais, mas com custo alto e muito risco de erro depois da entrega.' },
      { k: 'B', t: 'Priorizar o essencial: login, cadastro, serviços e cobranças', d: 'Entrega o que mais importa.', ev: 1, ac: 0.5, q: 2, s: 15,
        r: 'Entregou o essencial com qualidade. O escritório já pode usar o sistema no dia a dia.' },
      { k: 'C', t: 'Entregar o que estiver pronto e corrigir depois', d: 'Cumpre a data.', ev: 0.5, ac: 0, q: -3, s: 8,
        r: 'Cumpriu a data, mas deixou defeitos que ainda precisarão ser corrigidos.' }
    ],
    lesson: 'No fim do prazo, o valor está nas entregas essenciais. Correr sem testes entrega rápido e erra mais. É aqui que a Definição de Pronto e a honestidade do dado fazem diferença.' }
];
if (typeof module !== 'undefined') module.exports = EVENTS;
