const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');
const ResetTime = require('../../Schema/resetTime.js');
const Whitelist = require('../../Schema/whitelist.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('threedays')
    .setDescription('List how many messages users wrote in the last 3 days'),

  async execute(interaction) {
    try {
      if (!config.adminIds.includes(interaction.user.id) && interaction.user.id !== '479889258623139851') {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const autoWhitelistRoles = [
        '1316189343999852657',
        '1315812987071758357',
        '1299853085480587416',
        '1273248219442319380',
        '1320845203179044904'
      ];

      const allUsers = await User.find().sort({ threedays: -1 }).lean();
      const allWhitelists = await Whitelist.find({});
      const whitelistedSet = new Set(allWhitelists.map(w => w.userID));

      let filteredUsers = [];
      for (const u of allUsers) {
        const member = interaction.guild.members.cache.get(u.userID);
        if (!member) continue;
        if (whitelistedSet.has(u.userID)) continue;
        if (autoWhitelistRoles.some(r => member.roles.cache.has(r))) continue;
        filteredUsers.push(u);
      }

      let page = 1;
      const itemsPerPage = 10;
      const roleIdToRemove = '1322442902756003840';

      await interaction.deferReply();

      const updatePage = async (currentPage, users = filteredUsers) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageUsers = users.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
          .setTitle('3-Day Messages')
          .setColor('#303136');

        if (pageUsers.length === 0) {
          embed.setDescription('No users found on this page.');
        } else {
          embed.setDescription(
            pageUsers.map((u, i) => {
              const position = startIndex + i + 1;
              return `${position}. <@${u.userID}> - **Messages (3 days):** ${u.threedays || 0}`;
            }).join('\n')
          );
        }

        embed.setFooter({ text: `Page ${currentPage} of ${Math.ceil(users.length / itemsPerPage)}` });

        const buttonRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('threedays_prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 1),
            new ButtonBuilder()
              .setCustomId('threedays_next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(endIndex >= users.length),
            new ButtonBuilder()
              .setCustomId('threedays_resetAll')
              .setLabel('Remove Role & Reset')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('threedays_reissueRole')
              .setLabel('regive role')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('threedays_inactiveSort')
              .setLabel('Sort Inactive')
              .setStyle(ButtonStyle.Secondary)
          );

        return { embeds: [embed], components: [buttonRow] };
      };

      const initialMessage = await interaction.editReply(await updatePage(page));

      const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'This is not for you.', ephemeral: true });
        }

        if (i.customId === 'threedays_prev') {
          page = Math.max(1, page - 1);
          await i.update(await updatePage(page));
        } else if (i.customId === 'threedays_next') {
          page = Math.min(Math.ceil(filteredUsers.length / itemsPerPage), page + 1);
          await i.update(await updatePage(page));
        } else if (i.customId === 'threedays_resetAll') {
          await i.deferUpdate();

          const guild = interaction.guild;
          const roleToRemove = guild.roles.cache.get(roleIdToRemove);
          if (roleToRemove) {
            const membersWithRole = roleToRemove.members;
            for (const member of membersWithRole.values()) {
              await member.roles.remove(roleToRemove).catch(() => null);
            }
            await User.updateMany({}, { $set: { threedays: 0 } });
          }

          let resetDoc = await ResetTime.findOne({});
          if (!resetDoc) {
            resetDoc = new ResetTime({ lastResetTime: Date.now().toString() });
          } else {
            resetDoc.lastResetTime = Date.now().toString();
          }
          await resetDoc.save();

          collector.stop();
          await interaction.editReply({ content: 'Role removed from all, `threedays` reset, and new 3-day cycle started.', embeds: [], components: [] });
        } else if (i.customId === 'threedays_reissueRole') {
          await i.deferUpdate();
          try {
            const guild = interaction.guild;
            const inactiveRole = guild.roles.cache.get(roleIdToRemove);
            const allUsers = await User.find({});

            const WhitelistModel = require('../../Schema/whitelist.js');
            const allWhitelists = await WhitelistModel.find({});
            const whitelistedSet = new Set(allWhitelists.map(w => w.userID));

            for (const user of allUsers) {
              const member = guild.members.cache.get(user.userID);
              if (!member) continue;

              if (autoWhitelistRoles.some(roleId => member.roles.cache.has(roleId))) {
                continue;
              }
              if (whitelistedSet.has(user.userID)) {
                continue;
              }

              let messageThreshold = 175;
              if (member.roles.cache.has('1123482262684581920')) {
                messageThreshold = 125;
              } else if (member.roles.cache.has('1285154122743550005')) {
                messageThreshold = 50;
              }

              if (user.threedays < messageThreshold) {
                if (inactiveRole && !member.roles.cache.has(inactiveRole.id)) {
                  await member.roles.add(inactiveRole).catch(() => null);
                }
              } else {
                if (inactiveRole && member.roles.cache.has(inactiveRole.id)) {
                  await member.roles.remove(inactiveRole).catch(() => null);
                }
              }
            }

            await interaction.editReply({ content: 'Regive ended', embeds: [], components: [] });
            collector.stop();
          } catch (error) {
            console.error('Error reissuing role:', error);
            await interaction.followUp({ content: 'Error', ephemeral: true });
          }
        } else if (i.customId === 'threedays_inactiveSort') {
          await i.deferUpdate();
          const guild = i.guild;
          const inactiveRole = guild.roles.cache.get(roleIdToRemove);
          filteredUsers = filteredUsers.filter(u => {
            const memberCheck = guild.members.cache.get(u.userID);
            return memberCheck && inactiveRole && memberCheck.roles.cache.has(inactiveRole.id);
          });
          page = 1;
          await i.editReply(await updatePage(page, filteredUsers));
        }
      });

      collector.on('end', async () => {
        try {
          await interaction.editReply({ components: [] });
        } catch {}
      });
    } catch (error) {
      console.error('Error in threedays command:', error);
      return interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
};