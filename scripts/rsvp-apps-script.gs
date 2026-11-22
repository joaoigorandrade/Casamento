/* ✋ VOCÊ — Como fazer as confirmações de presença chegarem numa planilha do Google
   (grátis, uns 10 minutos, só uma vez). Este arquivo NÃO vai para o site; ele é colado no Google.

   1. Crie uma planilha nova em https://sheets.new e dê um nome, ex.: "RSVP Casamento".
   2. Na primeira linha (cabeçalho), escreva exatamente, uma palavra por coluna, de A a H:
        enviadoEm | nome | vai | acomp | tel | rest | msg | pagina
   3. Menu Extensões → Apps Script. Apague o que estiver lá e cole TODO o código abaixo
      (da linha "function doPost" até o fim). Clique no disquete para salvar.
   4. Clique em "Implantar" → "Nova implantação" → engrenagem → "App da Web".
        - Descrição: RSVP
        - Executar como: Eu (seu e-mail)
        - Quem pode acessar: Qualquer pessoa
      Clique em "Implantar" e autorize com a sua conta Google (vai aparecer um aviso de
      "app não verificado": clique em "Avançado" → "Acessar RSVP (não seguro)" — é o seu próprio script).
   5. Copie a "URL do app da Web" (termina em /exec) e cole em scripts/site.js, no campo
      CONFIG.rsvpEndpoint, entre as aspas.
   6. Publique o site, abra-o no celular, envie uma confirmação de teste e veja a linha
      aparecer na planilha. Depois apague a linha de teste.

   Se um dia mudar este código, use "Implantar" → "Gerenciar implantações" → lápis →
   Versão: "Nova versão". A URL continua a mesma.

   Dica: para receber um e-mail a cada resposta, descomente a linha MailApp dentro do doPost,
   troque o e-mail, salve e faça "Nova versão" como explicado acima. */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const p = e.parameter;
  sheet.appendRow(headers.map((h) => p[h] || ''));

  // Descomente a linha abaixo (tire as duas barras) para receber um e-mail a cada confirmação:
  // MailApp.sendEmail('seu-email@gmail.com', 'RSVP: ' + p.nome + (p.vai === 'nao' ? ' (não vai)' : ' +' + p.acomp), JSON.stringify(p, null, 2));

  return ContentService.createTextOutput('ok');
}
