// Sorteador de nomes (/sorteador-de-nomes). Roda só no navegador: a lista não
// é enviada nem guardada. Sem dependências: a página sai sem o JavaScript do
// app (scripts/postexport.mjs) e carrega só este arquivo. Marcação em
// src/content/ferramentas/sorteador-de-nomes.html; estilos em src/app/+html.tsx.
(function () {
  'use strict';

  /** Nomes válidos: um por linha, sem espaços nas pontas, sem linhas vazias. */
  function nomes(texto) {
    return String(texto)
      .split(/\r?\n/)
      .map(function (l) { return l.replace(/\t+/g, ' ').trim(); })
      .filter(Boolean);
  }

  /** Inteiro uniforme em [0, n), com crypto.getRandomValues (sem viés de módulo). */
  function aleatorio(n) {
    var limite = Math.floor(0x100000000 / n) * n;
    var buf = new Uint32Array(1);
    do crypto.getRandomValues(buf); while (buf[0] >= limite);
    return buf[0] % n;
  }

  /** Fisher–Yates: cópia embaralhada. */
  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = aleatorio(i + 1);
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Sorteia `qtd` itens da lista, sem repetir item (nome repetido na lista conta duas vezes). */
  function sortear(lista, qtd) {
    return embaralhar(lista).slice(0, Math.max(0, Math.min(qtd, lista.length)));
  }

  /** Lista sem os sorteados: tira uma ocorrência para cada nome sorteado. */
  function semSorteados(lista, sorteados) {
    var resto = lista.slice();
    sorteados.forEach(function (n) {
      var i = resto.indexOf(n);
      if (i >= 0) resto.splice(i, 1);
    });
    return resto;
  }

  function textoResultado(sorteados) {
    return sorteados.map(function (n, i) { return i + 1 + 'º ' + n; }).join('\n');
  }

  var api = { nomes: nomes, aleatorio: aleatorio, embaralhar: embaralhar, sortear: sortear, semSorteados: semSorteados, textoResultado: textoResultado };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  var CORES = ['#F6E3DC', '#EFE0EA', '#E3E9F6', '#E2F0EA', '#F3EEDC', '#ECE8F5'];
  var ROTULOS_MAX = 30;

  function medir(evento, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', evento, params);
    } catch (e) {}
  }

  function iniciar(raiz) {
    if (raiz.getAttribute('data-pronto')) return;
    raiz.setAttribute('data-pronto', '1');
    var $ = function (s) { return raiz.querySelector('[data-' + s + ']'); };
    var campo = $('lista');
    var contador = $('contador');
    var qtd = $('qtd');
    var tudo = $('tudo');
    var aviso = $('aviso');
    var roda = $('roda');
    var canvas = $('canvas');
    var resultado = $('resultado');
    var lista = $('nomes');
    var copiar = $('copiar');
    var ultimos = [];
    var ultimoModo = 'lista';
    var girando = false;
    var giro = 0;

    function atual() { return nomes(campo.value); }

    function atualizar() {
      var n = atual().length;
      contador.textContent = n === 1 ? '1 nome' : n + ' nomes';
      qtd.max = String(Math.max(1, n));
      qtd.disabled = tudo.checked;
    }

    function avisar(texto) { aviso.textContent = texto || ''; }

    function mostrar(sorteados) {
      ultimos = sorteados;
      lista.innerHTML = '';
      sorteados.forEach(function (nome, i) {
        var li = document.createElement('li');
        var pos = document.createElement('span');
        pos.className = 'sorteador-pos';
        pos.textContent = i + 1 + 'º';
        li.appendChild(pos);
        li.appendChild(document.createTextNode(' ' + nome));
        lista.appendChild(li);
      });
      resultado.hidden = false;
      copiar.textContent = 'Copiar resultado';
    }

    function quantidade(total) {
      if (tudo.checked) return total;
      var q = parseInt(qtd.value, 10);
      if (!(q >= 1)) q = 1;
      if (q > total) {
        avisar('A lista tem ' + total + (total === 1 ? ' nome' : ' nomes') + '; sorteamos todos.');
        q = total;
        qtd.value = String(total);
      }
      return q;
    }

    function porLista() {
      if (girando) return;
      var todos = atual();
      avisar('');
      if (!todos.length) return avisar('Cole pelo menos um nome, um por linha.');
      roda.hidden = true;
      ultimoModo = 'lista';
      mostrar(sortear(todos, quantidade(todos.length)));
      medir('sorteador_usado', { modo: tudo.checked ? 'embaralhar' : 'lista', nomes: todos.length });
    }

    function desenhar(itens, rotacao) {
      var dpr = window.devicePixelRatio || 1;
      var lado = Math.min(320, raiz.clientWidth || 320);
      if (canvas.width !== Math.round(lado * dpr)) {
        canvas.width = Math.round(lado * dpr);
        canvas.height = Math.round(lado * dpr);
        canvas.style.width = lado + 'px';
        canvas.style.height = lado + 'px';
      }
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var r = lado / 2;
      var n = itens.length;
      var fatia = (Math.PI * 2) / n;
      ctx.clearRect(0, 0, lado, lado);
      for (var i = 0; i < n; i++) {
        // fatia i começa no ponteiro (topo) e segue no sentido horário
        var ini = -Math.PI / 2 + rotacao + i * fatia;
        var cor = CORES[i % CORES.length];
        if (i === n - 1 && n > 1 && cor === CORES[0]) cor = CORES[1];
        ctx.beginPath();
        ctx.moveTo(r, r);
        ctx.arc(r, r, r - 2, ini, ini + fatia);
        ctx.closePath();
        ctx.fillStyle = cor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (n <= ROTULOS_MAX) {
          var nome = itens[i].length > 16 ? itens[i].slice(0, 15) + '…' : itens[i];
          var meio = ini + fatia / 2;
          // na metade esquerda o texto vira de ponta-cabeça: gira meia volta e escreve do outro lado
          var esquerda = Math.cos(meio) < 0;
          ctx.save();
          ctx.translate(r, r);
          ctx.rotate(esquerda ? meio + Math.PI : meio);
          ctx.textAlign = esquerda ? 'left' : 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#111418';
          ctx.font = '600 ' + (n > 16 ? 11 : 14) + 'px Figtree, system-ui, sans-serif';
          ctx.fillText(nome, esquerda ? -(r - 14) : r - 14, 0);
          ctx.restore();
        }
      }
      ctx.beginPath();
      ctx.arc(r, r, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#C63D24';
      ctx.fill();
    }

    function porRoleta() {
      if (girando) return;
      var todos = atual();
      avisar('');
      if (todos.length < 2) return avisar('A roleta precisa de pelo menos dois nomes.');
      var n = todos.length;
      var fatia = (Math.PI * 2) / n;
      var vencedor = aleatorio(n);
      var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // a fatia do vencedor para sob o ponteiro, num ponto qualquer dela (longe das bordas)
      var dentro = (0.15 + 0.7 * (aleatorio(1000) / 1000)) * fatia;
      var alvo = -(vencedor * fatia + dentro);
      var voltas = calmo ? 1 : 5 + aleatorio(3);
      var base = giro % (Math.PI * 2);
      // gira no sentido horário: o ângulo só cresce até o alvo, depois de algumas voltas
      var fim = alvo;
      while (fim < base + voltas * Math.PI * 2) fim += Math.PI * 2;
      var duracao = calmo ? 400 : 4500;
      var t0 = null;
      roda.hidden = false;
      resultado.hidden = true;
      girando = true;
      ultimoModo = 'roleta';
      if (n > ROTULOS_MAX) avisar('Com mais de ' + ROTULOS_MAX + ' nomes, a roleta gira sem os nomes escritos.');
      function quadro(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / duracao);
        var ease = 1 - Math.pow(1 - p, 3);
        giro = base + (fim - base) * ease;
        desenhar(todos, giro);
        if (p < 1) return requestAnimationFrame(quadro);
        girando = false;
        mostrar([todos[vencedor]]);
      }
      requestAnimationFrame(quadro);
      medir('sorteador_usado', { modo: 'roleta', nomes: n });
    }

    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-sortear')) porLista();
      else if (b.hasAttribute('data-roleta')) porRoleta();
      else if (b.hasAttribute('data-denovo')) (ultimoModo === 'roleta' ? porRoleta : porLista)();
      else if (b.hasAttribute('data-copiar')) {
        var texto = textoResultado(ultimos);
        var ok = function () { copiar.textContent = 'Copiado!'; };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, function () { avisar('Não deu para copiar. Selecione o resultado e copie.'); });
        else avisar('Não deu para copiar. Selecione o resultado e copie.');
      } else if (b.hasAttribute('data-tirar')) {
        if (girando || !ultimos.length) return;
        var antes = atual();
        var resto = semSorteados(antes, ultimos);
        campo.value = resto.join('\n');
        atualizar();
        var tirados = antes.length - resto.length;
        avisar(tirados === 1 ? '1 nome tirado da lista.' : tirados + ' nomes tirados da lista.');
        ultimos = [];
        resultado.hidden = true;
        roda.hidden = true;
      }
    });
    campo.addEventListener('input', atualizar);
    tudo.addEventListener('change', atualizar);
    atualizar();
  }

  function iniciarTodas() {
    var raizes = document.querySelectorAll('[data-ferramenta="sorteador-de-nomes"]');
    for (var i = 0; i < raizes.length; i++) iniciar(raizes[i]);
  }

  window.AOJFerramentas = window.AOJFerramentas || {};
  window.AOJFerramentas['sorteador-de-nomes'] = iniciarTodas;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarTodas);
  else iniciarTodas();
})();
