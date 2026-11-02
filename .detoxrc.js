/**
 * Detox configuration for the ImbaFind Expo app.
 *
 * The project uses Continuous Native Generation (no committed `ios/` or
 * `android/` folders), so the build commands run `expo prebuild` first and then
 * compile the generated native project. Detox's native test hooks are added by
 * the `@config-plugins/detox` plugin, which `app.config.ts` only includes when
 * `DETOX_ENABLED=true` is set (see `detox:build` in package.json).
 *
 * Prerequisites:
 *   - Android: the Android SDK plus a running emulator (see the `emulator` device).
 *   - iOS: macOS with Xcode; Detox cannot build iOS on Windows or Linux.
 *
 * Docs: https://docs.expo.dev/build-reference/detox/
 *
 * @type {Detox.DetoxConfig}
 */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      // `DETOX_ENABLED=true` makes app.config.ts include the Detox config plugin
      // for this prebuild; production builds never get the Detox native bits.
      build:
        'cross-env DETOX_ENABLED=true npx expo prebuild --platform ios --no-install && xcodebuild -workspace ios/ImbaFind.xcworkspace -scheme ImbaFind -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ImbaFind.app',
    },
    'android.debug': {
      type: 'android.apk',
      build:
        'cross-env DETOX_ENABLED=true npx expo prebuild --platform android --no-install && cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
