// var assert = require('assert')
var async = require('async')
var util = require('util')
var events = require('events')
var bitcoin = require('bitcoinjs-lib')
var BlockExplorerRpc = require('blockexplorer-rpc')
var _ = require('lodash')

let options = {
    // showHidden: true,
  depth: 25
}

var DataStorage = require('data-storage')
var redis = require('redis')

var MAX_EMPTY_ACCOUNTS = 1
var MAX_EMPTY_ADDRESSES = 1

var mainnetBlockExplorerHost = 'https://explorer.coloredcoins.org'
var testnetBlockExplorerHost = 'https://testnet.explorer.coloredcoins.org'

var HDWallet = function (settings) {
  // var self = this enables to use self.function or self.variable
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
  self.redisPort = settings.redisPort || 6379
  self.redisHost = settings.redisHost || '127.0.0.1'
  if (settings.ds) {
    self.ds = settings.ds
  }

  self.max_empty_accounts = settings.max_empty_accounts || MAX_EMPTY_ACCOUNTS
  self.max_empty_addresses = settings.max_empty_addresses || MAX_EMPTY_ADDRESSES
  self.fringe = settings.fringe || []

  if (settings.neuteredNode) {
    self.neuteredNode58 = settings.neuteredNode
    self.neuteredNode = bitcoin.HDNode.fromBase58(settings.neuteredNode)
    // console.log('Neutered node: ' + self.neuteredNode)
  } else {
    console.log('Problem no neutered node provided. Impossible to create new addresses and accounts.')
    process.exit(-1)
  }
  self.nextAccount = 0
  self.addresses = []
  self.preAddressesNodes = {}
  self.offline = !!settings.offline
  self.client = redis.createClient()

  if (settings.discovering) {
    self.discovering = settings.discovering
  } else {
    self.discovering = false
  }
}

util.inherits(HDWallet, events.EventEmitter)

HDWallet.prototype.init = function (cb) {
  var self = this
  if (self.ds) {
    self.afterDSInit(cb)
  } else {
    var settings = {
      redisPort: self.redisPort,
      redisHost: self.redisHost
    }
    self.ds = new DataStorage(settings)
    self.ds.once('connect', function () {
      self.afterDSInit(cb)
    })
    self.ds.init()
  }
}

HDWallet.prototype.afterDSInit = function (cb) {
  var self = this
  self.discover(function (err) {
    if (err) {
      self.emit('error', err)
      if (cb) return cb(err)
      else return false
    }
    self.emit('connect')
    if (cb) cb(null, self)
  })
}

// Create new account for the current private key
// Get the extendedKey of this new account --> correspond to the 111 digit number of the node
HDWallet.prototype.getAccount = function (index) {
  index = index || 0
  var extendedKey = this.deriveAccount(index).toBase58(false)
  return extendedKey
}

// Get the key for current private key to log in DB
HDWallet.prototype.getKeyPrefix = function () {
  var self = this

  var network = (self.network === bitcoin.networks.bitcoin) ? 'mainnet' : 'testnet'
  // return doubleSha256(self.pubKey + '/' + network)
  return (self.neuteredNode58 + '/' + network)
}

HDWallet.prototype.setDB = function (key, value) {
  var self = this

  var seedKey = self.getKeyPrefix()
  self.ds.hset(seedKey, key, value)
}

HDWallet.prototype.getDB = function (key, callback) {
  var self = this

  var seedKey = self.getKeyPrefix()
  return self.ds.hget(seedKey, key, callback)
  /*self.ds.hget(seedKey, key, function (err, res) {
    callback(null, res)
  })*/
}

HDWallet.prototype.getKeys = function (callback) {
  var self = this

  var seedKey = self.getKeyPrefix()
  return self.ds.hkeys(seedKey, callback)
}

// Return all the addresses we have for the current private key.
HDWallet.prototype.getAddresses = function (callback) {
  var self = this
  self.getKeys(function (err, keys) {
    if (err) return callback(err)
    keys = keys || []
    var addresses = []
    keys.forEach(function (key) {
      if (key.indexOf('address/') === 0) {
        var address = key.split('/')[1]
        addresses.push(address)
      }
    })
    return callback(null, addresses)
  })
}

