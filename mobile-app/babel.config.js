module.exports = function (api) {
  api.cache(true);
  return {
    // SDK 52+ removed the standalone expo-router/babel and reanimated plugins;
    // both are now handled by babel-preset-expo. Reanimated 4 (bundled with
    // SDK 57) uses react-native-worklets internally and needs no extra entry.
    presets: ['babel-preset-expo'],
  };
};
