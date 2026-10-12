const buildVersionCode = Number(process.env.BUILD_VERSION_CODE || 1);
const buildVersionName = process.env.BUILD_VERSION_NAME || '1.0.0';

module.exports = {
  expo: {
    name: 'Plan na Jutro',
    slug: 'plan-na-jutro',
    version: buildVersionName,
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#071018'
    },
    android: {
      package: 'pl.trader.plannajutro',
      versionCode: buildVersionCode,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#071018'
      }
    },
    plugins: ['./plugins/withReleaseSigning']
  }
};
