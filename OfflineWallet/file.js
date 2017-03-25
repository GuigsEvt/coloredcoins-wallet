var json = require('jsonfile')

module.exports = {
  getSeed: function (file, callback) {
    json.readFile('./data/' + file, 'utf8', callback)
  },
  writeSeed: function (file, seed) {
    json.writeFile(file, seed, {spaces: 2}, function (err) {
      if (err) {
        console.log('Error writing file: ' + err)
      }
    })
  },
  getReceiver: function (callback) {
    return json.readFile('./data/receiverToken.json', 'utf8', callback)
  },
  getMetadataIssuance: function (callback) {
    return json.readFile('./data/metadataIssuance.json', 'utf8', callback)
  },
  getMetadataTransaction: function (callback) {
    return json.readFile('./data/metadataTransaction.json', 'utf8', callback)
  }
}
