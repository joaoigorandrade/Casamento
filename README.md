# Casamento Verônica & João Igor

Site de casamento — 28 de maio de 2027, Belo Horizonte.

Implementação do projeto de design [Site de casamento japonês](https://claude.ai/design/p/49cfb569-d466-4e2b-b77b-e64a1c6a6357),
que tem duas telas: `Casamento Verônica & João Igor.dc.html` (desktop) e
`Casamento Verônica & João Igor - Mobile.dc.html` (mobile). As duas foram unidas aqui em
uma única página responsiva — abaixo de 760px vale o layout mobile, acima dele o de desktop.

## Como rodar

Site estático, sem build e sem dependências:

```bash
python3 -m http.server 8777
# http://localhost:8777
```

Para publicar na Vercel, basta `vercel deploy` na raiz — não há configuração a fazer.

## Estrutura

```
index.html            página única, com todas as seções
styles/classical.css  design system "Classical" (tokens + componentes), vindo do projeto de design
styles/site.css       estilos da página; o bloco @media (max-width:759.98px) é o layout mobile
scripts/site.js       contagem regressiva, abas dos locais, modal de Pix, RSVP e menu mobile
assets/casal.png      ilustração do casal — também serve de sprite para o monograma e os ornamentos
assets/selo.jpeg      selo do convite (não usado na página; mantido como referência)
uploads/              artes de referência do convite, como enviadas ao projeto de design
```

`styles/classical.css` é cópia fiel de `_ds/classical-b096fc7a-42de-4471-bef5-5bbbe08014aa/styles.css`.
Mudanças de aparência devem sair dos tokens no topo dos dois arquivos de estilo, não de valores soltos.

### Sprite de `casal.png`

O monograma do topo e os ornamentos (flor vermelha e estrela laranja) são recortes da mesma
imagem, via `background-position`. Em `site.css` cada recorte é uma classe (`.mark--monogram`,
`.mark--flower`, `.mark--burst`) parametrizada pela variável `--mk`, que define a largura
renderizada; altura, `background-size` e offsets saem dela por proporção.

## Pendências antes de publicar

Três coisas vêm do design como marcador de posição e precisam de valor real:

1. **Chave Pix** — `CONFIG.pixKey` em `scripts/site.js` está como `casamento.vj@email.com`.
2. **Foto do casal** — a seção "Nossa história" tem um espaço reservado no lugar da foto.
   Troque o `<figure class="plate story__photo story__photo--empty">` em `index.html` por
   `<figure class="plate story__photo"><img src="assets/foto-casal.jpg" alt="Verônica e João Igor"></figure>`.
3. **RSVP** — o formulário é só client-side, como no design: ao enviar, mostra o agradecimento
   e **não guarda nada**. O ponto de integração está marcado em `scripts/site.js`
   (`// NOTE: the design has no backend`). É preciso um endpoint (ou uma planilha/serviço)
   para as confirmações realmente chegarem.

A data e o horário da cerimônia usados na contagem regressiva estão em `CONFIG.weddingAt`.
