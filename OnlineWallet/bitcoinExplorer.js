// -- blockcTestnet.js via BlocktrailSDK  --> get data bitcoin
// Docs:  https://www.blocktrail.com/api/docs/lang/nodejs#getting_started
var blocktrail = require('blocktrail-sdk')

var client = blocktrail.BlocktrailSDK({apiKey: '70b628e67e84d54aed84361f4990540cdfd29dca',
  apiSecret: '62dcca80264ba4897ed2bb2f03a8922fb79b301c',
  network: 'tBTC',
  testnet: false})

module.exports = {
  getBalance: function (address, callback) {
    var total = 0
    client.addressUnspentOutputs(address, function (err, utxos) {
      if (err) {
        throw new Error('Error: ' + err)
      }
      var currentUtxos = utxos.data
      currentUtxos.forEach(function (item) {
        total += item.value
      })
      return callback(total)
    })
  }/*,
  sortOutPath: function (addresses, path, callback) {
    var sortedPath = []
    var sortedAddresses = []

    path.forEach(function (item) {

    })

  } */
}
