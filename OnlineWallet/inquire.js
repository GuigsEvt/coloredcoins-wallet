var inquirer = require('inquirer')

var questionIndex = [{
  name: 'indexChoice',
  message: 'What do you want to do ?',
  type: 'list',
  choices: ['Display accounts/addresses',
    'Create new account',
    'Create new address',
    'Quit'],
  filter: function (str) {
    switch (str) {
      case 'Display accounts/addresses':
        return 1
      case 'Create new account':
        return 2
      case 'Create new address':
        return 3
      case 'Quit':
        return -1
    }
  }
}]

module.exports = {
  home: function (callback) {
    inquirer.prompt(questionIndex).then(function (answers) {
      callback(answers)
    })
  },
  accountToLogTo: function (accounts, callback) {
    var selectAccount = [{
      name: 'selectedAccount',
      message: 'To which index account do you want to log in ?',
      type: 'list',
      choices: accounts
    }]
    inquirer.prompt(selectAccount).then(function (answers) {
      callback(answers.selectedAccount)
    })
  },
  addressToAccess: function (addresses, callback) {
    var address = [{
      name: 'selectedAddress',
      message: 'Which address ?',
      type: 'list',
      choices: addresses
    }]
    inquirer.prompt(address).then(function (answers) {
      callback(answers.selectedAddress)
    })
  },
  newMasterNode: function (callback) {
    var masterNode = [{
      name: 'masterNodeKey',
      message: 'What is the master public node 111-digit number of the wallet ?'
    }]
    inquirer.prompt(masterNode).then(function (answer) {
      callback(answer.masterNodeKey)
    })
  },
  listAccounts: function (accounts, callback) {
    var account = [{
      name: 'account',
      message: 'From which account do you wanna derive ?',
      type: 'list',
      choices: accounts
    }]
    inquirer.prompt(account).then(function (answerAccount) {
      callback(answerAccount.account)
    })
  }
}
