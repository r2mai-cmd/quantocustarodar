# Quanto Custa Rodar?

Site estático para `https://quantocustarodar.com.br/`.

## O que esta versão faz
- Interface de comparação lado a lado para até 4 veículos.
- Carrega a base PBEV 2026 em CSV no navegador.
- Usa consumo/autonomia do PBEV para calcular custo por km e gasto mensal/anual de energia/combustível.
- Permite preço de gasolina, etanol, energia, energia solar, estado e km/mês.
- Abre uma ficha técnica lateral com os dados disponíveis no PBEV.
- Mostra um veredito de menor custo calculável e ponto de equilíbrio quando existem custos fixos comparáveis.

## Fontes
- INMETRO PBEV 2026: https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular
- FIPE: https://www.fipe.org.br/pt-br/indices/veiculos
- Portal IPVA RS: https://www.ipva.rs.gov.br/

A página **não inventa** preço FIPE, manutenção, seguro ou depreciação. Esses dados precisam ser integrados por fontes próprias antes de aparecerem como fatos no TCO.

## Observação sobre a base PBEV
O arquivo carregado pelo front-end é um CSV público derivado da tabela PBEV 2026. O site sempre aponta a página oficial do Inmetro como fonte primária. A tabela oficial pode receber atualizações; a quantidade de registros carregada pelo navegador é exibida na interface.

## Publicação
Suba `index.html`, `styles.css`, `app.js`, `logo.svg`, `hero-car.svg` e `.nojekyll` no root da branch `main` do GitHub Pages.
