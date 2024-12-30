const { Collection, joinVoiceChannel, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const commands = require('../../index');
const os = require("os");
const chalk = require("chalk");
const osu = require('node-os-utils');
const cron = require('node-cron');
const User = require('../../Schema/user.js');
const ResetTime = require('../../Schema/resetTime.js');

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
    try {
      let resetDoc = await ResetTime.findOne({});
      if (!resetDoc) {
        resetDoc = new ResetTime({ lastResetTime: Date.now().toString() });
        await resetDoc.save();
      }

      const lastResetStamp = Number(resetDoc.lastResetTime) || 0;
      const nowStamp = Date.now();

      if (nowStamp - lastResetStamp >= 3 * 24 * 60 * 60 * 1000) {
        const users = await User.find({});
        const Whitelist = require('../../Schema/whitelist.js');

        for (const user of users) {
          const member = await client.guilds.cache.first().members.fetch(user.userID).catch(() => null);
          if (!member) continue;

          const autoWhitelistRoles = [
            '1316189343999852657',
            '1315812987071758357',
            '1299853085480587416',
            '1273248219442319380',
            '1320845203179044904'
          ];

          if (autoWhitelistRoles.some(roleId => member.roles.cache.has(roleId))) {
            console.log(`Skipping auto-whitelisted user ${member.user.tag}`);
            continue;
          }

          const whitelisted = await Whitelist.findOne({ userID: user.userID });
          if (whitelisted) {
            console.log(`Skipping whitelisted user ${member.user.tag}`);
            continue;
          }

          let messageThreshold = 350;
          if (member.roles.cache.has('1123482262684581920')) {
            messageThreshold = 250;
          } else if (member.roles.cache.has('1285154122743550005')) {
            messageThreshold = 100;
          }

          const inactiveRole = await client.guilds.cache.first().roles.fetch('1322442902756003840');
          if (user.threedays < messageThreshold) {
            if (inactiveRole && !member.roles.cache.has(inactiveRole.id)) {
              await member.roles.add(inactiveRole);
              console.log(`Added inactive role to ${member.user.tag}`);
            }
          } else {
            if (inactiveRole && member.roles.cache.has(inactiveRole.id)) {
              await member.roles.remove(inactiveRole);
              console.log(`Removed inactive role from ${member.user.tag}`);
            }
          }
        }

        resetDoc.lastResetTime = nowStamp.toString();
        await resetDoc.save();
      }
    } catch (error) {
      console.error('Error in message check cron job:', error);
    }
  });
};