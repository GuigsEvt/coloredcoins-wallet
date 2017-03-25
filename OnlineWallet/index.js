// -- index.js for wallet module
// Github project: https://github.com/Colored-Coins/hdwallet
// Hardened and not child key http://bitcoin.stackexchange.com/questions/37488/eli5-whats-the-difference-between-a-child-key-and-a-hardened-child-key-in-bip3
// To use install redis http://redis.io/topics/quickstart
// For BIP44 explaination: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki

var redis = require('redis')
var HDWallet = require('./wallet')
var input = require('./inquire')
var explorer = require('./bitcoinExplorer')
var async = require('async')

var settingsWallet =
  {
    network: 'testnet'
  }

console.log('\n\nHierarchical and deterministic bitcoin wallet. Implementing BIP32 & BIP38 & BIP44.')
console.log('No hardened node for now. Online wallet only with public nodes.')

var client = redis.createClient()
var addresses = []
var wallet

client.keys('*', function (err, keys) {
  var homeFunction = function () {
    input.home(function (choice) {
      switch (choice['indexChoice']) {
        case 1:
          var path = []
          var addresses = []
          var balance = {}
          wallet.getPathAndAddresses(function (err, addressesAndPath) {
            if (err) {
              throw new Error('Error: ' + err)
            }
            mappingAddresses = addressesAndPath[0]
            path = addressesAndPath[1]
            path.sort()
            async.forEach(path, function (item, callback) {
              explorer.getBalance(mappingAddresses[item], function (totalAddress) {
                balance[item] = totalAddress
                callback()
              })
            }, function () {
              console.log('\n')
              for (var i = 0; i < path.length; i++) {
                console.log(mappingAddresses[path[i]] + '     ' + path[i] + '      Satoshi balance: ' + balance[path[i]])
              }
              console.log("\nPattern:   m / purpose' / coin_type' / account' / change / address_index")
              console.log('Coin type: 0 --> mainnet    1 --> testnet')
              console.log('Change:    0 --> external   1 --> internal(change)\n')
              homeFunction()
            })
          })
          break
        case 2:
          wallet.createNewAccount(function(err, res) {
            if (err) console.log(err)
            homeFunction()
          })
          break
        case 3:
          input.listAccounts(wallet.getNumberOfAccountsAsArray(), function (accountId) {
            wallet.createNewAddress(accountId, function (response) {
              homeFunction()
            })
          })
          break
        case -1:
          process.exit(-1)
          break
      }
    })
  }

  if (err) {
    console.log(err)
    process.exit(-1)
  }
  if (keys.length === 0) {
    console.log('No keys found in the database.\n')
    input.newMasterNode(function (response) {
      settingsWallet.neuteredNode = response
      wallet = new HDWallet(settingsWallet)
      wallet.init()
      console.log('\n')
      homeFunction()
    })
  } else if (keys.length > 1) {
    console.log('Problem loading keys. More than one master public node in the database.')
    process.exit(-1)
  } else {
    console.log('Loading private key from: ' + keys[0] + '\n')
    settingsWallet.neuteredNode = keys[0].split('/')[0]
    settingsWallet.discovering = true
    wallet = new HDWallet(settingsWallet)
    wallet.init()
    console.log('\n')
    homeFunction()
  }
})
