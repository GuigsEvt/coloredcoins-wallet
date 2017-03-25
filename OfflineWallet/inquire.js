var inquirer = require('inquirer')
var bitcoinManager = require('./Testnet/bitcoinTestnet')

const util = require('util')
let options = {
    depth: 25
}

var questionIndex = [{
  name: 'indexChoice',
  message: 'What do you want to do ?',
  type: 'list',
  choices: ['Send bitcoins',
    'Send tokens',
    'Issue tokens',
    'Get seed',
    'Get neutered public node',
    'Get private key of an address/path',
    'Get public key from wif',
    'Quit'],
  filter: function (str) {
    switch (str) {
      case 'Send bitcoins':
        return 1
      case 'Send tokens':
        return 2
      case 'Issue tokens':
        return 3
      case 'Get seed':
        return 4
      case 'Get neutered public node':
        return 5
      case 'Get private key of an address/path':
        return 6
      case 'Get public key from wif':
        return 7
      case 'Quit':
        return -1
    }
  }
}]
var addressFrom = [{
  name: 'addressFrom',
  message: 'Which address do you wanna sign ?',
  filter: function (str) {
    return str.trim()
  }
}]
var addressTo = [{
  name: 'addressTo',
  message: 'What is the adress to send to ?'
}]
var queryAssetId = [{
  name: 'assetId',
  message: 'Asset Id ?'
}]
var queryAmount = [{
  name: 'amount',
  message: 'Amount ?'
}]
var queryPassword = [{
  name: 'password',
  message: 'Password ?',
  type: 'password'
}]
var idAccount = [{
  name: 'idAccount',
  message: 'Account number ?'
}]
var idAddress = [{
  name: 'idAddress',
  message: 'Address number ?'
}]
var address = [{
  name: 'address',
  message: 'Address ?'
}]
var pubKeyFromWif = [{
  name: 'pubKey',
  message: 'What is the private key (wif) ?'
}]

module.exports = {
  home: function (callback) {
    inquirer.prompt(questionIndex).then(function (answers) {
      callback(answers)
    })
  },
  sendToken: function (callback) {
    console.log('Data for the address to sent from: ')
    inquirer.prompt(idAccount).then(function (answerIdAccount) {
      inquirer.prompt(idAddress).then(function (answerIdAddress) {
        callback([answerIdAccount.idAccount, answerIdAddress.idAddress])
      })
    })
  },
  issueToken: function (callback) {
    var isMultipleIssuance =  [{
      name: 'multipleIssuance',
      message: 'Is it issuance with send tokens ?',
      type: 'confirm'
    }]
    console.log('Data for the address to issue from: ')
    inquirer.prompt(idAccount).then(function (answerIdAccount) {
      inquirer.prompt(idAddress).then(function (answerIdAddress) {
        inquirer.prompt(isMultipleIssuance).then(function (answerTypeIssuance) {
          if (Boolean(answerTypeIssuance.multipleIssuance)) {
            callback([answerIdAccount.idAccount, answerIdAddress.idAddress], null)
          } else {
            var amountToIssue = [{
              name: 'amount',
              message: 'Amount to issue'
            }]
            inquirer.prompt(amountToIssue).then(function (answerAmount) {
              callback([answerIdAccount.idAccount, answerIdAddress.idAddress], answerAmount.amount)
            })
          }
        })
      })
    })
  },
  sendBitcoin: function (callback) {
    inquirer.prompt(idAccount).then(function (answerIdAccount) {
      inquirer.prompt(idAddress).then(function (answerIdAddress) {
        callback([answerIdAccount.idAccount, answerIdAddress.idAddress])
      })
    })
  },
  password: function (callback) {
    inquirer.prompt(queryPassword).then(function (answers) {
      callback(answers['password'])
    })
  },
  setPassword: function (callback) {
    var queryPassword1 = [{
      name: 'password',
      message: 'Choose a password for your wallet ?',
      type: 'password'
    }]
    var queryPassword2 = [{
      name: 'password',
      message: 'Repeat password ?',
      type: 'password'
    }]
    inquirer.prompt(queryPassword1).then(function (pass1) {
      inquirer.prompt(queryPassword2).then(function (pass2) {
        if (pass1.password === pass2.password) {
          callback(true, pass1.password)
        } else { callback(false) }
      })
    })
  },
  queryAccountAddress: function (callback) {
    inquirer.prompt(idAccount).then(function (account) {
      inquirer.prompt(idAddress).then(function (address) {
        callback([account.idAccount, address.idAddress])
      })
    })
  },
  publicKeyFromWif: function (callback) {
    inquirer.prompt(pubKeyFromWif).then(function (pubKey) {
      callback(pubKey.pubKey)
    })
  },
  listAssetAddress: function (assets, callback) {
    var listAsset = [{
      name: 'assetId',
      message: 'Which asset do you want to send ?',
      type: 'list',
      choices: assets
    }]
    inquirer.prompt(listAsset).then(function (assetChosen) {
      assetChosen = JSON.parse(assetChosen.assetId)
      callback(assetChosen.AssetId, assetChosen.Amount)
    })
  }
}
