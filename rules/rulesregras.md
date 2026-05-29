 REGRA OBRIGATÓRIA DE DESENVOLVIMENTO (MODEL USAGE ENFORCEMENT)

1. Nenhum model, variável, service ou classe pode ser criado sem estar imediatamente integrado no fluxo da aplicação.

2. Sempre que um Model (ex: Mongoose) for declarado, ele deve obrigatoriamente ser utilizado em pelo menos uma das seguintes camadas:
   - Controller
   - Service
   - Repository
   - Fluxo de evento (WebSocket / API / job)

3. É proibido deixar código com warning de "declared but never used" (TS6133).
   Se isso ocorrer, o código deve ser considerado incompleto e inválido.

4. Antes de criar qualquer novo código, deve-se garantir:
   - Onde será usado
   - Qual fluxo consome ele
   - Como ele se conecta ao sistema existente

5. Não é permitido criar código isolado, morto ou sem referência funcional dentro do sistema.

6. Todo Model criado (ex: Streamer, Message, Followers, Friendship, UserLevel) deve ser conectado obrigatoriamente ao fluxo real da aplicação no momento da criação.

7. Código sem integração funcional imediata é considerado erro de arquitetura e não pode ser aceito.

OBJETIVO:
Evitar código morto, manter consistência do sistema e garantir que toda criação tenha impacto real na aplicação.