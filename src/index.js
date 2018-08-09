// @flow

require('dotenv').config();
const fs = require('fs');
const _ = require('lodash');
const Discord = require('discord.js');
const bot = new Discord.Client();
const invariant = require('invariant');
const IPFS = require('ipfs');
const node = new IPFS();
const axios = require('axios');
const Web3 = require('web3');
invariant(process.env.RPC_URL, 'No web3 rpc url supplied')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const contractABI = JSON.parse(fs.readFileSync(`${process.cwd()}/abi.json`, 'utf8'));
invariant(process.env.CONTRACT_ADDRESS, 'No contract address supplied in .env');
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
//
// contract.events.Log((err: any, event: any) => {
//   console.log(err);
//   if (!event) return;
//   console.log(event);
// });

const messages = require('./messages');
const TOTAL_GAS = 150000;
const GAS_PRICE = web3.utils.toWei('45', 'gwei');

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

node.on('error', err => console.log('Error from IPFS', err));

const registerRegex = /register\s+([0-9])\s+(\d+)/i;
const buyRegex = /buy\s+(\d+)\s+tokens/i;

bot.on('message', async (msg: Discord.Message) => {
  // Ignore other bots
  if (msg.author.bot) return;

  // Upload proof
  if (msg.attachments.array().length) {
    const attachment = msg.attachments.array()[0];
    if (attachment.message.content.indexOf(bot.user.id) !== -1) {
      if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
      const uploaded = await uploadUrlToIPFS(msg.attachments.array()[0].url);
      msg.reply(messages.imageUploaded(`https://ipfs.io/ipfs/${uploaded.path}`));
      const account = await getAccountForUser(msg.author);
      const weiBalance = await web3.eth.getBalance(account.address);
      const ethBalance = web3.utils.fromWei(weiBalance);

      const estimatedGas = await contract.methods.postProof(uploaded.path).estimateGas({
        from: account.address
      });
      const tx = {
        from: account.address,
        to: CONTRACT_ADDRESS,
        data: contract.methods.postProof(uploaded.path).encodeABI(),
        gas: estimatedGas,
        gasPrice: GAS_PRICE
      };
      const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
      const activeTx = web3.eth.sendSignedTransaction(signed.rawTransaction);
      activeTx.once('confirmation', async (confirmationNumber: number, receipt: any) => {
        if (!receipt.status) return;
        msg.reply(messages.proofConfirmed(await getEtherscanUrl(), receipt.transactionHash));
      });
      activeTx.catch(err => {
        msg.reply(`There was an error posting your proof to the contract.\n${err}`);
      });
      return;
    }
  }

  switch (msg.content) {
    case 'ping':
      return msg.reply('pong');
    case 'help':
      return msg.reply(messages.help(CONTRACT_ADDRESS, `${await getEtherscanUrl()}/address/${CONTRACT_ADDRESS}`));
    case 'account':
      if (!await userHasAddress(msg.author)) {
        const key = web3.eth.accounts.create();
        msg.reply(messages.generatedAddress(key.address));
        const dm = await userDM(msg.author);
        dm.send(messages.generatedAddressDM(key.address, key.privateKey));
      }
      const _account = await getAccountForUser(msg.author);
      const tokenBalance = await contract.methods.balanceOf(_account.address).call();
      const weiBalance = await web3.eth.getBalance(_account.address);
      const ethBalance = web3.utils.fromWei(weiBalance);
      return msg.reply(messages.currentBalance(_account.address, await getEtherscanUrl(), tokenBalance, ethBalance));
    case 'status':
      if (!await userHasAddress(msg.author)) {
        const key = web3.eth.accounts.create();
        msg.reply(messages.generatedAddress(key.address));
        const dm = await userDM(msg.author);
        dm.send(messages.generatedAddressDM(key.address, key.privateKey));
      }
      const __account = await getAccountForUser(msg.author);
      const currentWeek = await contract.methods.currentWeek().call();
      const currentDay = await contract.methods.currentDayOfWeek().call();
      const data = await contract.methods.dataPerWeek(currentWeek).call();
      return msg.reply(messages.status(currentWeek, currentDay, data.totalPeople, data.totalTokens, data.totalPeopleCompleted));
    default:
      break;
  }

  if (registerRegex.test(msg.content)) {
    const matchResults = msg.content.match(registerRegex);
    invariant(matchResults && matchResults.length >= 3, 'Invalid match');
    const days = matchResults[1];
    const tokens = matchResults[2];
    if (Number(days) < 3) {
      return msg.reply(`You have to sign up for 3 or more days per week.`);
    } else if (Number(days) > 7) {
      return msg.reply(`You can't register for more than 7 days per week.`);
    }
    if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
    const account = await getAccountForUser(msg.author);
    // const estimatedGas = await contract.methods.commitToWeek(days, tokens).estimateGas({
    //   from: account.address
    // });
    const tx = {
      from: account.address,
      to: CONTRACT_ADDRESS,
      data: contract.methods.commitToWeek(tokens, days).encodeABI(),
      gas: TOTAL_GAS,
      gasPrice: GAS_PRICE
    };
    const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    msg.reply(`I've generated a transaction and am sending it. I'll message you when the transaction is complete.`);
    const activeTx = web3.eth.sendSignedTransaction(signed.rawTransaction);
    activeTx.once('confirmation', async (confirmationNumber: number, receipt: any) => {
      if (!receipt.status) return;
      msg.reply(`You've been registered for ${days} days of activity this week.\nYou staked ${tokens} WIT tokens on completing this goal.\n\nView transaction here: ${await getEtherscanUrl()}/tx/${receipt.transactionHash}`);
    });
    activeTx.catch(err => msg.reply(`There was a problem registering you: ${err}`));
    return;
  } else if (buyRegex.test(msg.content)) {
    const matchResults = msg.content.match(buyRegex);
    invariant(matchResults && matchResults.length >= 2, 'Invalid match');
    const tokens = Number(matchResults[1]);
    if (isNaN(tokens)) return msg.reply('I received NaN for your token count...');
    if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
    const account = await getAccountForUser(msg.author);
    const weiBalance = await web3.eth.getBalance(account.address);
    const weiPerToken = await contract.methods.weiPerToken.call().call();
    if (weiBalance < weiPerToken * tokens) {
      msg.reply(`You don't have enough ether to purchase these tokens. Send some to your address.`);
      return;
    }
    const estimatedGas = await contract.methods.buyTokens(`${tokens}`).estimateGas({
      from: account.address,
      value: tokens * weiPerToken
    });
    const tx = {
      from: account.address,
      to: CONTRACT_ADDRESS,
      value: tokens * weiPerToken,
      data: contract.methods.buyTokens(`${tokens}`).encodeABI(),
      gasPrice: GAS_PRICE,
      gas: estimatedGas
    };
    const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    const activeTx = web3.eth.sendSignedTransaction(signed.rawTransaction);
    msg.reply(`Broadcasting transaction, I'll ping you when it's confirmed.`);
    activeTx.once('confirmation', (confirmationNumber: number, receipt: any) => {
      if (!receipt.status) return;
      msg.reply(`Your purchase of ${tokens} tokens has been processed. Type "account" to see your current balances.`);
    });
    activeTx.catch(err => {
      msg.reply(`There was a problem processing your purchase: ${err}`);
    });
  }
});

