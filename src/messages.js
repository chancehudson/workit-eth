// @flow

exports.help = `
Usage:
  ping: pong!

  account : Generate account or load account and show balance.

  register (days) (ether) : Register to work it for a certain number of days per week using a certain amount of ethereum.
    Example use: register 5 0.5
    ^ Registers for 5 days of exercise per week with 0.5 ether
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

exports.currentBalance = (tokenBalance: number, ethBalance: number) => `
You have
${tokenBalance} WIT
${ethBalance} ETH
`;

exports.needsAddress = `
You don't seem to have an address. You can generate one by typing 'generateAddress'.
`;
