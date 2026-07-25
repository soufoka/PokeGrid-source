# Contribuindo com o PokeGrid

O PokeGrid aceita contribuições pequenas, revisáveis e ligadas a uma necessidade
real do usuário.

## Onde o trabalho vive

Use o [GitHub Issues](../../issues) para bugs, melhorias, investigações e dívida
técnica. Antes de começar:

1. procure um ticket existente;
2. confirme o comportamento esperado;
3. avise no ticket que vai assumir;
4. crie uma branch `issue-N/descricao-curta`.

Para mudanças simples de documentação, uma issue é opcional. Para comportamento,
segurança, armazenamento ou arquitetura, ela é obrigatória.

## Pull request

O PR deve:

- apontar para a issue com `Closes #N`;
- explicar o problema do ponto de vista do usuário;
- separar o que mudou do que ficou deliberadamente fora;
- listar as verificações executadas;
- incluir imagem ou vídeo quando houver mudança visual;
- declarar riscos de dados locais, segurança, desempenho e compatibilidade.

Evite misturar refatoração extensa com uma nova funcionalidade. O
`index.html` concentra grande parte do produto e deve ser alterado com escopo
especialmente controlado.

## Regras essenciais

- Não envie credenciais, cookies, tokens, dumps ou dados pessoais.
- Não automatize captcha nem ações de jogo.
- Não reduza o isolamento dos painéis ou a proteção de credenciais.
- Preserve Windows, macOS e Linux, ou indique claramente a limitação.
- Mantenha português e inglês; espanhol também deve ser atualizado quando a
  mudança tocar textos existentes.

Leia também [AGENTS.md](AGENTS.md) e
[docs/COLLABORATION.md](docs/COLLABORATION.md).