async function userDM(user: Discord.User) {
  if (user.dmChannel) return user.dmChannel;
  return await user.createDM();
}

async function userHasAddress(user: Discord.User) {
  try {
    await getAccountForUser(user);
    return true;
  } catch (err) {
    return false;
  }
}

async function getAccountForUser(user: Discord.User) {
  const dm = await userDM(user);
  const messages = await dm.fetchMessages({
    'limit': 100
  });
  const privateKeyRegex = /0x[0-9a-fA-F]{64}/m;
  const addressMessage = _.find(messages.array(), message => privateKeyRegex.test(message.content));
  if (!addressMessage) throw new Error('No address found');
  const match = addressMessage.content.match(privateKeyRegex);
  invariant(match && match.length >= 1, 'No private key found in content.');
  const privateKey = match[0];
  return web3.eth.accounts.privateKeyToAccount(privateKey);
}

async function uploadUrlToIPFS(url: string) {
  const result = await axios.get(url, {
    responseType: 'arraybuffer'
  });
  const buffer = Buffer.from(result.data, 'binary');
  const files = await node.files.add(buffer);
  return files[0];
}

async function getEtherscanUrl() {
  const networkId = await web3.eth.net.getId();
  if (networkId === 4) {
    return `https://rinkeby.etherscan.io`;
  } else if (networkId === 1) {
    return `https://etherscan.io`;
  } else {
    invariant(false, `Unsupported networkId received "${networkId}"`);
  }
}

invariant(process.env.BOT_TOKEN, 'No bot token supplied in env file');
bot.login(process.env.BOT_TOKEN);
