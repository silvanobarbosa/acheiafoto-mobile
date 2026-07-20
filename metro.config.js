// Metro config custom: DESLIGA inlineRequires.
//
// Sintoma: app travava no splash com "Cannot find module" no metroImportAll/asyncRequire
// durante createAuthClient (better-auth) no load de rota do expo-router. inlineRequires
// (ligado por padrão no build de produção do Expo/EAS) torna alguns require() preguiçosos e,
// com o grafo do better-auth + rotas lazy do expo-router, o módulo às vezes é pedido antes de
// registrado → "Cannot find module" (intermitente = a praga do "não funciona/tela travada").
// Requires eager eliminam essa corrida (custo: startup um tico mais lento, aceitável).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = config;
