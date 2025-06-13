module.exports = {
  appId: 'com.writeguard.app',
  productName: 'WriteGuard',
  copyright: 'Copyright © 2024',
  
  directories: {
    output: 'release',
    buildResources: 'build'
  },

  files: [
    'dist/**/*',
    'electron/**/*',
    'package.json'
  ],

  asar: true,
  asarUnpack: [
    'node_modules/electron-updater/**/*'
  ],

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'build/icons/icon.ico',
    artifactName: '${productName}-Setup-${version}.${ext}'
  },

  mac: {
    target: ['dmg', 'zip'],
    icon: 'build/icons/icon.icns',
    artifactName: '${productName}-${version}.${ext}',
    category: 'public.app-category.productivity'
  },

  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/icons/icon.png',
    category: 'Utility',
    artifactName: '${productName}-${version}.${ext}'
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'WriteGuard',
    installerIcon: 'build/icons/icon.ico',
    uninstallerIcon: 'build/icons/icon.ico',
    installerHeaderIcon: 'build/icons/icon.ico',
    menuCategory: 'WriteGuard'
  },

  dmg: {
    icon: 'build/icons/icon.icns',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ]
  },

  deb: {
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxtst6', 'xdg-utils', 'libatspi2.0-0', 'libuuid1', 'libsecret-1-0']
  },

  publish: {
    provider: 'github',
    releaseType: 'release',
    publishAutoUpdate: true
  }
}; 