bitcoinManager// -- bitcoinManager.js
var bitcoin = require('bitcoinjs-lib')
var bitcoinManager = require('./bitcoinTestnet')
var request = require('request')
var file = require('../file')
var async = require('async')
var wallet = require('../wallet')

const util = require('util')
let options = {
    //showHidden: true,
    depth: 25
}

module.exports = {
  issueAsset: function(amount, wif, callback) {
    var address = bitcoinManager.getPublicKeyFromWif(wif)
    var metadata
    file.getMetadataIssuance(function (err, response) {
      if (err) return callback(err)

      metadata = response
      if (amount) {
        var asset = {
            'issueAddress': address,
            'amount': amount,
            'divisibility': 0,
            'fee': 5000,
            'reissuable': false,
            'transfer': [{
              'address': address,
              'amount': amount
            }],
            'metadata': metadata
        }
      }
      else {
        console.log('Loading receivers from receiverIssuance.json')
        var asset = ""
      }
      if(metadata === 'undefined') return callback('No metadata found for the issuance')
      issue(asset, function(err, body){
          if (err) return callback(err)
          module.exports.signAndBroadcast(wif, body, true, function (err, tx) {
            if (err) return callback(err)
            callback(null, tx)
          })
      })
    })

    var issue = function postToApi(jsonAsset, callback) {
      request.post({
          url: 'http://testnet.api.coloredcoins.org:80/v3/issue',
          headers: {'Content-Type': 'application/json'},
          form: jsonAsset
      },
      function (err, response, body) {
        if (err) return callback(err)
        if (typeof body === 'string') {
          body = JSON.parse(body)
        }
        // console.log('Status: ', response.statusCode)
        console.log('Body: ', body)
        if(response.statusCode != 200) {
            return callback(body.explanation, null)
        }
        return callback(null, body)
      })
    }
  },
  signAndBroadcast: function (wif, unsignedTxHex, isIssuance, callback) {
    var tx = bitcoin.Transaction.fromHex(unsignedTxHex.txHex)
    // 0 correspond to the index to sign. Only one issuance thus sign index 0 of the transaction
    var privateKey = bitcoin.ECKey.fromWIF(wif)
    tx.sign(0, privateKey)
    if (!isIssuance) tx.sign(1, privateKey)
    var transactionHex = {
      'txHex': tx.toHex()
    }
    request.post({
      url: 'http://testnet.api.coloredcoins.org:80/v3/broadcast',
      headers: {'Content-Type': 'application/json'},
      form: transactionHex
    }, function (err, response, body) {
      if (err) return callback(err)
      if (typeof body === 'string') {
          body = JSON.parse(body)
      }
      // console.log('Status: ', response.statusCode)
      // console.log('Body: ', body)
      if(response.statusCode != 200) {
        return callback(body, null)
      }
      return callback(null, body.txid)
    })
  },
  hasAssets: function(address, callback) {
    module.exports.getAddressInfo(address, function (err, body) {
      if (err) return callback(err)
      var hasAssets = false
      async.forEach(body.utxos, function (item, callback) {
        if(item.assets.length > 0) hasAssets = true
        callback()
      }, function () {
        if(hasAssets) return callback(true)
        callback(false)
      })
    })
  },
  getAssetsPerAddress: function (address, callback) {
    var asset = []
    module.exports.getAddressInfo(address, function (err, body) {
      if (err) return callback(err)
      async.forEach(body.utxos, function (item, callback) {
        if (item.assets.length === 0) return callback()
        module.exports.getAssetMetadataDetails(item.assets[0].assetId, item.txid, item.index, function (err, metadata) {
          var meta
          if (err) meta = err
          else meta = metadata.metadataOfIssuence
          asset.push(JSON.stringify({
            'AssetId': item.assets[0].assetId,
            //'Index': item.index,
            //'Txid': item.txid,
            'Amount': item.assets[0].amount,
            'Metadata': meta
          }))
          callback()
        })
      }, function () {
        if (asset.length > 0) return callback(null, asset)
        callback('No asset found in utxos')
      })
    })
  },
  getAddressInfo: function (address, callback) {
    var getInfo = function getAddressInfo(param, callback) {
    request.get('http://testnet.api.coloredcoins.org:80/v3/addressinfo/'+param, function (error, response, body) {
        if (error) return callback(error)
        if (typeof body === 'string') {
            body = JSON.parse(body)
        }
        // console.log('Status:', response.statusCode)
        // console.log('Body:', body)
        return callback(null, body)
      })
    }
    getInfo(address , function(err, body) {
      if (err) return callback(err)
      callback(null, body)
    })
  },
  sendAssets: function(wif, address, assetId, amountAvailable, callback) {
    var send = function postApi(jsonData, callback) {
        request.post({
            url: 'http://testnet.api.coloredcoins.org:80/v3/sendasset',
            headers: {'Content-Type': 'application/json'},
            form: jsonData
        }, function (error, response, body) {
            if (error) return callback(error)
            if (typeof body === 'string') {
                body = JSON.parse(body)
            }
            if (response.statusCode != 200) return callback(body.explanation)
            // console.log('Status: ', response.statusCode)
            // console.log('Body: ', body)
            return callback(null, body)
        })
    }
    file.getReceiver(function (err, receivers) {
      if (err) return callback(err)
      var receivers = receivers.receivers
      amount = module.exports.getAmountReceiver(receivers)
      if (amount > amountAvailable) return callback('Tokens to send greater than tokens available')
      async.forEach(receivers, function (item, callback) {
        item['assetId'] = assetId
        callback()
      }, function () {
        var asset = {
            'fee': 5000,
            'from': [address],
            'to': receivers
        }
        send(asset, function(err, body) {
            if (err) return callback(err)
            callback(null, body)
        })
      })
    })
  },
  getAssetMetadataProtocolIssuance: function(asset, callback) {
    function assetMetadata(assetId, callback) {
      request.get('http://testnet.api.coloredcoins.org:80/v3/assetmetadata/'+assetId, function (error, response, body) {
          if (error) {
	           return callback(error)
	          }
          if (typeof body === 'string') {
            body = JSON.parse(body)
          }
	        // console.log('Status:', response.statusCode)
	        // console.log('Body:', body)
          return callback(null, response.statusCode, body)
      });
    }
    assetMetadata(asset, function(err, status, body){
        if (err) {
            console.log('error: ', err)
            return callback('No metadata')
        }
        return callback(body);
    })
  },
  getAssetMetadataDetails: function(assetId, txId, index, callback) {
    request.get('http://testnet.api.coloredcoins.org:80/v3/assetmetadata/'+assetId+'/'+txId+':' + index, function (error, response, body) {
        if (error) return callback(error)
        if (typeof body === 'string') {
          body = JSON.parse(body)
        }
        if (body.metadataOfIssuence === undefined) return callback('No metadata of issuance')
        // console.log('Status:', response.statusCode)
        // console.log('Body:', body)
        callback(null, body)
    })
  },
  getAmountReceiver: function(receivers) {
    var amount = 0
    for (var i = 0, len = receivers.length; i < len; i++) {
      amount += receivers[i].amount
    }
    return amount
  },
  getTransactionBreakdown: function(txId, callback) {
    request.get('https://testnet.explorer.coloredcoins.org/api/gettransaction?txid=' + txId, function (error, response, body) {
        if (error) callback(error)
        if (typeof body === 'string') {
            body = JSON.parse(body)
        }
        console.log('Status:', response.statusCode)
        console.log(util.inspect(body, options))
        callback(null, body)
    });
  }
}
