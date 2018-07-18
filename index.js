// @flow

require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', msg => {
  // Ignore other bots
  if (msg.author.bot) return;

  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

bot.login(process.env.CLIENT_SECRET);
