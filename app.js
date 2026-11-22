/* Mentor de Valor — PWA (sem servidor, sem custo).
   Conteúdo: data/licoes.json e data/videos.json (atualizados quando novas lições são publicadas).
   Seus dados (perfil, progresso, diário, PIN) ficam só neste aparelho (localStorage). */
{
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CAT = {vida:'Dia a dia', carreira:'Profissional', negocio:'Negócio'};
const MOMENTOS = [
  ['clt','Trabalho CLT / emprego'],['empreender','Quero abrir um negócio'],['negocio','Já tenho um negócio'],
  ['liberal','Sou profissional liberal'],['estudante','Estudante / começando']];
const EXKEY = {clt:'clt', empreender:'empreender', negocio:'negocio', liberal:'negocio', estudante:'empreender'};
const EXLABEL = {clt:'Se você é CLT', empreender:'Se você quer empreender', negocio:'Se você já tem negócio'};
const DESAFIOS = {
  vender:{t:'Vender e conseguir clientes', d:'Quase todo problema de dinheiro e de negócio passa por vendas. Nos vídeos, o Flávio trata vender como a habilidade que dá liberdade: com ela, você deixa de depender de quem decide quanto você ganha. O caminho é treinar com volume e medir.'},
  precificar:{t:'Cobrar o preço certo', d:'Preço baixo costuma esconder dois problemas: não saber o valor que você gera e um modelo sem margem. A linha dos vídeos é clara: preço vem do retorno que você entrega, e margem é a recompensa pelo seu esforço.'},
  decidir:{t:'Tomar uma decisão que estou adiando', d:'Decisões travadas quase sempre têm um medo que nunca foi escrito. A ferramenta mais usada pelo Flávio é simples: colocar no papel o pior cenário e ver se ele é suportável sem arriscar o que mais importa.'},
  foco:{t:'Foco e disciplina', d:'Falta de resultado pode ser falta de intensidade, caminho errado ou pouco tempo: faça o diagnóstico antes de se cobrar mais. O Guto acrescenta que a disciplina vem antes da motivação, e que para o cérebro vale o que você repete, não o que você quer.'},
  dinheiro:{t:'Organizar e aumentar meu dinheiro', d:'Nos vídeos, a visão é que ninguém enriquece só cortando gastos: o salto vem de produzir mais. Ao mesmo tempo, gaste menos do que ganha, não arrisque em investimentos que não entende e leia a fase da sua vida antes de imobilizar dinheiro.'},
  comecar:{t:'Começar um negócio ou projeto', d:'Começar não é abrir CNPJ, é validar. Passe a ideia pelo filtro (dor, causa, margem, recorrência, impostos), procure necessidades mal atendidas e faça a primeira venda antes de investir pesado.'},
  ia:{t:'Me adaptar à inteligência artificial', d:'A mudança é real: o Flávio cita uma área da empresa dele que vai encolher de 200 para cerca de 20 pessoas. O conselho é estudar, agir e trocar a ansiedade por uso prático, focando no que só você faz.'},
  mentalidade:{t:'Confiança e mentalidade', d:'Confiança se constrói com vitórias que você reconhece como suas e com a quebra das frases que te limitam. O Flávio fala em gratidão sem conformismo; o Guto, em sair das prisões de identidade, capacidade e merecimento e aumentar a tolerância ao desconforto.'}
};

/* ---------- estado local ---------- */
const KEY = 'mv:state:v1';
let S = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
S.prog ||= {}; S.reflexoes ||= {}; S.log ||= []; S.perfil ||= null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Não consegui salvar neste aparelho.'); } };

let MENT = {flavio:{nome:'Flávio Augusto'}, guto:{nome:'Guto Galamba'}};
const mentorOf = l => l.mentor || 'flavio';
const mName = k => MENT[k]?.nome || k;
const pref = () => S.perfil?.mentor || 'todos';
const prefL = () => pref() === 'todos' ? L : L.filter(l => mentorOf(l) === pref());
let mfilter = null;
let L = [], V = [], dataDate = '', news = [], mentor = {step: 1, desafio: null, momento: null}, filter = 'todas', search = '';
let deferredInstall = null;

const today = () => new Date().toISOString().slice(0, 10);
const fmt = d => { try { return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}); } catch (e) { return d; } };
const mmss = t => { t |= 0; const h = Math.floor(t/3600), m = Math.floor(t%3600/60), s = t%60; return (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(s).padStart(2,'0'); };
const yt = (id, t) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${t ? `&t=${t|0}s` : ''}`;
const byId = id => L.find(l => l.id === id);
const vid = id => V.find(v => v.id === id) || {};
const exKey = () => EXKEY[S.perfil?.momento] || null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }

function streak() {
  const set = new Set(S.log); let n = 0; const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function logToday() { if (!S.log.includes(today())) { S.log.push(today()); S.log = S.log.slice(-400); } }
function current() { return L.find(l => S.prog[l.id]?.status === 'aplicando') || null; }
function suggestion() {
  const pool = prefL().filter(l => !S.prog[l.id]);
  const foco = S.perfil?.foco;
  return pool.find(l => foco && l.categoria === foco) || pool[0] || null;
}
function daysDone(id) { return (S.prog[id]?.dias || []).filter(Boolean).length; }

/* ---------- ações ---------- */
function accept(id) {
  const cur = current();
  if (cur && cur.id !== id && !confirmSwap(cur)) return;
  S.prog[id] = {...(S.prog[id] || {}), status:'aplicando', desde: today(), dias: S.prog[id]?.dias || Array(7).fill(false)};
  save(); toast('Missão aceita. Um passo por dia.'); location.hash = '#licao-' + id; route();
}
function confirmSwap(cur) {
  // troca de missão: a anterior volta para "pendente", mantendo os dias marcados
  S.prog[cur.id].status = 'pausada'; return true;
}
function toggleDay(id, i) {
  const p = S.prog[id]; if (!p) return;
  p.dias ||= Array(7).fill(false); p.dias[i] = !p.dias[i];
  if (p.dias[i]) logToday();
  save(); route();
  if (p.dias[i] && p.dias.every(Boolean)) toast('Plano completo! Registre o que mudou.');
}
function finish(id, nota) {
  S.prog[id] = {...(S.prog[id] || {}), status:'aplicado', nota, at: today()};
  logToday(); save(); toast('Lição registrada no seu diário.');
  const next = suggestion(); location.hash = next ? '#hoje' : '#progresso'; route();
}
function markSeen(ids) { S.seen = [...new Set([...(S.seen || []), ...ids])]; news = L.filter(l => !S.seen.includes(l.id)).map(l => l.id); save(); }

/* ---------- views ---------- */
const views = {
  hoje() {
    $('#title').textContent = 'Sua missão';
    const cur = current(), sug = suggestion();
    let h = '';
    if (news.length) h += `<div class="banner"><span><strong>${news.length} ${news.length === 1 ? 'lição nova' : 'lições novas'}</strong> de vídeos recentes</span><button data-go="novas">Ver</button></div>`;
    if (!S.perfil?.momento) h += `<div class="card hero stack"><span class="label">Comece aqui</span><h2>Configure seu mentor em 1 minuto</h2><p class="muted">Conte seu momento e seu objetivo. O app adapta os exemplos e sugere a missão certa para você.</p><a class="btn g w" href="#perfil">Configurar</a></div>`;
    if (cur) {
      const p = S.prog[cur.id], i = (p.dias || []).findIndex(x => !x), done = daysDone(cur.id);
      h += `<div class="card ${S.perfil?.momento ? 'hero' : ''} stack"><span class="label">Missão em andamento · ${mName(mentorOf(cur))}</span><h2>${esc(cur.titulo)}</h2>
        <div class="progress" aria-label="${done} de 7 passos"><i style="width:${done/7*100}%"></i></div><span class="muted">${done} de 7 passos</span>
        ${i >= 0 ? `<button class="day" data-day="${cur.id}:${i}"><span class="box"></span><span class="txt"><span class="n">Passo de hoje · ${i+1} de 7</span>${esc(cur.plano[i])}</span></button>`
                 : `<div class="act"><b>Plano concluído</b>Registre o que você fez e o que mudou.</div>`}
        <div class="row"><a class="btn o" href="#licao-${cur.id}">Ver missão completa</a>${i < 0 ? `<a class="btn g" href="#licao-${cur.id}">Registrar aplicação</a>` : ''}</div></div>`;
    } else if (sug) {
      h += `<div class="card ${S.perfil?.momento ? 'hero' : ''} stack"><span class="label">Missão sugerida · ${mName(mentorOf(sug))} · ${CAT[sug.categoria]}</span><h2>${esc(sug.titulo)}</h2><p>${esc(sug.ideia)}</p>
        <div class="act"><b>Sua ação</b>${esc(sug.acao)}</div>
        <div class="row"><button class="btn g" data-accept="${sug.id}">Aceitar missão de 7 dias</button><a class="btn o" href="#licao-${sug.id}">Ver detalhes</a></div></div>`;
    } else if (L.length) {
      h += `<div class="card hero stack"><span class="label">Parabéns</span><h2>Você aplicou todas as lições disponíveis</h2><p class="muted">Novas lições aparecem aqui quando novos vídeos forem analisados. Revise seu diário enquanto isso.</p></div>`;
    }
    const RL = prefL(), rl = RL.length ? RL[(new Date().getDate() + new Date().getMonth()) % RL.length] : null;
    if (rl) h += `<div class="card stack"><span class="label">Reflexão do dia</span><h3>${esc(rl.pergunta)}</h3>
      <textarea id="refl" data-refl="${rl.id}" placeholder="Escreva sua resposta (fica só no seu aparelho)">${esc(S.reflexoes[rl.id]?.texto || '')}</textarea>
      <span class="muted">Da lição <a href="#licao-${rl.id}">${esc(rl.titulo)}</a></span></div>`;
    h += estudosHoje();
    const sk = streak();
    h += `<div class="card row" style="justify-content:space-between"><div><div class="label">Sequência</div><strong style="font:700 26px 'Space Grotesk'">${sk} ${sk === 1 ? 'dia' : 'dias'}</strong><div class="muted">com pelo menos um passo feito</div></div><a class="btn o" href="#mentor">Sessão de mentoria</a></div>`;
    h += installCard();
    $('#v-hoje').innerHTML = h;
  },

  biblioteca() {
    $('#title').textContent = 'Biblioteca';
    const opts = [['todas','Todas'],['vida','Dia a dia'],['carreira','Profissional'],['negocio','Negócio'],['pendentes','Não aplicadas'],...(news.length ? [['novas',`Novas (${news.length})`]] : [])];
    if (mfilter === null) mfilter = pref();
    let list = mfilter === 'todos' ? L : L.filter(l => mentorOf(l) === mfilter);
    if (filter === 'pendentes') list = list.filter(l => S.prog[l.id]?.status !== 'aplicado');
    else if (filter === 'novas') list = list.filter(l => news.includes(l.id));
    else if (filter !== 'todas') list = list.filter(l => l.categoria === filter);
    if (search) { const q = search.toLowerCase(); list = list.filter(l => (l.titulo + ' ' + l.ideia + ' ' + (l.tags || []).join(' ')).toLowerCase().includes(q)); }
    $('#v-biblioteca').innerHTML = `<input id="search" type="search" placeholder="Buscar: preço, vendas, medo…" value="${esc(search)}" aria-label="Buscar lições" style="margin-bottom:10px">
      <div class="chips">${[['todos','Todos os mentores'],...Object.entries(MENT).map(([k, m]) => [k, m.nome])].map(([k, t]) => `<button class="chip" data-mf="${k}" aria-pressed="${mfilter === k}">${esc(t)}</button>`).join('')}</div>
      <div class="chips">${opts.map(([k,t]) => `<button class="chip" data-f="${k}" aria-pressed="${filter === k}">${t}</button>`).join('')}</div>
      <div class="list">${list.length ? list.map(card).join('') : '<div class="empty">Nada encontrado.</div>'}</div>`;
    if (filter === 'novas') markSeen(list.map(l => l.id));
  },

  licao(id) {
    const l = byId(id); if (!l) { location.hash = '#biblioteca'; return; }
    if (!(S.seen || []).includes(id)) markSeen([id]);
    $('#title').textContent = CAT[l.categoria];
    const p = S.prog[id] || {}, v = vid(l.video), k = exKey();
    const ex = k ? `<div class="act"><b>${EXLABEL[k]}</b>${esc(l.exemplos[k])}</div>`
                 : Object.entries(l.exemplos).map(([kk, t]) => `<div class="act"><b>${EXLABEL[kk]}</b>${esc(t)}</div>`).join('');
    const ativo = p.status === 'aplicando';
    $('#v-licao').innerHTML = `<button class="back" data-back>← Voltar</button>
      <div class="card stack"><div class="row" style="justify-content:space-between"><span class="label">${esc(mName(mentorOf(l)))} · ${CAT[l.categoria]}</span>${status(p)}</div>
        <h2>${esc(l.titulo)}</h2><p>${esc(l.ideia)}</p>
        <a class="muted" href="${yt(l.video, l.inicio)}" target="_blank" rel="noopener">▶ ${esc(v.titulo || 'Assistir no YouTube')} · ${mmss(l.inicio)}</a></div>
      <div class="card stack"><span class="label">No seu caso</span>${ex}${k ? '' : '<a href="#perfil" class="muted">Configure seu perfil para ver só o exemplo do seu momento.</a>'}</div>
      <div class="card stack"><span class="label">Ação prática</span><p>${esc(l.acao)}</p></div>
      <div class="card stack"><div class="row" style="justify-content:space-between"><span class="label">Plano de 7 dias</span>${ativo ? `<span class="muted">${daysDone(id)}/7</span>` : ''}</div>
        <div class="days">${l.plano.map((s, i) => { const ok = p.dias?.[i];
          return ativo ? `<button class="day ${ok ? 'ok' : ''}" data-day="${id}:${i}" aria-pressed="${!!ok}"><span class="box">${ok ? '✓' : ''}</span><span class="txt"><span class="n">Dia ${i+1}</span>${esc(s)}</span></button>`
                       : `<div class="day ${ok ? 'ok' : ''}" style="cursor:default"><span class="box">${ok ? '✓' : ''}</span><span class="txt"><span class="n">Dia ${i+1}</span>${esc(s)}</span></div>`; }).join('')}</div>
        ${p.status === 'aplicado' ? '' : ativo ? '' : `<button class="btn g w" data-accept="${id}">${p.status === 'pausada' ? 'Retomar esta missão' : 'Aceitar missão de 7 dias'}</button>`}</div>
      <div class="card"><span class="label">Perguntas do mentor</span>${l.faq.map(f => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</div>
      <div class="card stack"><span class="label">Para refletir</span><h3>${esc(l.pergunta)}</h3>
        <textarea data-refl="${id}" placeholder="Sua resposta">${esc(S.reflexoes[id]?.texto || '')}</textarea></div>
      ${ativo || p.status === 'aplicado' ? `<div class="card stack"><span class="label">${p.status === 'aplicado' ? 'Seu registro' : 'Registrar aplicação'}</span>
        <textarea id="nota" placeholder="O que você fez e o que mudou?">${esc(p.nota || '')}</textarea>
        <button class="btn ${p.status === 'aplicado' ? 'o' : 'g'} w" data-finish="${id}">${p.status === 'aplicado' ? 'Atualizar registro' : 'Concluir e registrar'}</button></div>` : ''}`;
  },

  mentor() {
    $('#title').textContent = 'Sessão de mentoria';
    const m = mentor; let h = '';
    if (m.step === 1) {
      h = `<div class="chips">${[['todos','Os dois mentores'],...Object.entries(MENT).map(([k, m]) => [k, m.nome])].map(([k, t]) => `<button class="chip" data-pm="${k}" aria-pressed="${pref() === k}">${esc(t)}</button>`).join('')}</div>
        <div class="card stack"><span class="label">Passo 1 de 2</span><h2>O que mais te trava agora?</h2>
        <div class="opts">${Object.entries(DESAFIOS).map(([k, d]) => `<button class="opt" data-des="${k}" aria-pressed="${m.desafio === k}">${d.t}</button>`).join('')}</div></div>`;
    } else if (m.step === 2) {
      h = `<button class="back" data-mstep="1">← Voltar</button><div class="card stack"><span class="label">Passo 2 de 2</span><h2>Qual é o seu momento?</h2>
        <div class="opts">${MOMENTOS.map(([k, t]) => `<button class="opt" data-mom="${k}" aria-pressed="${m.momento === k}">${t}</button>`).join('')}</div></div>`;
    } else {
      const d = DESAFIOS[m.desafio], k = EXKEY[m.momento];
      const recs = prefL().filter(l => (l.desafios || []).includes(m.desafio))
        .sort((a, b) => (S.prog[a.id]?.status === 'aplicado') - (S.prog[b.id]?.status === 'aplicado') || (b.categoria === S.perfil?.foco) - (a.categoria === S.perfil?.foco))
        .slice(0, 3);
      h = `<button class="back" data-mstep="1">← Recomeçar</button>
        <div class="card stack"><span class="label">Diagnóstico</span><h2>${d.t}</h2><p>${d.d}</p></div>
        <h3 style="margin:18px 4px 10px">Seu plano: comece por estas lições</h3>
        ${recs.map((l, i) => `<div class="card stack"><span class="label">${i === 0 ? 'Prioridade 1' : 'Depois'} · ${esc(mName(mentorOf(l)))}</span><h3>${esc(l.titulo)}</h3>
          <div class="act"><b>${EXLABEL[k]}</b>${esc(l.exemplos[k])}</div>
          <div class="row">${S.prog[l.id]?.status === 'aplicado' ? '<span class="st done">Já aplicada</span>' : S.prog[l.id]?.status === 'aplicando' ? '<span class="st">Em andamento</span>' : `<button class="btn g" data-accept="${l.id}">Começar esta missão</button>`}<a class="btn o" href="#licao-${l.id}">Ver lição</a></div></div>`).join('') || '<div class="empty">Ainda não há lições para esse tema.</div>'}
        <p class="muted" style="margin:12px 4px">As lições se baseiam em ideias públicas do Flávio Augusto e do Guto Galamba, sem falar em nome deles. Para decisões jurídicas, contábeis ou de investimento, procure um profissional.</p>`;
    }
    $('#v-mentor').innerHTML = h;
  },

  progresso() {
    $('#title').textContent = 'Seu progresso';
    const ap = L.filter(l => S.prog[l.id]?.status === 'aplicado');
    const cats = Object.entries(CAT).map(([k, t]) => { const ls = L.filter(l => l.categoria === k), d = ls.filter(l => S.prog[l.id]?.status === 'aplicado').length; return `<div><div class="row" style="justify-content:space-between"><span>${t}</span><span class="muted">${d}/${ls.length}</span></div><div class="progress"><i style="width:${ls.length ? d/ls.length*100 : 0}%"></i></div></div>`; }).join('');
    const refl = Object.entries(S.reflexoes).filter(([, r]) => r.texto).sort((a, b) => (b[1].at || '').localeCompare(a[1].at || ''));
    $('#v-progresso').innerHTML = `
      <div class="stats" style="margin-bottom:14px"><div class="stat"><div class="n">${ap.length}</div><div class="muted">aplicadas</div></div><div class="stat"><div class="n">${streak()}</div><div class="muted">dias seguidos</div></div><div class="stat"><div class="n">${L.length}</div><div class="muted">lições</div></div></div>
      <div class="card stack">${cats}</div>
      <div class="card stack"><span class="label">Diário de aplicação</span>${ap.length ? ap.sort((a, b) => (S.prog[b.id].at || '').localeCompare(S.prog[a.id].at || '')).map(l => `<a class="vid" href="#licao-${l.id}"><strong>${esc(l.titulo)}</strong><div class="muted">${fmt(S.prog[l.id].at)} · ${esc(S.prog[l.id].nota || 'sem anotação')}</div></a>`).join('') : '<p class="muted">Quando você concluir uma missão, ela aparece aqui com sua anotação.</p>'}</div>
      ${refl.length ? `<div class="card stack"><span class="label">Suas reflexões</span>${refl.slice(0, 10).map(([id, r]) => `<a class="vid" href="#licao-${id}"><strong>${esc(byId(id)?.pergunta || '')}</strong><div class="muted">${esc(r.texto)}</div></a>`).join('')}</div>` : ''}
      <div class="card stack"><span class="label">Vídeos analisados</span>${[...V].sort((a, b) => (b.data || '').localeCompare(a.data || '')).map(v => `<a class="vid" href="${yt(v.id)}" target="_blank" rel="noopener"><strong>${esc(v.titulo)}</strong><div class="muted">${esc(mName(v.mentor || 'flavio'))} · ${esc(v.canal)} · ${fmt(v.data)}</div></a>`).join('')}
        <span class="muted">Conteúdo atualizado em ${dataDate ? fmt(dataDate) : '—'}</span><button class="btn o w" data-check>Verificar lições novas</button></div>
      <div class="card stack"><span class="label">Configurações</span>
        <a class="btn o w" href="#perfil">Editar meu perfil</a>
        <button class="btn o w" data-pin>${S.pinHash ? 'Alterar ou remover PIN' : 'Proteger com PIN'}</button>
        <button class="btn o w" data-export>Baixar backup dos meus dados</button>
        <label class="btn o w" style="cursor:pointer">Restaurar backup<input type="file" accept="application/json" id="import" hidden></label>
        <p class="muted">Seus dados ficam só neste aparelho. Faça backup antes de trocar de celular ou limpar o navegador.</p></div>
      ${installCard()}`;
  },

  perfil() {
    $('#title').textContent = 'Meu perfil';
    const p = S.perfil || {};
    $('#v-perfil').innerHTML = `<form class="card stack" id="pform">
      <label class="f">Como quer ser chamado?<input id="pf_nome" value="${esc(p.nome || '')}" autocomplete="given-name"></label>
      <label class="f">Momento atual<select id="pf_mom">${MOMENTOS.map(([k, t]) => `<option value="${k}" ${p.momento === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Foco principal agora<select id="pf_foco"><option value="">Todos</option>${Object.entries(CAT).map(([k, t]) => `<option value="${k}" ${p.foco === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Mentores que quero seguir<select id="pf_ment"><option value="todos">Os dois</option>${Object.entries(MENT).map(([k, m]) => `<option value="${k}" ${p.mentor === k ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></label>
      <label class="f">Meu objetivo para os próximos 12 meses<input id="pf_obj" value="${esc(p.objetivo || '')}" placeholder="Ex.: faturar R$ 20 mil/mês com minha consultoria"></label>
      <button class="btn g w">Salvar</button></form>`;
  }
};


/* ---------- estudos (pacotes de livro, guardados só neste aparelho) ---------- */
S.livros ||= []; S.est ||= {};
const PACK = id => { try { return JSON.parse(localStorage.getItem('mv:pack:' + id)); } catch (e) { return null; } };
const NIVEL = {lembrar:'Lembrar', entender:'Entender', questionar:'Questionar', aplicar:'Aplicar', conectar:'Conectar'};
const INTERVAL = [0, 1, 3, 7, 14, 30, 60];
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
let capTab = 'entender', cardShow = false, revQueue = null;
const est = id => (S.est[id] ||= {resp:{}, pista:{}, refl:{}, qi:{}, cards:{}, quiz:{}, feitos:[], aplic:{}});
function dueCards(id, cn) {
  const pk = PACK(id); if (!pk) return [];
  const E = est(id), out = [], t = today();
  pk.capitulos.forEach(c => { if (cn != null && c.n !== cn) return; if (cn == null && !(E.iniciados || []).includes(c.n)) return; (c.flashcards || []).forEach((f, i) => { const k = c.n + ':' + i, st = E.cards[k]; if (!st || st.due <= t) out.push({k, c, f}); }); });
  return out;
}
function bookPct(id) { const pk = PACK(id); if (!pk) return 0; return Math.round(est(id).feitos.length / pk.capitulos.length * 100); }
function estudosHoje() {
  return S.livros.map(b => { const n = dueCards(b.id).length; return n ? `<div class="card row" style="justify-content:space-between"><div><div class="label">Revisão de estudo</div><strong>${esc(b.titulo)}</strong><div class="muted">${n} ${n === 1 ? 'cartão' : 'cartões'} para hoje</div></div><a class="btn g" href="#rev-${b.id}">Revisar</a></div>` : ''; }).join('');
}
function importPack(txt) {
  const pk = JSON.parse(txt);
  if (pk?.tipo !== 'mv-estudo' || !pk.id || !Array.isArray(pk.capitulos)) throw new Error('formato');
  localStorage.setItem('mv:pack:' + pk.id, JSON.stringify(pk));
  S.livros = S.livros.filter(b => b.id !== pk.id).concat([{id: pk.id, titulo: pk.titulo, autor: pk.autor || '', importado: today()}]);
  save(); return pk;
}
Object.assign(views, {
  estudos() {
    $('#title').textContent = 'Estudos';
    $('#v-estudos').innerHTML = `
      ${S.livros.length ? `<div class="list">${S.livros.map(b => { const n = dueCards(b.id).length, pc = bookPct(b.id); return `<a class="li" href="#livro-${b.id}" style="text-decoration:none;color:inherit"><div class="meta"><span class="label">${esc(b.autor)}</span>${n ? `<span class="st">${n} p/ revisar</span>` : ''}</div><h3>${esc(b.titulo)}</h3><div class="progress"><i style="width:${pc}%"></i></div><span class="muted">${pc}% concluído</span></a>`; }).join('')}</div>`
        : `<div class="card hero stack"><span class="label">Tutor socrático</span><h2>Estude livros capítulo por capítulo</h2><p>Cada capítulo vem com conceitos-chave, um diálogo socrático em que você pensa antes de ver a resposta, flashcards com revisão espaçada, um teste e um exercício de aplicação.</p></div>`}
      <div class="card stack"><span class="label">Adicionar um livro</span>
        <p class="muted">1. Envie o PDF do livro para o Claude, no chat. 2. Baixe o pacote de estudo (.json) que ele gerar. 3. Importe aqui. O pacote fica só neste aparelho.</p>
        <label class="btn g w" style="cursor:pointer">Importar pacote de estudo<input type="file" accept=".json,application/json" id="importPack" hidden></label></div>`;
  },
  livro(id) {
    const pk = PACK(id); if (!pk) { location.hash = '#estudos'; return; }
    $('#title').textContent = 'Estudos';
    const E = est(id), n = dueCards(id).length;
    $('#v-livro').innerHTML = `<a class="back" href="#estudos" style="display:inline-block;text-decoration:none">← Estudos</a>
      <div class="card stack"><span class="label">${esc(pk.autor || '')}</span><h2>${esc(pk.titulo)}</h2>${pk.mapa?.tese ? `<p>${esc(pk.mapa.tese)}</p>` : ''}
        <div class="progress"><i style="width:${bookPct(id)}%"></i></div><span class="muted">${E.feitos.length} de ${pk.capitulos.length} capítulos concluídos</span>
        ${n ? `<a class="btn g w" href="#rev-${id}">Revisar ${n} ${n === 1 ? 'cartão' : 'cartões'} de hoje</a>` : '<span class="muted">Nenhum cartão para revisar hoje.</span>'}</div>
      ${pk.mapa?.estrutura?.length ? `<div class="card"><span class="label">Mapa do livro</span>${pk.mapa.estrutura.map(x => `<details><summary>${esc(x.parte || x.titulo || '')}</summary><p>${esc(x.ideia || x.resumo || '')}</p></details>`).join('')}</div>` : ''}
      <div class="list">${pk.capitulos.map(c => `<a class="li" href="#cap-${id}~${c.n}" style="text-decoration:none;color:inherit"><div class="meta"><span class="label">Capítulo ${c.n}</span>${E.feitos.includes(c.n) ? '<span class="st done">Concluído</span>' : ''}</div><h3>${esc(c.titulo)}</h3></a>`).join('')}</div>
      <button class="btn o w" style="margin-top:14px" data-delbook="${id}">Remover este livro do aparelho</button>`;
  },
  cap(arg) {
    const [id, ns] = arg.split('~'), cn = +ns, pk = PACK(id), c = pk?.capitulos.find(x => x.n === cn);
    if (!c) { location.hash = '#estudos'; return; }
    $('#title').textContent = 'Capítulo ' + c.n;
    const E = est(id), K = c.n + ':';
    if (!(E.iniciados ||= []).includes(c.n)) { E.iniciados.push(c.n); save(); }
    const tabs = [['entender','Entender'],['dialogo','Diálogo'],['cards','Flashcards'],['teste','Teste'],['aplicar','Aplicar']];
    let body = '';
    if (capTab === 'entender') {
      body = `<div class="card stack"><span class="label">Resumo</span>${(c.resumo || '').split('\n').filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}</div>
        ${(c.conceitos || []).length ? `<div class="card"><span class="label">Conceitos-chave</span>${c.conceitos.map(k => `<details><summary>${esc(k.termo)}</summary><p>${esc(k.explicacao)}</p></details>`).join('')}</div>` : ''}
        <button class="btn g w" data-ctab="dialogo">Começar o diálogo socrático</button>`;
    } else if (capTab === 'dialogo') {
      const qs = c.socratico || [], qi = Math.min(E.qi[c.n] || 0, qs.length);
      if (qi >= qs.length) body = `<div class="card stack"><span class="label">Diálogo concluído</span><p>Você passou por todas as perguntas deste capítulo.</p><div class="row"><button class="btn g" data-ctab="cards">Ir para os flashcards</button><button class="btn o" data-qreset="${id}~${c.n}">Refazer o diálogo</button></div></div>`;
      else {
        const q = qs[qi], k = K + qi, np = E.pista[k] || 0, r = E.resp[k] || '', shown = E.refl[k];
        body = `<div class="card stack"><div class="row" style="justify-content:space-between"><span class="label">Pergunta ${qi + 1} de ${qs.length}</span><span class="st">${NIVEL[q.nivel] || esc(q.nivel || '')}</span></div>
          <h3>${esc(q.pergunta)}</h3>
          <textarea data-resp="${id}|${k}" placeholder="Pense e escreva com suas palavras antes de pedir ajuda">${esc(r)}</textarea>
          ${(q.pistas || []).slice(0, np).map((x, i) => `<div class="act"><b>Pista ${i + 1}</b>${esc(x)}</div>`).join('')}
          <div class="row">${np < (q.pistas || []).length ? `<button class="btn o" data-pista="${id}|${k}">Pedir uma pista</button>` : ''}
          ${shown ? '' : `<button class="btn g" data-refl2="${id}|${k}">Ver a reflexão do tutor</button>`}</div>
          ${shown ? `<div class="act"><b>Reflexão do tutor</b>${esc(q.reflexao)}</div><p class="muted">Compare com a sua resposta: o que você viu que o tutor não disse? O que faltou?</p><button class="btn g w" data-qnext="${id}~${c.n}">Próxima pergunta</button>` : '<span class="muted">A reflexão aparece depois que você escrever sua resposta.</span>'}</div>`;
      }
    } else if (capTab === 'cards') {
      const due = dueCards(id, c.n), all = (c.flashcards || []).length;
      body = due.length ? flashcard(id, due[0], due.length) : `<div class="card stack"><span class="label">Flashcards</span><p>Nenhum cartão deste capítulo para hoje (${all} no total). Eles voltam nas datas certas para fixar na memória.</p><button class="btn g w" data-ctab="teste">Fazer o teste</button></div>`;
    } else if (capTab === 'teste') {
      const qz = c.quiz || [], res = E.quiz[c.n] || {}, ans = res.ans || {};
      body = qz.map((q, i) => { const a = ans[i]; return `<div class="card stack"><span class="label">Questão ${i + 1}</span><h3>${esc(q.p)}</h3><div class="opts">${q.opcoes.map((o, j) => `<button class="opt" data-quiz="${id}~${c.n}~${i}~${j}" ${a != null ? 'disabled' : ''} aria-pressed="${a === j}" style="${a != null && j === q.certa ? 'border-color:var(--green);background:var(--mist)' : ''}">${esc(o)}${a === j ? (j === q.certa ? ' ✓' : ' ✗') : ''}</button>`).join('')}</div>${a != null ? `<p class="muted">${esc(q.explica || '')}</p>` : ''}</div>`; }).join('')
        + (Object.keys(ans).length === qz.length && qz.length ? `<div class="card stack"><strong>Você acertou ${qz.filter((q, i) => ans[i] === q.certa).length} de ${qz.length}.</strong><div class="row"><button class="btn o" data-quizreset="${id}~${c.n}">Refazer</button><button class="btn g" data-ctab="aplicar">Ir para a aplicação</button></div></div>` : '');
    } else {
      const done = E.feitos.includes(c.n);
      body = `<div class="card stack"><span class="label">Exercício de aplicação</span><p>${esc(c.aplicacao || '')}</p>
        <textarea data-aplic="${id}|${c.n}" placeholder="Como você vai aplicar isso na sua vida? Escreva o plano.">${esc(E.aplic[c.n] || '')}</textarea>
        ${done ? '<span class="st done">Capítulo concluído</span>' : `<button class="btn g w" data-capdone="${id}~${c.n}">Concluir capítulo</button>`}</div>`;
    }
    $('#v-cap').innerHTML = `<a class="back" href="#livro-${id}" style="display:inline-block;text-decoration:none">← ${esc(pk.titulo)}</a>
      <h2 style="margin:4px 4px 12px">${esc(c.titulo)}</h2>
      <div class="chips">${tabs.map(([k, t]) => `<button class="chip" data-ctab="${k}" aria-pressed="${capTab === k}">${t}</button>`).join('')}</div>${body}`;
  },
  rev(id) {
    const pk = PACK(id); if (!pk) { location.hash = '#estudos'; return; }
    $('#title').textContent = 'Revisão';
    const due = dueCards(id);
    $('#v-rev').innerHTML = `<a class="back" href="#livro-${id}" style="display:inline-block;text-decoration:none">← ${esc(pk.titulo)}</a>` + (due.length ? flashcard(id, due[0], due.length) : `<div class="card stack"><h2>Revisão em dia!</h2><p class="muted">Volte amanhã para os próximos cartões.</p></div>`);
  }
});
function flashcard(id, it, total) {
  return `<div class="card stack" style="min-height:240px"><div class="row" style="justify-content:space-between"><span class="label">Cap. ${it.c.n} · ${esc(it.c.titulo)}</span><span class="muted">${total} restantes</span></div>
    <h3 style="font-size:20px">${esc(it.f.f)}</h3>
    ${cardShow ? `<div class="act"><b>Resposta</b>${esc(it.f.v)}</div><p class="muted">Como foi?</p><div class="row"><button class="btn o" data-card="${id}|${it.k}|0">Errei</button><button class="btn o" data-card="${id}|${it.k}|1">Difícil</button><button class="btn g" data-card="${id}|${it.k}|2">Acertei</button></div>`
      : `<p class="muted">Responda mentalmente (ou em voz alta) antes de virar.</p><button class="btn g w" data-flip>Mostrar resposta</button>`}</div>`;
}
function studyClick(d) {
  if (d.ctab) { capTab = d.ctab; cardShow = false; route(); scrollTo(0, 0); return true; }
  if (d.pista) { const [id, k] = d.pista.split('|'), E = est(id); E.pista[k] = (E.pista[k] || 0) + 1; save(); route(); return true; }
  if (d.refl2) { const [id, k] = d.refl2.split('|'), E = est(id); if ((E.resp[k] || '').trim().length < 15) { toast('Escreva sua resposta primeiro. Pensar antes é o que fixa o aprendizado.'); return true; } E.refl[k] = true; logToday(); save(); route(); return true; }
  if (d.qnext) { const [id, n] = d.qnext.split('~'), E = est(id); E.qi[n] = (E.qi[n] || 0) + 1; save(); route(); scrollTo(0, 0); return true; }
  if (d.qreset) { const [id, n] = d.qreset.split('~'); est(id).qi[n] = 0; save(); route(); return true; }
  if (d.flip !== undefined) { cardShow = true; route(); return true; }
  if (d.card) { const [id, k, g] = d.card.split('|'), E = est(id), st = E.cards[k] || {box: 0}; const box = g === '0' ? 0 : g === '1' ? Math.max(1, st.box) : Math.min(st.box + 1, INTERVAL.length - 1); E.cards[k] = {box, due: addDays(g === '0' ? 1 : INTERVAL[box] || 1)}; cardShow = false; logToday(); save(); route(); return true; }
  if (d.quiz) { const [id, n, i, j] = d.quiz.split('~'), E = est(id); (E.quiz[n] ||= {ans: {}}).ans[i] = +j; logToday(); save(); route(); return true; }
  if (d.quizreset) { const [id, n] = d.quizreset.split('~'); est(id).quiz[n] = {ans: {}}; save(); route(); return true; }
  if (d.capdone) { const [id, n] = d.capdone.split('~'), E = est(id); if (!E.feitos.includes(+n)) E.feitos.push(+n); logToday(); save(); toast('Capítulo concluído!'); location.hash = '#livro-' + id; return true; }
  if (d.delbook) { if (S._del !== d.delbook) { S._del = d.delbook; toast('Toque de novo para confirmar a remoção.'); return true; } localStorage.removeItem('mv:pack:' + d.delbook); S.livros = S.livros.filter(b => b.id !== d.delbook); delete S.est[d.delbook]; delete S._del; save(); location.hash = '#estudos'; return true; }
  return false;
}

function status(p) { return p.status === 'aplicado' ? '<span class="st done">Aplicada</span>' : p.status === 'aplicando' ? '<span class="st">Em andamento</span>' : p.status === 'pausada' ? '<span class="st">Pausada</span>' : ''; }
function card(l) {
  const p = S.prog[l.id] || {};
  return `<a class="li" href="#licao-${l.id}" style="text-decoration:none;color:inherit"><div class="meta"><span class="label">${esc(mName(mentorOf(l)))} · ${CAT[l.categoria]}${news.includes(l.id) ? ' · nova' : ''}</span>${status(p)}</div><h3>${esc(l.titulo)}</h3><p class="muted">${esc(l.acao)}</p></a>`;
}
function installCard() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return '';
  if (deferredInstall) return `<div class="card stack"><span class="label">Instale o app</span><p class="muted">Tenha o Mentor na tela inicial, abrindo como aplicativo e funcionando sem internet.</p><button class="btn g w" data-install>Instalar</button></div>`;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return `<div class="card stack"><span class="label">Instale o app</span><p class="muted">No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div>`;
  return '';
}

/* ---------- rotas ---------- */
function route() {
  const h = (location.hash || '#hoje').slice(1);
  let name = h, arg = null;
  if (h.startsWith('licao-')) { name = 'licao'; arg = h.slice(6); }
  else if (h.startsWith('livro-')) { name = 'livro'; arg = h.slice(6); }
  else if (h.startsWith('cap-')) { name = 'cap'; arg = h.slice(4); if (route.cap !== arg) { capTab = 'entender'; cardShow = false; route.cap = arg; } }
  else if (h.startsWith('rev-')) { name = 'rev'; arg = h.slice(4); }
  if (!views[name]) name = 'hoje';
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + name));
  const tab = name === 'licao' ? 'biblioteca' : name === 'perfil' ? 'progresso' : ['livro', 'cap', 'rev'].includes(name) ? 'estudos' : name;
  document.querySelectorAll('nav.tabs a').forEach(a => a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const n = S.perfil?.nome; $('#hi').textContent = n ? `Olá, ${n}!` : 'Olá!';
  views[name](arg);
}
let lastHash = location.hash;
addEventListener('hashchange', () => { const toTop = !(lastHash.startsWith('#licao') && location.hash === '#biblioteca'); lastHash = location.hash; route(); if (toTop) scrollTo(0, 0); });

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-go]'); if (!t) return;
  const d = t.dataset;
  if (studyClick(d)) return;
  if (d.accept) accept(d.accept);
  else if (d.day) { const [id, i] = d.day.split(':'); toggleDay(id, +i); }
  else if (d.f) { filter = d.f; views.biblioteca(); }
  else if (d.mf) { mfilter = d.mf; views.biblioteca(); }
  else if (d.pm) { S.perfil = {...(S.perfil || {}), mentor: d.pm}; save(); views.mentor(); }
  else if (d.go === 'novas') { filter = 'novas'; location.hash = '#biblioteca'; }
  else if (d.back !== undefined) { history.length > 1 ? history.back() : (location.hash = '#biblioteca'); }
  else if (d.finish) finish(d.finish, ($('#nota')?.value || '').trim());
  else if (d.des) { mentor.desafio = d.des; mentor.step = S.perfil?.momento ? 3 : 2; mentor.momento = S.perfil?.momento || null; views.mentor(); scrollTo(0, 0); }
  else if (d.mom) { mentor.momento = d.mom; mentor.step = 3; views.mentor(); scrollTo(0, 0); }
  else if (d.mstep) { mentor.step = +d.mstep; views.mentor(); }
  else if (d.check !== undefined) loadData(true);
  else if (d.export !== undefined) exportData();
  else if (d.pin !== undefined) openLock(S.pinHash ? 'change' : 'create');
  else if (d.install !== undefined && deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; route(); }); }
});
let reflTimer;
document.addEventListener('input', e => {
  if (e.target.id === 'search') { search = e.target.value; clearTimeout(reflTimer); reflTimer = setTimeout(() => { const pos = e.target.selectionStart; views.biblioteca(); const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos); }, 250); }
  else if (e.target.dataset.resp || e.target.dataset.aplic) { const [id, k] = (e.target.dataset.resp || e.target.dataset.aplic).split('|'), v = e.target.value, isA = !!e.target.dataset.aplic; clearTimeout(reflTimer); reflTimer = setTimeout(() => { const E = est(id); (isA ? E.aplic : E.resp)[k] = v; save(); }, 400); }
  else if (e.target.dataset.refl) { const id = e.target.dataset.refl, v = e.target.value; clearTimeout(reflTimer); reflTimer = setTimeout(() => { S.reflexoes[id] = {texto: v, at: today()}; if (v.trim()) logToday(); save(); }, 500); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'pform') {
    e.preventDefault();
    S.perfil = {nome: $('#pf_nome').value.trim(), momento: $('#pf_mom').value, foco: $('#pf_foco').value, objetivo: $('#pf_obj').value.trim(), mentor: $('#pf_ment').value}; mfilter = null;
    save(); toast('Perfil salvo.'); location.hash = '#hoje';
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'importPack' && e.target.files[0]) { e.target.files[0].text().then(txt => { const pk = importPack(txt); toast('Livro importado: ' + pk.titulo); location.hash = '#livro-' + pk.id; }).catch(err => toast(err?.name === 'QuotaExceededError' ? 'Sem espaço no aparelho para este livro.' : 'Arquivo de estudo inválido.')); return; }
  if (e.target.id !== 'import' || !e.target.files[0]) return;
  e.target.files[0].text().then(txt => {
    const d = JSON.parse(txt);
    if (!d || typeof d !== 'object' || !d.prog) throw new Error('formato');
    const pin = S.pinHash; (d.pacotes || []).forEach(pk => { try { localStorage.setItem('mv:pack:' + pk.id, JSON.stringify(pk)); } catch (err) {} }); delete d.pacotes;
    S = {...d, pinHash: pin}; S.prog ||= {}; S.reflexoes ||= {}; S.log ||= []; S.livros ||= []; S.est ||= {};
    save(); toast('Backup restaurado.'); route();
  }).catch(() => toast('Arquivo de backup inválido.'));
});
function exportData() {
  const {pinHash, ...data} = S;
  data.pacotes = S.livros.map(b => PACK(b.id)).filter(Boolean);
  const blob = new Blob([JSON.stringify({...data, exportadoEm: new Date().toISOString()}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mentor-de-valor-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- PIN ---------- */
async function hash(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mv:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 0; for (const c of 'mv:' + s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}
let lockMode = 'unlock', firstPin = '';
function openLock(mode) {
  lockMode = mode; firstPin = '';
  const msg = {unlock:'Digite seu PIN', create:'Crie um PIN para proteger seu progresso', change:'Digite um novo PIN (ou deixe vazio para remover)'}[mode];
  $('#lockMsg').textContent = msg; $('#lockBtn').textContent = mode === 'unlock' ? 'Entrar' : 'Continuar';
  $('#lockSkip').hidden = mode === 'unlock'; $('#lockSkip').textContent = mode === 'create' && !S.onboarded ? 'Usar sem PIN' : 'Cancelar';
  $('#pin').value = ''; $('#lock').classList.add('on'); setTimeout(() => $('#pin').focus(), 50);
}
$('#lockForm').addEventListener('submit', async e => {
  e.preventDefault(); const v = $('#pin').value.trim();
  if (lockMode === 'unlock') {
    if (await hash(v) === S.pinHash) { sessionStorage.setItem('mv:ok', '1'); $('#lock').classList.remove('on'); }
    else { $('#lockMsg').textContent = 'PIN incorreto. Tente de novo.'; $('#pin').value = ''; }
    return;
  }
  if (lockMode === 'change' && !v) { delete S.pinHash; S.onboarded = true; save(); $('#lock').classList.remove('on'); toast('PIN removido.'); route(); return; }
  if (!/^\d{4,8}$/.test(v)) { $('#lockMsg').textContent = 'Use de 4 a 8 números.'; return; }
  if (!firstPin) { firstPin = v; $('#pin').value = ''; $('#lockMsg').textContent = 'Confirme o PIN'; return; }
  if (v !== firstPin) { firstPin = ''; $('#pin').value = ''; $('#lockMsg').textContent = 'Os PINs não conferem. Digite de novo.'; return; }
  S.pinHash = await hash(v); S.onboarded = true; save(); sessionStorage.setItem('mv:ok', '1');
  $('#lock').classList.remove('on'); toast('PIN salvo.'); route();
});
$('#lockSkip').addEventListener('click', () => { S.onboarded = true; save(); $('#lock').classList.remove('on'); });

/* ---------- dados ---------- */
async function loadData(manual) {
  try {
    const [a, b] = await Promise.all([fetch('data/licoes.json', {cache: 'no-store'}), fetch('data/videos.json', {cache: 'no-store'})]);
    if (!a.ok || !b.ok) throw new Error('http');
    const dl = await a.json(), dv = await b.json();
    const before = L.length;
    L = (dl.licoes || []).sort((x, y) => (y.data || '').localeCompare(x.data || '') || (x.ordem || 0) - (y.ordem || 0));
    V = dv.videos || []; if (dv.mentores) MENT = dv.mentores; dataDate = dl.atualizado || '';
    if (!S.seen) { S.seen = L.map(l => l.id); save(); }
    news = L.filter(l => !S.seen.includes(l.id)).map(l => l.id);
    if (manual) toast(news.length ? `${news.length} ${news.length === 1 ? 'lição nova' : 'lições novas'}!` : 'Você já tem todas as lições.');
    else if (before && L.length > before) toast('Novas lições chegaram.');
  } catch (e) {
    if (manual) toast('Sem conexão. Mostrando as lições salvas.');
    if (!L.length) $('main').insertAdjacentHTML('afterbegin', '<div class="empty">Não consegui carregar as lições. Abra o app com internet ao menos uma vez.</div>');
  }
  route();
}

addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; route(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && hadController) { reloaded = true; toast('App atualizado.'); } });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && L.length) loadData(false); });

if (S.pinHash && !sessionStorage.getItem('mv:ok')) openLock('unlock');
else if (!S.onboarded) openLock('create');
route();
loadData(false);
}
