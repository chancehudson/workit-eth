// @flow

require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const invariant = require('invariant');

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});


bot.on('message', (msg: Discord.Message) => {
  // Ignore other bots
  if (msg.author.bot) return;

  if (msg.content === 'ping') {
    return msg.reply('pong');
  }

  msg.channel.send(`What's up bitch`);
});

invariant(process.env.BOT_TOKEN, 'No bot token supplied in env file');
bot.login(process.env.BOT_TOKEN);
