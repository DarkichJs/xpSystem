const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');
const ResetTime = require('../../Schema/resetTime.js');
const Whitelist = require('../../Schema/whitelist.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inactive')
    .setDescription('List how many messages users wrote in the last 3 days'),

  async execute(interaction) {
    try {
      if (!config.adminIds.includes(interaction.user.id) && interaction.user.id !== '479889258623139851') {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const autoWhitelistRoles = config.autoWhitelistRoles;

      await User.updateMany({ incative: { $exists: false } }, { $set: { incative: 0 } });

      const allUsers = await User.find()
        .sort({ inactive: -1 }) 
        .lean();

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
      const roleIdToRemove = config.inactiveRoleId

      await interaction.deferReply();

      const updatePage = async (currentPage, users = filteredUsers) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageUsers = users.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
          .setTitle('Inactive Messages')
          .setColor('#303136');

        if (pageUsers.length === 0) {
          embed.setDescription('No users found on this page.');
        } else {
          embed.setDescription(
            pageUsers.map((u, i) => {
              const position = startIndex + i + 1;
              return `${position}. <@${u.userID}> - **Messages (inactive):** ${u.inactive || 0}`;
            }).join('\n')
          );
        }

        embed.setFooter({ text: `Page ${currentPage} of ${Math.ceil(users.length / itemsPerPage)}` });

        const buttonRow1 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('incative_prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 1),
            new ButtonBuilder()
              .setCustomId('incative_next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(endIndex >= users.length),
            new ButtonBuilder()
              .setCustomId('incative_resetAll')
              .setLabel('Remove Role & Reset')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('incative_reissueRole')
              .setLabel('regive role')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('incative_inactiveSort')
              .setLabel('Sort Inactive')
              .setStyle(ButtonStyle.Secondary)
          );

        // const buttonRow2 = new ActionRowBuilder()
        //   .addComponents(
        //     new ButtonBuilder()
        //       .setCustomId('incative_sync')
        //       .setLabel('Synchronize')
        //       .setStyle(ButtonStyle.Secondary)
        //   );

        return { embeds: [embed], components: [buttonRow1] };
      };

      const initialMessage = await interaction.editReply(await updatePage(page));

      const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'This is not for you.', ephemeral: true });
          }

          // Create a function to handle the response safely
          const handleResponse = async (action) => {
            try {
              await i.deferUpdate();
              await action();
            } catch (err) {
              if (err.code === 40060) {
                // Interaction already acknowledged, try to edit the reply directly
                await action();
              } else if (err.code === 10062) {
                // Unknown interaction, do nothing
                console.log('Interaction expired');
              } else {
                throw err;
              }
            }
          };

          if (i.customId === 'incative_prev') {
            await handleResponse(async () => {
              page = Math.max(1, page - 1);
              await i.editReply(await updatePage(page));
            });
          } else if (i.customId === 'incative_next') {
            await handleResponse(async () => {
              page = Math.min(Math.ceil(filteredUsers.length / itemsPerPage), page + 1);
              await i.editReply(await updatePage(page));
            });
          } else if (i.customId === 'incative_resetAll') {
            await handleResponse(async () => {
              const guild = interaction.guild;
              const roleToRemove = guild.roles.cache.get(roleIdToRemove);
              if (roleToRemove) {
                const membersWithRole = roleToRemove.members;
                for (const member of membersWithRole.values()) {
                  await member.roles.remove(roleToRemove).catch(() => null);
                }
                await User.updateMany({}, { $set: { inactive: 0 } });
              }

              let resetDoc = await ResetTime.findOne({});
              if (!resetDoc) {
                resetDoc = new ResetTime({ lastResetTime: Date.now().toString() });
              } else {
                resetDoc.lastResetTime = Date.now().toString();
              }
              await resetDoc.save();

              collector.stop();
              await i.editReply({ content: 'Role removed from all, `inactive` reset, and new cycle started.', embeds: [], components: [] });
            });
          } else if (i.customId === 'incative_reissueRole') {
            const guild = interaction.guild;
            const inactiveRole = guild.roles.cache.get(roleIdToRemove);
            const allUsers = await User.find({});

            const WhitelistModel = require('../../Schema/whitelist.js');
            const allWhitelists = await WhitelistModel.find({});
            const whitelistedSet = new Set(allWhitelists.map(w => w.userID));

            for (const user of allUsers) {
              const member = guild.members.cache.get(user.userID);
              if (!member) continue;

              if (autoWhitelistRoles.some(roleId => member.roles.cache.has(roleId))) continue;
              if (whitelistedSet.has(user.userID)) continue;

              const messageThresholds = config.messageThreshold;
              let messageThreshold = config.messageThresholddefault;

              for (const [roleId, threshold] of Object.entries(messageThresholds)) {
                if (member.roles.cache.has(roleId)) {
                  messageThreshold = threshold;
                  break;
                }
              }

              if (user.inactive < messageThreshold) {
                if (inactiveRole && !member.roles.cache.has(inactiveRole.id)) {
                  await member.roles.add(inactiveRole).catch(() => null);
                }
              } else {
                if (inactiveRole && member.roles.cache.has(inactiveRole.id)) {
                  await member.roles.remove(inactiveRole).catch(() => null);
                }
              }
            }

            await i.editReply({ content: 'Role reissue complete', embeds: [], components: [] });
            collector.stop();
          } else if (i.customId === 'incative_inactiveSort') {
            await handleResponse(async () => {
              const guild = i.guild;
              const inactiveRole = guild.roles.cache.get(roleIdToRemove);
              filteredUsers = filteredUsers.filter(u => {
                const memberCheck = guild.members.cache.get(u.userID);
                return memberCheck && inactiveRole && memberCheck.roles.cache.has(inactiveRole.id);
              });
              page = 1;
              await i.editReply(await updatePage(page, filteredUsers));
            });
          }
        } catch (error) {
          console.error('Error in interaction collector:', error);
          // Only log non-interaction errors
          if (error.code !== 10062 && error.code !== 40060) {
            console.error(error);
          }
        }
      });

      collector.on('end', async () => {
        try {
          const message = await interaction.fetchReply();
          if (message) {
            await interaction.editReply({ components: [] }).catch(() => {});
          }
        } catch (err) {
          console.log('Failed to remove components on collector end');
        }
      });
    } catch (error) {
      console.error('Error in incative command:', error);
      return interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
};