HDWallet.prototype.getPathAndAddresses = function (callback) {
  var self = this

  self.getKeys(function (err, keys) {
    if (err) return callback(err)
    keys = keys || []
    var addresses = []
    var path = []
    var mappingAddresses = {}
    async.forEach(keys, function (key, callback) {
      if (key.indexOf('address/') === 0) {
        self.getDB(key, function (err, hgetKey) {
          if (err) {
            throw new Error('Error: ' + err)
          }
          path.push(hgetKey)
          var address = key.split('/')[1]
          addresses.push(address)
          mappingAddresses[hgetKey] = address
          callback()
        })
      } else {
        callback()
      }
    }, function () {
      if (err) { throw new Error('Error: ' + err) }
      return callback(null, [mappingAddresses, path])
    })
  })
}

// Registrer new address in the Redis database for the corresponding private key
HDWallet.prototype.registerAddress = function (address, accountIndex, addressIndex, change) {
  var self = this

  var addressKey = 'address/' + address
  var coinType = self.network === bitcoin.networks.bitcoin ? 0 : 1
  change = (change) ? 1 : 0
  // We work on non hardened child thus no ' in the pattern path
  // var addressValue = 'm/44\'/' + coinType + '\'/' + accountIndex + '\'/' + change + '/' + addressIndex
  var addressValue = 'm/44/' + coinType + '/' + accountIndex + '/' + change + '/' + addressIndex

  self.setDB(addressKey, addressValue)
  self.addresses[accountIndex] = self.addresses[accountIndex] || []
  self.addresses[accountIndex][addressIndex] = address
  self.emit('registerAddress', address)
}

// Just get the address path from the DB
HDWallet.prototype.getAddressPath = function (address, callback) {
  var addressKey = 'address/' + address
  this.getDB(addressKey, callback)
}

HDWallet.prototype.createFringe = function() {
  var self = this
  self.discovering = false

  self.saveFringe()
  for (var i = 0; i < MAX_EMPTY_ACCOUNTS; i++) {
    self.fringe.push(0)
    for (var j = 0; j < MAX_EMPTY_ADDRESSES; j++) {
      var address = self.getAddress(i, j)
      self.registerAddress(address, i, j, 0)
    }
  }
  self.saveFringe()
}

HDWallet.prototype.flushDb = function (callback) {
  var self = this
  self.client.flushdb(callback)
}

HDWallet.prototype.isAddressInDb = function (callback) {
  self.fringe = self.getDB('fringe', function (err, fringe) {
    if (err) return callback(err)
  })
}

HDWallet.prototype.discover = function (callback) {
  callback = callback || function () {}
  var self = this
  if (self.discovering === false) {
    self.discovering = true
    self.createFringe()
    return callback()
  }
  self.getDB('fringe', function (err, fringe) {
    if (err) return callback(err)
    self.fringe = fringe || '[]'
    self.fringe = JSON.parse(self.fringe)
    if(self.fringe.length === 0) {
      self.flushDb(function (err, response) {
        if (err) return callback('Problem flushing database to create new one --> fringe not matching addresses')
        self.createFringe()
        return callback(null)
      })
    } else {
      self.fringe.forEach(function(account, i) {
        for (var j = 0; j <= account; j++) {
          self.getAddress(i, j)
        }
      })
      self.fringe.forEach(function(account, i) {
        for (var j = 0; j < account; j++) {
          self.registerAddress(self.addresses[i][j], i, j, 0)
        }
      })
    }
  })
}

// Save current fringe to Redis database
HDWallet.prototype.saveFringe = function () {
  var self = this
  self.setDB('fringe', JSON.stringify(self.fringe))
}

// Get == create new public key
HDWallet.prototype.getPublicKey = function (account, addressIndex) {
  var self = this

  var hdnode = self.deriveAddress(account, addressIndex)
  var address = hdnode.pubKey.getAddress(bitcoin.networks.testnet).toString()
  self.registerAddress(address, account, addressIndex)
  return address
}

HDWallet.prototype.getAddress = function (account, addressIndex) {
  var self = this
  var address = typeof account !== 'undefined' && typeof addressIndex !== 'undefined' && self.addresses[account] && self.addresses[account][addressIndex]
  if (!address) {
    address = self.getPublicKey(account, addressIndex)
    if (typeof account === 'undefined') {
      account = self.nextAccount
    }
    addressIndex = addressIndex || 0
    self.addresses[account] = self.addresses[account] || []
    self.addresses[account][addressIndex] = address
  }
  return address
}

