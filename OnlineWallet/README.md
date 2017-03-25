Online Wallet - Bitcoin/ColoredCoins protocol (testnet)
=======================

This online wallet is aim to get the public features of an hd wallet for the colored coins protocol.

In this wallet no private seed is at stake. This hd wallet only holds the public node of the master seed.

While creating the wallet for the first time you only need to paste the public node to get it running. You can get it from the Offline wallet.

With this wallet you can show your balances for all of your addresses and you can derived your accounts and addresses to get new addresses. It is aim to be an interface to manage your addresses and create new one to ask new payments.

For all the signing and broadcasting you should use the Online wallet.

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

# Install NPM dependencies
npm install

# Start the app
node index.js
```

License
-------

The MIT License (MIT)

Copyright (c) Guigs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
