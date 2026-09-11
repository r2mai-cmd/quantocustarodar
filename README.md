# Quanto Custa Rodar?

Site estático do projeto **Quanto Custa Rodar?** — uma ferramenta para comparar carros pelo custo real de uso.

## O que já existe neste protótipo

- Landing page responsiva
- Comparação de 2 a 4 carros
- Perfil de uso: km/mês, gasolina, energia, solar, estado e horizonte
- Resultado de custo total estimado
- Custo por km
- Custo de energia/combustível
- Manutenção, seguro, IPVA e depreciação como componentes separados
- Identificação da opção de menor TCO
- Estrutura pronta para GitHub Pages
- Sem backend e sem build obrigatório

## Importante

Os números dos veículos nesta primeira versão são **demonstrativos**. Não publicar como se fossem dados oficiais.

A próxima etapa deve substituir `app.js` por uma base estruturada com:

1. PBE Veicular/Inmetro 2026
2. Preços oficiais/mercado com fonte e data
3. IPVA por UF
4. Regras específicas para elétricos, híbridos e PHEV
5. Manutenção com metodologia transparente
6. Seguro como estimativa, deixando clara a metodologia
7. Depreciação por modelo/versão
8. WLTP e CLTC quando disponíveis
9. Cenários de carregamento público, residencial e solar
10. Página individual por modelo

## Publicar no GitHub Pages

1. Crie um repositório, por exemplo `quanto-custa-rodar`.
2. Suba `index.html`, `styles.css` e `app.js`.
3. No GitHub: **Settings → Pages**.
4. Em *Build and deployment*, escolha **Deploy from a branch**.
5. Selecione `main` e `/ (root)`.
6. Salve.

## Fonte inicial

O PBE Veicular é a principal fonte oficial para consumo e eficiência no Brasil:

https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular

A página do Inmetro informa que a tabela PBEV 2026 foi atualizada em 31/08/2026. A atualização de agosto reúne 43 marcas e 959 modelos/versões.

## Próximo passo recomendado

Transformar o protótipo em produto real começando pela ingestão do CSV/PBEV e por um modelo de dados único para cada versão de veículo. Isso evita criar centenas de páginas manuais e permite gerar comparações consistentes.

## Licença

Uso privado/projeto próprio. Defina uma licença antes de tornar o repositório público.
