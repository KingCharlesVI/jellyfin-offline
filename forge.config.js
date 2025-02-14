module.exports = {
    publishers: [
      {
        name: '@electron-forge/publisher-github',
        config: {
          repository: {
            owner: 'KingCharlesVI',
            name: 'jellyfin-offline'
          },
          prerelease: false,
          draft: true
        }
      }
    ]
  }