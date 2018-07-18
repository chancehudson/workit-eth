// @flow

require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const invariant = require('invariant');
const Web3 = require('web3');
invariant(process.env.RPC_URL, 'No web3 rpc url supplied')
const web3 = new Web3(new Web3.providers.HttpProvider(`http://${process.env.RPC_URL}:8545`));

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

const registerRegex = /register ([a-zA-Z0-9]*)/;

bot.on('message', (msg: Discord.Message) => {
  // Ignore other bots
  if (msg.author.bot) return;

  if (msg.content === 'ping') {
    return msg.reply('pong');
  } else if (msg.content === 'help') {
    return msg.reply(`
      Usage:
        register [address] - registers an ethereum address to your username
    `);
  } else if (registerRegex.test(msg.content)) {
    const match = msg.content.match(registerRegex);
    if (match === null) return;
    invariant(match, 'matched address is null or undefined');
    const address = match[1];
    if (web3.utils.isAddress(address)) {
      return msg.reply(`Address ${address} verified`);
    } else {
      return msg.reply(`${address} is not a valid ethereum address`);
    }
  }
});

invariant(process.env.BOT_TOKEN, 'No bot token supplied in env file');
bot.login(process.env.BOT_TOKEN);
