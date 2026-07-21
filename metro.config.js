// Metro config custom: DESLIGA inlineRequires.
//
// Sintoma: app trava no splash. No logcat, 4x "Cannot find module" em
// metroImportAll/asyncRequire dentro de getDirectoryTree -> getRoutes (expo-router montando
// a arvore de rotas), seguido de "Cannot read property 'ErrorBoundary' of undefined" e
// destruicao do ReactHost. Tela preta, sem mensagem nenhuma pro usuario.
//
// Causa: inlineRequires (ligado por padrao no build de producao do Expo/EAS) transforma
// require() em chamadas preguicosas. Com o grafo do better-auth + o require.context das
// rotas do expo-router, alguns modulos sao pedidos antes de registrados -> "Cannot find
// module". Requires eager eliminam a corrida. Custo: startup um tico mais lento.
//
// HISTORICO — este arquivo ja foi criado (14f1c2a) e REVERTIDO (d3e48a1) por engano: na
// epoca o 'eas update' rodando LOCALMENTE tambem gerava bundle podre, eu atribui o crash so
// a isso e removi este conserto. Errado. O bug voltou numa build feita NA NUVEM, com OTA
// desligado, e agora reproduz 3/3 no boot frio (a 1.0.11, sem as rotas novas, sobe 0/3).
// Nao remover sem antes reproduzir boot frio limpo em build de nuvem.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = config;
