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

const messages = require('./messages');

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

node.on('error', err => console.log('Error from IPFS', err));

const registerRegex = /register\s+([0-9])\s+(\d*\.?\d*)/i;
const buyRegex = /buy\s*(\d*)\s*tokens/i;

bot.on('message', async (msg: Discord.Message) => {
  // Ignore other bots
  if (msg.author.bot) return;

  if (msg.attachments.array().length) {
    const attachment = msg.attachments.array()[0];
    if (attachment.message.content.indexOf(bot.user.id) !== -1) {
      const uploaded = await uploadUrlToIPFS(msg.attachments.array()[0].url);
      return msg.reply(`Uploaded image to IPFS at ${uploaded.path}\nYou can view this in a browser at https://ipfs.io/ipfs/${uploaded.path}`);
    }
  }

  switch (msg.content) {
    case 'ping':
      return msg.reply('pong');
    case 'help':
      return msg.reply(messages.help);
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
      return msg.reply(messages.currentBalance(tokenBalance, ethBalance));
    default:
      break;
  }

  if (registerRegex.test(msg.content)) {
    const matchResults = msg.content.match(registerRegex);
    invariant(matchResults && matchResults.length >= 3, 'Invalid match');
    const days = matchResults[1];
    const ether = matchResults[2];
    if (Number(days) < 3) {
      return msg.reply(`You have to sign up for more than 3 days per week.`);
    } else if (Number(days) > 7) {
      return msg.reply(`You can't register for more than 7 days per week.`);
    }
    if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
    const account = await getAccountForUser(msg.author);
    const weiBalance = await web3.eth.getBalance(account.address);
    const ethBalance = web3.utils.fromWei(weiBalance);
    if (Number(ether) < 0.2) {
      return msg.reply(`You have to register with more than 0.2 eth.`);
    } else if (Number(ether) >= ethBalance) {
      return msg.reply(`You only have ${ethBalance} eth available.`);
    }

    const tx = {
      from: account.address,
      to: CONTRACT_ADDRESS,
      data: contract.methods.register(days).encodeABI(),
      gas: '300000',
      gasPrice: web3.utils.toWei('1', 'gwei'),
      value: web3.utils.toWei(`${ether}`)
    };
    const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    msg.reply(`I've generated a transaction and am sending it. I'll message you when the transaction is complete.`);
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    return msg.reply(`Transaction complete, view at ${await getEtherscanUrl()}/tx/${receipt.transactionHash}`);
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
