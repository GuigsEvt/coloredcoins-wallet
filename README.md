Online Wallet - Bitcoin/ColoredCoins protocol (testnet)
=======================

This wallet is aimed to get all the features of a wallet including the colored coins protocol features.

It is separated in two wallet. One called "OnlineWallet" that is containing only public information about your wallet. It only allows the user to create new addresses and accounts and get the balances. Even if compromised there is no risk for your funds.

The other wallet called "OfflineWallet" is containing all the private data of the wallet. It contains the seed and is able to create transaction, sign them and broadcast them to the network.

To create your hdwallet you must first initialize your OfflineWallet and then create the OnlineWallet from the neutered public node. You get the neutered public node from the OfflineWallet.

There is one README.rm for each wallet to get better understanding of the wallet.

Prerequisites
-------------

[Node.js 6.0+](http://nodejs.org)

[Redis 3.2.8+](https://redis.io/download)

Getting Started
---------------

```bash
# Download the project and go to the directory

# First open a terminal and start redis server
redis-server

# Create one terminal for each wallet
cd OnlineWallet
npm install
node index.js

cd OfflineWallet
npm install
node index.js
```

License
-------

The MIT License (MIT)

Copyright (c) Guigs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
