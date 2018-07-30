// @flow

exports.help = (contractAddress: string, contractUrl: string) => `
Contract address: ${contractAddress}

View on etherscan: ${contractUrl}

Usage:
  ping: pong!

  status : Display information about the current week.

  account : Generate account or load account and show balance.

  register (days) (ether) : Register to work it for a certain number of days per week using a certain amount of ethereum.
    Example use: "register 5 0.5"
    Registers for 5 days of exercise per week with 0.5 ether
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

exports.currentBalance = (address: string, etherscanUrl: string, tokenBalance: number, ethBalance: number) => `
Your address is ${address}

View on etherscan: ${etherscanUrl}/address/${address}

You have:
${tokenBalance} WIT
${ethBalance} ETH
`;

exports.needsAddress = `
You don't seem to have an address. You can generate one by typing 'generateAddress'.
`;

exports.imageUploaded = (ipfsUrl: string) => `
Uploaded image to IPFS, view at ${ipfsUrl}

Sending proof transaction...
`;

exports.proofConfirmed = (etherscanUrl: string, txId: string) => `
Your proof has been uploaded, you can view the transaction here:

${etherscanUrl}/tx/${txId}
`;

exports.status = (weekNumber: number, dayNumber: number, totalPeople: number, totalTokens: number, totalPeopleCompleted: number) => `
Welcome to WorkIt!

We are currently on day ${dayNumber} of week ${weekNumber}.

There ${totalPeople == 1 ? 'is' : 'are'} ${totalPeople} ${totalPeople == 1 ? 'person' : 'people'} committed this week with a total of ${totalTokens} WIT tokens staked.

${totalPeopleCompleted} persons have finished their commitments for this week!
`;