HDWallet.prototype.createNewAddress = function (accountId, callback) {
  var self = this
  self.isLastAddressActive(accountId, function (err, isActive) {
    if (isActive[0].active) {
      var addressId = self.fringe[accountId] + 1
      var address = self.getAddress(accountId, addressId)
      self.registerAddress(address, accountId, addressId, 0)
      self.fringe[accountId] = addressId
      self.saveFringe(self.fringe)
      callback()
    } else {
      console.log('\nError: Last address of the account already inactive\n')
      callback()
    }
  })
}

// Automatically create new account from last know account if not empty
HDWallet.prototype.createNewAccount = function (callback) {
  var self = this

  self.isLastAccountActive(function (err, isActive) {
    if (err) return callback(err)
    if(!isActive[0].active) return callback('\nLast account is empty. Fill it before creating new account.\n')
    var lastAccount = self.fringe.length
    var address = self.getAddress(lastAccount, 0)
    self.registerAddress(address, lastAccount, 0, 0)
    self.fringe.push(0)
    self.saveFringe(self.fringe)
    callback()
  })
}

// With _.chunk create bunch of hundreds address and get activity for each address of each bunch
// With _.flatten remove one size of array: from [[]] => []
// The post method get a result from colored coins servers.
HDWallet.prototype.isAddressActive = function (addresses, callback) {
  var self = this
  if (typeof addresses === 'string') addresses = [addresses]
  async.map(_.chunk(addresses, 100), function (chunk, cb) {
    self.blockexplorer.post('isactive', {addresses: chunk},
      function (err, res) {
        if (err) return cb(err)
        return callback(null, res)
      }
    )
  }, function (err, results) {
    if (err) return callback(err)
    callback(null, _.flatten(results))
  })
}

HDWallet.prototype.syncDb = function () {
  return true
}

// If we already have a pattern for preAddressesNodes we directly derive the address otherwise we first built the pattern
HDWallet.prototype.deriveAddress = function (accountIndex, addressIndex) {

  var node
  if (this.preAddressesNodes[accountIndex]) {
    node = this.preAddressesNodes[accountIndex]
  } else {
    node = this.deriveAccount(accountIndex)
    // no change
    node = node.derive(0)
    this.preAddressesNodes[accountIndex] = node
  }

  // address_index
  node = node.derive(addressIndex)

  return node
}

// PreAccountNode correspond to the first part of the pattern --> BIP44 && Network (testnet, mainnet)
// Changing derive hardened to derive
HDWallet.prototype.deriveAccount = function (idAccount) {

  var node
  if (this.preAccountNode) {
    node = this.preAccountNode
  } else {
    node = this.neuteredNode
    // BIP0044:
    // purpose'
    // node = node.deriveHardened(44)
    node = node.derive(44)

    // coin_type'
    // node = node.deriveHardened(this.network === bitcoin.networks.bitcoin ? 0 : 1)
    node = node.derive(this.network === bitcoin.networks.bitcoin ? 0 : 1)
    this.preAccountNode = node
  }
  // account'
  // node = node.deriveHardened(accountIndex)
  node = node.derive(idAccount)
  return node
}

// Check out if the firt address of the account holds funds or not
HDWallet.prototype.isLastAccountActive = function (callback) {
  var self = this
  var publicKey = self.getPublicKey(self.fringe.length - 1, 0)
  return self.isAddressActive(publicKey, callback)
}

// Get from the fringe the last address created for the account
HDWallet.prototype.getLastAddressActive = function (accountId) {
  var self = this
  return self.fringe[accountId]
}

// Check if the last address created for the account is active
HDWallet.prototype.isLastAddressActive = function (accountId, callback) {
  var self = this
  var publicKey = self.getPublicKey(accountId, self.fringe[accountId])
  return self.isAddressActive(publicKey, callback)
}

HDWallet.prototype.getNumberOfAccounts = function () {
  return this.fringe.length
}

HDWallet.prototype.getNumberOfAccountsAsArray = function () {
  var self = this

  var nbAccounts = self.fringe.length
  var accountsAsArray = []
  for (var i = 0; i < nbAccounts; i++) {
    accountsAsArray[i] = String(i)
  }
  return accountsAsArray
}

module.exports = HDWallet
