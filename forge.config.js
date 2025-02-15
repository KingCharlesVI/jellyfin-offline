const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

const ICON_PATH = path.resolve(__dirname, 'assets', 'logo');
const ICON_ICO_PATH = path.resolve(__dirname, 'assets', 'logo.ico');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: ICON_PATH,
    executableName: 'Jelly-To-Go'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'jellyfin_offline',
        authors: 'KingCharlesVI',
        description: 'Jelly To Go Client',
        setupIcon: ICON_ICO_PATH,
        iconUrl: 'https://raw.githubusercontent.com/KingCharlesVI/jellyfin-offline/master/assets/icon.ico',
        setupExe: 'JellyToGo-Setup.exe',
        shortcuts: [
          {
            name: 'Jellyfin Offline',
            description: 'Launch Jelly-To-Go',
            target: '[APPLICATIONROOTDIRECTORY]\\Jelly-To-Go.exe',
            arguments: '',
            iconPath: '[APPLICATIONROOTDIRECTORY]\\resources\\app\\assets\\logo.ico',
            advertise: true
          }
        ]
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'KingCharlesVI',
          name: 'jellyfin-offline'
        },
        prerelease: false,
        draft: false,
        authToken: process.env.GITHUB_TOKEN
      }
    }
  ]
};