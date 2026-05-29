Antes de qualquer implementação, você precisa seguir uma regra obrigatória:

1. Sempre analisar o Black Edge e o comportamento real do aplicativo antes de mexer em código.
2. Não pode existir dado fake, mock ou inventado em nenhum ponto do sistema.
3. Todo dado usado (usuário, stream, gift, chat) deve vir exclusivamente do backend real ou do fluxo existente do app.
4. O sistema já está em produção funcional — então qualquer alteração deve respeitar o comportamento atual observado no Black Edge.

Se não estiver no fluxo real do aplicativo, não deve ser implementado.

Objetivo: manter 100% fidelidade ao comportamento real do sistema de transmissão ao vivo.