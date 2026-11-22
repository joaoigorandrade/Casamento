# Casamento Verônica & João Igor

Site de casamento — 28 de maio de 2027, Belo Horizonte.

Implementação do projeto de design [Site de casamento japonês](https://claude.ai/design/p/49cfb569-d466-4e2b-b77b-e64a1c6a6357),
que tem duas telas: `Casamento Verônica & João Igor.dc.html` (desktop) e
`Casamento Verônica & João Igor - Mobile.dc.html` (mobile). As duas foram unidas aqui em
uma única página responsiva — abaixo de 760px vale o layout mobile, acima dele o de desktop.

## ✋ O que falta você fazer antes de publicar

Tudo está preenchido com dados de exemplo que já ficam bonitos. Procure por `✋ VOCÊ` no código —
cada ponto tem um comentário dizendo exatamente o que trocar.

| # | O quê | Onde |
|---|-------|------|
| 1 | **Confirmações de presença chegarem até vocês.** Hoje o formulário agradece mas a resposta fica só no celular do convidado. Siga o passo a passo (planilha do Google, ~10 min) e cole a URL em `CONFIG.rsvpEndpoint`. | `scripts/rsvp-apps-script.gs` → `scripts/site.js` |
| 2 | **Titular e banco do Pix** — o nome exatamente como o banco mostra na hora do Pix. (A chave já é o celular (31) 99269-6270.) | `CONFIG.pixHolder` / `pixBank` em `scripts/site.js` |
| 3 | **Domínio final** nas tags de compartilhamento (WhatsApp) e no `CONFIG.siteUrl`. Depois de publicar, rode o link em developers.facebook.com/tools/debug → "Scrape Again". | `<head>` do `index.html` e `scripts/site.js` |
| 4 | *(Opcional)* legendas da galeria — dá para pôr o ano de cada viagem. | `index.html`, seção "Nossa história" |

Fotos escolhidas: o pôr do sol na "Nossa história"; Trevi, Mont Blanc e o anel no Vaticano na
galeria. Para trocar, salve outra foto com o mesmo nome em `assets/img/`.

## Como rodar

Site estático, sem build:

```bash
python3 -m http.server 8777
# http://localhost:8777
```

- O envelope de abertura aparece só na primeira visita. Para vê-lo de novo, limpe o
  `localStorage` do site ou abra numa janela anônima. `?nointro` pula o envelope.
- `?agora=2027-05-28T18:00` simula outro momento: no dia o contador vira "É hoje!", e depois
  vira "Casados & felizes".

Para publicar na Vercel, basta `vercel deploy` na raiz. O `.vercelignore` deixa de fora as artes
originais, os testes e as notas.

## Testes

Testes de movimento e de comportamento (Chromium headless em tamanho de celular):

```bash
npm install
npm test
```

## Estrutura

```
index.html                 página única, com todas as seções
styles/classical.css       design system "Classical" (tokens + componentes), vindo do projeto de design
styles/site.css            estilos da página; o bloco @media (max-width:759.98px) é o layout mobile
styles/motion.css          animações (inclusive o envelope de abertura)
scripts/site.js            CONFIG, envelope, contagem, abas, Pix, RSVP, agenda, compartilhar, menu
scripts/motion.js          rolagem suave, revelações, parallax, pétalas e dígitos que rolam
scripts/rsvp-apps-script.gs  código para colar no Google Apps Script (não vai para o site)
tests/                     testes (npm test)
assets/casal.png           ilustração do casal — também sprite do monograma e dos ornamentos
assets/favicon.svg         ícone da aba (monograma)
assets/img/                imagens servidas: fotos, selo do envelope, og.jpg (prévia do WhatsApp), ícone
assets/arte-*, selo.jpeg   artes originais do convite (referência; não são publicadas)
```

`styles/classical.css` é cópia de `_ds/classical-b096fc7a-42de-4471-bef5-5bbbe08014aa/styles.css`,
com uma diferença: as fontes (com os itálicos verdadeiros) são carregadas por `<link>` no `<head>`
em vez de `@import`, para chegarem mais cedo.
Mudanças de aparência devem sair dos tokens no topo dos arquivos de estilo, não de valores soltos.

### Acabamento "papel de convite"

- `--grain` (em `site.css`) é a textura de linho, aplicada ao fundo e às superfícies de papel.
- `.stamp` recorta as bordas em picote de selo (fotos e cartão do traje). `--r` é o raio da mordida
  e `--d` o espaçamento.
- O anel pontilhado em volta do oval do topo é o `.hero__oval::before`.

### Sprite de `casal.png`

O monograma do topo e os ornamentos (flor vermelha e estrela laranja) são recortes da mesma
imagem, via `background-position`. Em `site.css` cada recorte é uma classe (`.mark--monogram`,
`.mark--flower`, `.mark--burst`) parametrizada pela variável `--mk`, que define a largura
renderizada; altura, `background-size` e offsets saem dela por proporção.
