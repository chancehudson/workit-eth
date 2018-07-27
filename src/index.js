// @flow

require('dotenv').config();
const fs = require('fs');
const _ = require('lodash');
const Discord = require('discord.js');
const bot = new Discord.Client();
const invariant = require('invariant');
const Web3 = require('web3');
invariant(process.env.RPC_URL, 'No web3 rpc url supplied')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const contractABI = JSON.parse(fs.readFileSync(`${process.cwd()}/abi.json`, 'utf9'));
invariant(process.env.CONTRACT_ADDRESS, 'No contract address supplied in .env');
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

const messages = require('./messages');

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

const registerRegex = /register ([a-zA-Z0-9]*)/;
const buyRegex = /buy\s*(\d*)\s*tokens/i;

bot.on('message', async (msg: Discord.Message) => {
  // Ignore other bots
  if (msg.author.bot) return;


  switch (msg.content) {
    case 'ping':
      return msg.reply('pong');
    case 'help':
      return msg.reply(messages.help);
    case 'generateAddress':
      if (await userHasAddress(msg.author)) {
        const account = await getAccountForUser(msg.author);
        return msg.reply(messages.alreadyHasAddress(account.address));
      }
      const key = web3.eth.accounts.create();
      msg.reply(messages.generatedAddress(key.address));
      const dm = await userDM(msg.author);
      return dm.send(messages.generatedAddressDM(key.address, key.privateKey));
    case 'register':
      if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
      const account = await getAccountForUser(msg.author);
      const tx = {
        from: account.address,
        to: CONTRACT_ADDRESS,
        data: contract.methods.register(3).encodeABI(),
        gas: '300000',
        gasPrice: web3.utils.toWei('1', 'gwei'),
        value: web3.utils.toWei('0.2')
      };
      const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
      const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      console.log(receipt);
      return msg.reply(JSON.stringify(receipt));
    case 'balance':
      if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
      const _account = await getAccountForUser(msg.author);
      const balance = await contract.methods.balanceOf(_account.address).call();
      return msg.reply(messages.currentBalance(balance))
    case 'account':
      if (!await userHasAddress(msg.author)) return msg.reply(messages.needsAddress);
      return msg.reply((await getAccountForUser(msg.author)).address);
    default:
      break;
  }
  // if (buyRegex.test(msg.content)) {
  //   const tokenCount = msg.content.match(buyRegex)[1];
  // } else if (msg.content === 'balance') {
  //
  // }
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
  const privateKey = addressMessage.content.match(privateKeyRegex)[0];
  return web3.eth.accounts.privateKeyToAccount(privateKey);
}

invariant(process.env.BOT_TOKEN, 'No bot token supplied in env file');
bot.login(process.env.BOT_TOKEN);
