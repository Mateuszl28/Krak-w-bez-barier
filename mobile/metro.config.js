// Aplikacja współdzieli model danych i logikę oceny z wersją webową (../src/lib).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib")];
module.exports = config;
