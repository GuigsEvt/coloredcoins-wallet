var bitcoin = require('bitcoinjs-lib')
var async = require('async')
// -- blockcTestnet.js via BlocktrailSDK  --> get data bitcoin
// Docs:  https://www.blocktrail.com/api/docs/lang/nodejs#getting_started
var blocktrail = require('blocktrail-sdk')
var client = blocktrail.BlocktrailSDK({apiKey: '70b628e67e84d54aed84361f4990540cdfd29dca',
  apiSecret: '62dcca80264ba4897ed2bb2f03a8922fb79b301c',
  network: 'tBTC',
  testnet: false})

 // -- blockCypher --> send raw transaction to the network
 // Docs: https://www.blockcypher.com/dev/bitcoin/#documentation-structure
 // Github: https://github.com/blockcypher/node-client
 // Decode raw transaction really good: https://live.blockcypher.com/btc-testnet/decodetx/
var BlockCypher = require('blockcypher')

const util = require('util')
let options = {
    depth: 25
}

module.exports = {
  // To be called to crete testnet address for the purpose of the project
  // Fund it with a testnet faucet to pay the fees and 600 satoshis for the colored coins
  issueAddress: function () {
    var key = bitcoin.ECKey.makeRandom()
    var address = key.pub.getAddress(bitcoin.networks.testnet).toString()
    var wif = key.toWIF()
    console.log('Wif: ' + wif)
    console.log('Pub key: ' + address)
  },
  getBalance: function (address) {
    var amount = 0
    client.addressUnspentOutputs(address, function (err, utxos) {
      if (err) {
        throw new Error('Error: ' + err)
      }
      utxos.data.forEach(function (item) {
        // console.log(item.value)
        amount += item.value
      })
      console.log('Bal ' + address + ' : ' + amount)
    })
  },
  getPublicKeyFromWif: function (wif, callback) {
    var key = bitcoin.ECKey.fromWIF(wif)
    return key.pub.getAddress(bitcoin.networks.testnet).toString()
  },
  getInputNewTransaction: function (address, amount, callback) {
    // Get the unspent outputs of an address
    client.addressUnspentOutputs(address, function (err, addressUtxo) {
      if (err) {
        console.log('Error: ' + err)
      }
      module.exports.getCorrectUtxos(addressUtxo.data, amount, function (utxos) {
        console.log('Utxos chosen for transaction: ')
        console.log(util.inspect(utxos, options))
        callback(utxos)
      })
    })
  },
  // Create the unsigned transaction based on unsigned tx hex with the output
  // Call the change function to create the unspent output
  createUnsignedTxHex: function (addressFrom, addressTo, changeAddress, callback) {
    var tx
    var amount = 0
    module.exports.createUnsignedTxHexOutput(addressTo, function (txId, totalAmount) {
      tx = txId
      amount = totalAmount
    })
    var nbOut = addressTo.length
    var nbIn = 0
    var unspentAmount = 0

    module.exports.getInputNewTransaction(addressFrom, amount, function (utxos) {
      async.forEach(utxos, function (item, callback) {
        // Add input with the previous txId hash and the index of the output
        unspentAmount += item.value
        tx.addInput(item.hash, item.index)
        nbIn += 1
        callback()
      }, function () {
        module.exports.calculateFees(nbIn, nbOut, function (fees) {
          tx.addOutput(changeAddress, unspentAmount - amount - fees)
          callback(null, tx)
        })
      })
    })
  },
  // Create an unsigned tx hex with the outputs of the transaction
  // Return txId and totalAmount of satoshis to send
  createUnsignedTxHexOutput: function (addressTo, callback) {
    var totalAmount = 0
    var tx = new bitcoin.TransactionBuilder()
    async.forEach(addressTo, function (item, callback) {
      tx.addOutput(item.address, item.amount)
      totalAmount += item.amount
      callback()
    }, function () {
      return callback(tx, totalAmount)
    })
  },
  signAndBroadcast: function (tx, wif, callback) {
    var privKey = bitcoin.ECKey.fromWIF(wif)
    tx.sign(0, privKey)
    // console.log(tx.build().toHex())
    module.exports.pushTransaction(tx.build().toHex(), function (err, res) {
      callback(err, res)
    })
  },
  // Push the transaction to the network via the block cypher API
  pushTransaction: function (txHex, callback) {
    var cypherApi = new BlockCypher('btc', 'test3', '1ebe95fa2ef04389aa5434f5362ad3ec')
    var pushTx = {
      tx: txHex
    }
    cypherApi.pushTX(pushTx.tx, function (err, response) {
      if (err) return callback(err)
      callback(err, response)
    })
  },
  getAddressData: function (address, callback) {
    client.address(address, function (err, addressData) {
      if (err) return callback(err)
      callback(addressData)
    })
  },
  // https://medium.com/@lopp/the-challenges-of-optimizing-unspent-output-selection-a3e5d05d13ef#.c55n5fp7j
  getCorrectUtxos: function (utxos, amount, callback) {
    client.feePerKB(function (err, result) {
      if (err) return callback(err)

      var fees = result.optimal

      // First let's see if one output is equal to the amount to sent.
      utxos.forEach(function (item) {
        if ((item.value + fees) === amount) callback([item])
      })
    })
    // Function to sort out UTXOs
    function sortOutSmallerAndGreater (utxos, callback) {
      var smallestUTXOs = []
      var greatestUTXOs = []
      async.forEach(utxos, function (item, callback) {
        if (item.value < amount) {
          smallestUTXOs.push(item)
          callback()
        } else if (item.value > amount) {
          greatestUTXOs.push(item)
          callback()
        }
      }, function (err) {
        if (err) { throw new Error('Error: ' + err) }
        callback(smallestUTXOs, greatestUTXOs)
      })
    }

    // Create lowest larger and total lower
    function getTotalLowerAndLowestLarger (utxo1, utxo2, callback) {
      var numberProcessedLowest = 0
      var numberProcessedLargest = 0
      var totalLower = 0
      var coinLowestLarger = [1000000000000000000, null]
      // Process to sum up lowest utxos
      async.forEach(utxo1, function (item, callback) {
        totalLower += item.value
        numberProcessedLowest++
        callback()
      }, function (err) {
        if (err) { throw new Error('Error: ' + err) }
        if (numberProcessedLargest === utxo2.length) {
          callback(totalLower, coinLowestLarger)
        }
      })
      // Process to order greater utxos
      // Set lowest larger as an array of [amount, item]
      async.forEach(utxo2, function (item, callback) {
        coinLowestLarger = (item.value < coinLowestLarger[0]) ? [item.value, item] : coinLowestLarger
        numberProcessedLargest++
        callback()
      }, function (err) {
        if (err) { throw new Error('Error: ' + err) }
        if (numberProcessedLowest === utxo1.length) {
          callback(totalLower, coinLowestLarger)
        }
      })
    }

    // Not implementing bitcoin core chosing methods for UTXOs. Wait for later.
    sortOutSmallerAndGreater(utxos, function (utxo1, utxo2) {
      getTotalLowerAndLowestLarger(utxo1, utxo2, function (totalLower, coinLowestLarger) {
        // If the sum up of the lower utxos smaller than amount then we send the first above the amount
        if (totalLower < amount) {
          if (typeof coinLowestLarger[1] !== 'undefined') {
            // console.log('Callback1')
            callback([coinLowestLarger[1]])
          } else {
            // It means no utxos is gretaer than the amount we cannot send the transaction
            // console.log('Callback2')
            callback(null)
          }
        } else {
          // It means the sum of the amount smaller than the amount to send are enough to create the transaction
          // If the sum up is smaller than the lowest larger we send the sum up
          if (totalLower < coinLowestLarger[0]) {
            // console.log('Callback3')
            callback(utxo1)
          } else {
            // Otherwise we send the lowest larger coin
            // console.log('Callback4')
            callback([coinLowestLarger[1]])
          }
        }
      })
    })
  },
  calculateFees: function (nbIn, nbOut, callback) {
    // From now on in*148 + out*34 + 10 plus or minus 'in' --> expressed in bytes
    client.feePerKB(function (err, result) {
      if (err) { throw new Error('Error: ' + err) }
      // Fees are calculated per KB
      // console.log(result)
      var fees = (((nbIn * 148) + (nbOut * 34) + 10) / 1000) * result.optimal
      callback(fees)
    })
  },
  decodeRawTransaction: function (hex, callback) {
    var cypherApi = new BlockCypher('btc', 'test3', '1ebe95fa2ef04389aa5434f5362ad3ec')
    var txHex = {
      tx: hex
    }
    cypherApi.decodeTX(txHex.hex, function (err, response) {
      callback(err, response)
    })
  },
  decodeTxId: function (txid, callback) {
    var cypherApi = new BlockCypher('btc', 'test3', '1ebe95fa2ef04389aa5434f5362ad3ec')
    var txId = {
      tx: txid
    }
    cypherApi.getTX(txId.tx, null, function (err, response) {
      callback(err, response)
    })
  }
}
