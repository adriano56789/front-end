SRS Integration Rules

Analise a documentação oficial do SDK do SRS e utilize sempre como base principal para qualquer implementação:
[https://ossrs.net/lts/en-us/docs/v7/doc/client-sdk](https://ossrs.net/lts/en-us/docs/v7/doc/client-sdk)

OBJETIVO
Garantir a integração correta do SDK SRS dentro do aplicativo de transmissão ao vivo, seguindo fluxo oficial, sem improvisações ou soluções fora da documentação.

FLUXO DA APLICAÇÃO

1. CLIENTE (GO LIVE)

* Usuário clica no botão Go Live
* Abrir tela de preparação da live
* Iniciar preview da câmera (vídeo e áudio ativos)
* Preparar ambiente para transmissão
* Chamar backend para iniciar live     sempre revisa tambem  C:\Users\Usuario\Desktop\livego\rules\global_rules.md
  
2. BACKEND

* Criar liveId
* Gerar streamId
* Gerar pushUrl
* Validar usuário
* Salvar live no banco de dados   segue  C:\Users\Usuario\Desktop\livego\android
* Retornar pushUrl para o cliente

3. CLIENTE (TRANSMISSÃO)

* Receber pushUrl do backend
* Validar se pushUrl é válido antes de qualquer ação
* Inicializar SDK SRS corretamente
* Iniciar publicação da stream
* Tratar erros de rede, conexão e publish

REGRAS OBRIGATÓRIAS

* Sempre seguir a documentação oficial do SRS como fonte principal
* Nunca inicializar o SDK sem todas as dependências instaladas corretamente
* Nunca iniciar transmissão sem pushUrl válido
* Sempre aguardar resposta do backend antes de iniciar o stream
* Garantir inicialização completa do SDK antes de publish
* Implementar tratamento de erros e reconexão
* Separar claramente responsabilidades entre backend e cliente

SEGURANÇA E CONSISTÊNCIA

* Backend sempre valida e controla criação da live
* Cliente nunca cria live diretamente
* SDK só atua após confirmação do backend
* Fluxo deve ser previsível e rastreável

OBJETIVO FINAL
Ter uma integração estável, confiável e totalmente compatível com o SDK oficial do SRS, garantindo transmissão ao vivo sem falhas estruturais.
