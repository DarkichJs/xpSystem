const { Collection, joinVoiceChannel, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const commands = require('../../index');
const os = require("os");
const chalk = require("chalk");
const osu = require('node-os-utils');
const cron = require('node-cron');
const User = require('../../Schema/user.js');

module.exports = (client) => {

  let cpu = osu.cpu;
  cpu.usage().then(info => {
    console.log(chalk.green(`・ Cpu Usage: `) + chalk.red(info));
    console.log(chalk.bgBlue("--------------------------------------------"));
    console.log(chalk.bgRed("SYSTEM DEVELOPED BY darkich"));
    console.log(chalk.bgBlue("--------------------------------------------"));
  });

  console.log(chalk.green(`・ Bot name:`), chalk.red(`${client.user.tag}`));
  client.guilds.cache.forEach((guild) => {
    client.application.commands.set(commands, guild.id).catch((err) => console.log(err));
    client.guildConfigs = new Collection();
  });
  cron.schedule('0 0 * * *', async () => {
    const users = await User.find();
    users.forEach(async (user) => {
      user.messages = 0;
      user.status = false;
      await user.save();
    });
    console.log(chalk.green('All users messages have been reset.'));
  }, {
    timezone: "America/New_York"
  });
};