// @flow

exports.help = `
Usage:
  ping: pong!

  generateAddress: Generates an ethereum public key and dm's you the private key. You can use this with the myetherwallet website at https://www.myetherwallet.com/#send-transaction

  buy (number) tokens: Initiates a purchase for number of tokens. Use it like 'buy 10 tokens'.

  balance: Show you current token balance.
`;

exports.generatedAddress = (address: string) => `
I generated the following address for you: ${address}
I sent the private key to you in a DM.
`;

exports.generatedAddressDM = (publicKey: string, privateKey: string) => `
This is your public key: ${publicKey}
This is your private key: ${privateKey}
Make sure to keep it a secret, you can use it here: https://www.myetherwallet.com/#send-transaction
`;

exports.alreadyHasAddress = (address: string) => `
You already have an ethereum address registered: ${address}

Check your DM for the private key.
`;

exports.currentBalance = (balance: number) => `
You have ${balance} WIT tokens in your wallet.
`;

exports.needsAddress = `
You don't seem to have an address. You can generate one by typing 'generateAddress'.
`;
