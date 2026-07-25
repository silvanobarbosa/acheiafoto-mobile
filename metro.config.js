// Config mínima do Metro: só registra `.tflite` como ASSET para o modelo FaceNet ser
// empacotado no bundle. NÃO mexemos em transformer/inlineRequires — foi exatamente isso que
// derrubou o boot na onda 1 (tela preta). Mantém o default do Expo intacto e só soma o asset.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("tflite");
module.exports = config;
