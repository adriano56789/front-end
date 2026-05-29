# 🌐 Regras Globais – Integração SRS e Segurança de Código

## 📋 Etapa 1: Controle de Escopo (OBRIGATÓRIO)

### 1.1 Regra de Escopo Exato
- **Quando uma tarefa for atribuída**: Você DEVE modificar apenas exatamente o que foi solicitado
- **Proibido**: NÃO refatore, otimize ou altere partes do código que não estão relacionadas
- **Pós-tarefa**: Após concluir a alteração solicitada, PARE e peça confirmação antes de continuar

### 1.2 Regra de Sem Suposições
- **Dúvida**: Se algo não estiver claro, você DEVE perguntar antes de implementar
- **Proibido**: NUNCA assuma comportamento, estrutura ou fluxo de API
- **Regra de ouro**: Se você não tiver 100% de certeza, PARE e pergunte

---

## 📋 Etapa 2: Conformidade com Documentação SRS (CRÍTICO)

### 2.1 Regra de Documentação Oficial
- **Obrigatório**: SEMPRE siga a documentação oficial do SRS (Simple Realtime Server)
- **Proibido**: NÃO invente endpoints, payloads ou fluxos
- **Consequência**: Qualquer desvio dos padrões do SRS pode quebrar a funcionalidade de streaming

### 2.2 Regra de Implementação Segura
- **Proibido**: NÃO implemente funcionalidades que você não entende
- **Dúvida**: Se tiver dúvida sobre SRS, WebRTC ou fluxo de API → PERGUNTE PRIMEIRO
- **Risco**: Implementação incorreta VAI causar falhas na transmissão  .segue  C:\Users\Usuario\Desktop\livego\rules\rules.md


Precisamos organizar melhor as alterações e NÃO misturar os projetos.

Temos dois ambientes separados:

1. Android (APK)
2. Aplicativo Web/Backend

Regras obrigatórias:

* Alterações do Android devem ficar SOMENTE na pasta do Android
* Alterações do Web/Backend devem ficar SOMENTE no projeto do servidor/site
* Não misturar código entre os dois projetos
* Não copiar arquivos de um projeto para o outro

Cada projeto tem sua própria responsabilidade:

* Android → interface mobile + player/publicação
* Web/Backend → API + lógica + integração com SRS

Se precisar compartilhar algo, deve ser via API (HTTP), não copiando código.

Objetivo:
Manter os projetos organizados, independentes e sem conflito.


chei o problema! O ProfileRoutes está acessando (window as any).appContext para obter as props, mas esse contexto pode não estar disponível quando a rota é carregada. Vou verificar se esse contexto está sendo definido corretamente.

O problema é que o ProfileRoutes está tentando acessar (window as any).appContext que não existe! Vou corrigir isso passando as props diretamente ou usando o contexto correto do React.


Falta clonar o Coturn e configurar.
Não é pra criar nada novo.
O SRS já está pronto, só precisa integrar.

Faça o seguinte:

Clonar o repositório do coturn
Configurar usuário, senha e IP no turnserver.conf
Liberar porta 3478 e range UDP
Conectar no ICE do app

Não criar imagens, scripts ou serviços novos.
Só configurar o que já existe.