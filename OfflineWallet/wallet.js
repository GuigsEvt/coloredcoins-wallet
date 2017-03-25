// var assert = require('assert')
var async = require('async')
var util = require('util')
var events = require('events')
var bitcoin = require('bitcoinjs-lib')
var BlockExplorerRpc = require('blockexplorer-rpc')
var BigInteger = require('bigi')
var bip39 = require('bip39')

var crypto = require('./crypto')
var input = require('./inquire')
var file = require('./file')

var mainnetBlockExplorerHost = 'https://explorer.coloredcoins.org'
var testnetBlockExplorerHost = 'https://testnet.explorer.coloredcoins.org'

var HDWallet = function (settings, callback) {
  var self = this

  settings = settings || {}
  if (settings.network === 'testnet') {
    settings.blockExplorerHost = settings.blockExplorerHost || testnetBlockExplorerHost
    self.network = bitcoin.networks.testnet
  } else {
    settings.blockExplorerHost = settings.blockExplorerHost || mainnetBlockExplorerHost
    self.network = bitcoin.networks.bitcoin
  }
  self.blockexplorer = new BlockExplorerRpc(settings.blockExplorerHost)

  var correctPass = false
  var seed

  if (settings.mnemonic) {
    self.mnemonic = settings.mnemonic

    async.whilst(function () {
      return (correctPass === false)
    }, function (callback) {
      input.password(function (response) {
        var uncryptedMnemonic = crypto.decryptSeed(self.mnemonic, response)
        if (!bip39.validateMnemonic(uncryptedMnemonic)) {
          console.log('Error bad mnemonic, wrong password entered')
        } else {
          seed = bip39.mnemonicToSeed(uncryptedMnemonic).toString('hex')
          uncryptedMnemonic = undefined
          // console.log('Seed before uncryption: ' + seed)
          self.privateSeed = crypto.encryptSeed(seed, response)
          correctPass = true
          seed = undefined
        }
        callback()
      })
    }, function () {
      callback()
    })
  } else {
    console.log('Creating mnemonic')
    var mnemonic = bip39.generateMnemonic()
    console.log('Here is your raw mnemonic seed for your wallet. Copy it in a safe place.')
    console.log('\n' + mnemonic + '\n')
    async.whilst(function () {
      return (correctPass === false)
    }, function (callback) {
      input.setPassword(function (isCorrect, response) {
        if (!isCorrect) { console.log('The two passwords don\'t match. Try it again.') } else { correctPass = true }
        callback(response)
      })
    }, function (response) {
      self.mnemonic = crypto.encryptSeed(mnemonic, response)
      self.privateSeed = bip39.mnemonicToSeed(mnemonic).toString('hex')

      var master = bitcoin.HDNode.fromSeedHex(self.privateSeed, self.network)
      var neutered = master.neutered()
      // Neutered corespond to the public key node
      // Master and neutered should have the same public key
      // Each node element can be represented by a 111-digit base58
      // “xprv” (private) or “xpub” (public).
      console.log('Master:')
      console.log(master)
      console.log('Neutered:')
      console.log(neutered)
      // console.log(neutered.pubKey.getAddress(bitcoin.networks.testnet).toString());

      self.privateSeed = crypto.encryptSeed(self.privateSeed, response)

      var pass = crypto.doubleSha256(response)
      var neutered58 = neutered.toBase58()

      file.writeSeed('./data/.seed.json', {
        seed: self.mnemonic,
        password: pass,
        neuteredBase58: neutered58
      })
      mnemonic = undefined
      master = undefined
      neutered = undefined
      callback({
        seed: self.mnemonic,
        password: pass,
        neuteredBase58: neutered58
      })
    })
  }
}

var isValidSeed = function (seed) {
  return (typeof (seed) === 'string' && seed.length >= 32 && seed.length <= 128 && seed.length % 2 === 0 && !isNaN(parseInt(seed, 16)))
}

util.inherits(HDWallet, events.EventEmitter)

// Get private key of the address via its position in the tree via "m/44'/1'/0'/0/0"
HDWallet.prototype.getAddressPrivateKey = function (accountId, addressId, callback) {
  var self = this
  var master

  var correctPass = false
  async.whilst(function () {
    return (correctPass === false)
  }, function (callback) {
    input.password(function (response) {
      var uncryptedSeed = crypto.decryptSeed(self.privateSeed, response)
      if (!isValidSeed(uncryptedSeed)) {
        console.log('Error bad seed, wrong password entered')
        // throw new Error('privateSeed should be a 128-512 bits hex string (32-128 chars), if you are using WIF, use privateSeedWIF instead.')
      } else {
        master = bitcoin.HDNode.fromSeedHex(uncryptedSeed, self.network)
        uncryptedSeed = undefined
        correctPass = true
      }
      callback()
    })
  }, function () {
    var network = this.network === bitcoin.networks.bitcoin ? 0 : 1
    var addressPath = '44/' + network + '/' + accountId + '/0/' + addressId
    var path = addressPath.split('/')

    var valid = true
    var node = master

    // Check out each field of the path. If hardened derive hardened otherwise basic derive.
    path.forEach(function (nodeIndex) {
      if (valid) {
        if (!nodeIndex.length) {
          valid = false
          return callback('Wrong path format')
        }
        var harden = nodeIndex.substring(nodeIndex.length - 1) === '\''
        var index
        if (harden) {
          index = parseInt(nodeIndex.substring(0, nodeIndex.length), 10)
        } else {
          index = parseInt(nodeIndex, 10)
        }
        if (isNaN(index)) {
          valid = false
          return callback('Wrong path format')
        }
        if (harden) {
          node = node.deriveHardened(index)
        } else {
          node = node.derive(index)
        }
      }
    })
    if (valid){
      var privateKey = node.privKey.toWIF(self.network)

      callback(privateKey)
    }
  })
}

HDWallet.prototype.getPrivateSeed = function () {
  return this.privateSeed.toString('hex')
}

HDWallet.prototype.getPrivateSeedWIF = function () {
  if (this.privateSeed.length > 256) {
    throw new Error('Seed is bigger than 256 bits, try getPrivateSeed or getMnemonic instead.')
  }
  console.warn('Deprecated: getPrivateSeedWIF is deprecated.')
  var d = BigInteger.fromBuffer(this.privateSeed)
  var priv = new bitcoin.ECKey(d, true)
  return priv.toWIF(this.network)
}

HDWallet.prototype.getMnemonic = function (pass) {
  if (!this.mnemonic) {
    throw new Error('Seed generated without mnemonic, try getPrivateSeed or getPrivateSeedWIF instead.')
  }
  return crypto.decryptSeed(this.mnemonic, pass)
}

module.exports = HDWallet
