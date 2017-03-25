// -- crypto.js --> aimed to encrypt and decrypt seed and password
// Ressources: http://lollyrock.com/articles/nodejs-encryption/

var crypto = require('crypto')
var file = require('./file')

module.exports = {
  computePassword: function (password) {
    var pass = crypto.doubleSha256(password)
    file.readJSON(function (err, response) {
      if (err) {
        console.log('Problem reading seed file: ' + err)
      }
      if (response['pass'] === pass) {
        return true
      }
      return false
    })
  },
  encryptSeed: function (seed, pass) {
    var cipher = crypto.createCipher('aes-256-ctr', pass)
    var crypted = cipher.update(seed, 'utf8', 'hex')
    crypted += cipher.final('hex')
    return crypted
  },
  decryptSeed: function (encryptedSeed, pass) {
    var decipher = crypto.createDecipher('aes-256-ctr', pass)
    var seed = decipher.update(encryptedSeed, 'hex', 'utf8')
    seed += decipher.final('utf8')
    return seed
  },
  doubleSha256: function (data) {
    var sha = crypto.createHash('sha256').update(data).digest()
    sha = crypto.createHash('sha256').update(sha).digest('hex')
    return sha
  }
}
