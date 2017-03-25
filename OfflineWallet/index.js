var input = require('./inquire')
var file = require('./file')
var crypto = require('./crypto')
var HDWallet = require('./wallet')
var bitcoinManager = require('./Testnet/bitcoinTestnet')
var coloredManager = require('./Testnet/coloredCoinsTestnet')
var async = require('async')
var bip39 = require('bip39')

var settingsWallet = {
  network: 'testnet'
}

file.getSeed('.seed.json', function (err, response) {
  var homeFunction = function () {
    input.home(function (choice) {
      switch (choice['indexChoice']) {
        case 1:
          // For now able to send from one address to only one address
          input.sendBitcoin(function (dataForKey) {
            if ((isNaN(dataForKey[0])) || (isNaN(dataForKey[1]))) {
              console.log('\nError: Must enter valid number for ids\n')
              homeFunction()
            } else if ((dataForKey[0] < 0) || (dataForKey[1] < 0)) {
              console.log('\nError: Must be positive numbers for ids\n')
              homeFunction()
            } else {
              wallet.getAddressPrivateKey(dataForKey[0], dataForKey[1], function(wif) {
                address = bitcoinManager.getPublicKeyFromWif(wif)
                var addressTo = [{
                  'address': 'mvqZb6cb6PqaTcFzwzbubwWryyVfdRQKgV',
                  'amount': 10000
                }]
                bitcoinManager.createUnsignedTxHex(address, addressTo, address, function (err, txHex) {
                  if (err) {
                    console.log('\nError: '  + err + '\n')
                    homeFunction()
                  } else {
                    bitcoinManager.signAndBroadcast(txHex, wif, function (err, response) {
                      if (err) {
                        console.log('\nError: '  + err + '\n')
                        console.log('TxHex before signing: ' + txHex)
                      }
                      var txId = response.tx.hash
                      console.log('Tx:' + txId)
                      homeFunction()
                    })
                  }
                })
              })
            }
          })
          break
        case 2:
          input.sendToken(function (dataForKey) {
            if ((isNaN(dataForKey[0])) || (isNaN(dataForKey[1]))) {
              console.log('\nError: Must enter valid number for ids\n')
              homeFunction()
            } else if ((dataForKey[0] < 0) || (dataForKey[1] < 0)) {
              console.log('\nError: Must be positive numbers for ids\n')
              homeFunction()
            } else {
              console.log('Data taken from receiverToken.json')
              console.log('Asking password to get wif for the account and address id')
              wallet.getAddressPrivateKey(dataForKey[0], dataForKey[1], function(wif) {
                var address = bitcoinManager.getPublicKeyFromWif(wif)
                coloredManager.getAssetsPerAddress(address, function(err, utxos){
                  if (err) {
                    console.log('\nError: '  + err + '\n')
                    homeFunction()
                  } else {
                    input.listAssetAddress(utxos, function (assetChosen, amountAvailable) {
                      // console.log('Asset chosen: ' + assetChosen)
                      // console.log('Amount: ' + amountAvailable);
                      coloredManager.sendAssets(wif, address, assetChosen, amountAvailable, function (err, txHex) {
                        if (err) {
                          console.log('\nError: '  + err + '\n')
                          homeFunction()
                        }
                        else {
                          coloredManager.signAndBroadcast(wif, txHex, false, function(err, txId) {
                            if (err) console.log('\nError: '  + err + '\n')
                            else console.log('Tx: ' + txId)
                            homeFunction()
                          })
                        }
                      })
                    })
                  }
                })
              })
            }
          })
          break
        case 3:
          input.issueToken(function (dataForKey, amount) {
            if ((isNaN(dataForKey[0])) || (isNaN(dataForKey[1]))) {
              console.log('\nError: Must enter valid number for ids\n')
              homeFunction()
            } else if ((dataForKey[0] < 0) || (dataForKey[1] < 0)) {
              console.log('\nError: Must be positive numbers for ids\n')
              homeFunction()
            } else {
              console.log('Asking password to get wif for the account and address id')
              wallet.getAddressPrivateKey(dataForKey[0], dataForKey[1], function(wif) {
                var address = bitcoinManager.getPublicKeyFromWif(wif)
                coloredManager.hasAssets(address, function(boolAsset) {
                  if(boolAsset) {
                    console.log('\nThis address already holds assets. Not allowed to hold more than one asset (' + address + ')\n')
                    homeFunction()
                  } else {
                    coloredManager.issueAsset(amount, wif, function (err, txId) {
                      if (err) {
                        console.log('\nError: ' + err + '\n')
                        homeFunction()
                      } else {
                        console.log('TxId: ' + txId)
                        homeFunction()
                      }
                    })
                  }
                })
              })
            }
          })
          break
        case 4:
          var correctPass = false
          async.whilst(function () {
            return (correctPass === false)
          }, function (callback) {
            input.password(function (pass) {
              var uncryptedMnemonic = crypto.decryptSeed(response.seed, pass)
              if (!bip39.validateMnemonic(uncryptedMnemonic)) {
                console.log('Error bad mnemonic, wrong password entered')
              } else {
                console.log('\nSeed: ' + uncryptedMnemonic + '\n')
                correctPass = true
              }
              callback()
            })
          }, function () {
            homeFunction()
          })
          break
        case 5:
          console.log('\nMaster public node 111-digit (base 58): ' + response.neuteredBase58 + '\n')
          homeFunction()
          break
        case 6:
          input.queryAccountAddress(function (dataForKey) {
            if ((isNaN(dataForKey[0])) || (isNaN(dataForKey[1]))) {
              console.log('\nError: Must enter valid number for ids\n')
              homeFunction()
            } else if ((dataForKey[0] < 0) || (dataForKey[1] < 0)) {
              console.log('\nError: Must be positive numbers for ids\n')
              homeFunction()
            } else {
              wallet.getAddressPrivateKey(dataForKey[0], dataForKey[1], function (privateKey) {
                console.log('\nPrivate key: ' + privateKey + '\n')
                homeFunction()
              })
            }
          })
          break
        case 7:
          input.publicKeyFromWif(function (wif) {
            console.log('\nAddress:  ' + bitcoinManager.getPublicKeyFromWif(wif) + '\n')
            homeFunction()
          })
          break
        case -1:
          process.exit(-1)
          break
      }
    })
  }

  var wallet
  if (err) {
    console.log('Error retrieving seed: ' + err)
  }
  if (response === undefined || !response) {
    console.log('No seed found --> creating new seed')
    wallet = new HDWallet(settingsWallet, function (newFile) {
      response = newFile
      homeFunction()
    })
  } else {
    console.log('Loading wallet from existing seed')
    settingsWallet.mnemonic = response.seed
    settingsWallet.pass = response.pass
    wallet = new HDWallet(settingsWallet, function () {
      homeFunction()
    })
  }
})
