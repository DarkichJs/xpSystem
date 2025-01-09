const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display the leaderboard'),

  async execute(interaction) {
    try {
      let category = 'messages';
      let page = 1;
      const itemsPerPage = 10;

      if (!config.xpsystem) {
        category = 'messages';
      }

      const categories = {
        level: 'Level',
        messages: 'Messages'
      };

      const updateLeaderboard = async () => {
        try {
          const sortField = category === 'level' ? 'lvl' : category;
          const users = await User.find()
            .sort({ [sortField]: -1 })
            .limit(itemsPerPage)
            .skip((page - 1) * itemsPerPage);

          const embed = new EmbedBuilder()
            .setTitle(`Leaderboard - ${categories[category]}`)
            .setColor('#303136');

          const description = users.map((user, index) => {
            const position = index + 1 + (page - 1) * itemsPerPage;
            try {
              const discordUser = interaction.client.users.cache.get(user.userID) || `<@${user.userID}>`;
              return `${position}. ${discordUser} - **${categories[category]}**: ${user[sortField]}`;
            } catch {
              return `${position}. Unknown User (${user.userID}) - **${categories[category]}**: ${user[sortField]}`;
            }
          }).join('\n');

          embed.setDescription(description || 'No users found for this category.');

          const buttonRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(users.length < itemsPerPage)
            );

          const selectMenuRow = new ActionRowBuilder()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('category_select')
                .setPlaceholder('Select Category')
                .addOptions(
                  { label: 'Level', value: 'level' },
                  { label: 'Messages', value: 'messages' }
                )
            );

          await interaction.editReply({
            embeds: [embed],
            components: [buttonRow, selectMenuRow]
          });
        } catch (error) {
          console.error(error);
          await interaction.editReply({
            content: 'An error occurred while updating the leaderboard.',
            components: []
          });
        }
      };

      await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('\u200B').setColor('#303136')],
        ephemeral: false
      });

      await updateLeaderboard();

      const filter = i =>
        (i.customId === 'prev_page' || i.customId === 'next_page' || i.customId === 'category_select')
        && i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        try {
          await i.deferUpdate();
        } catch (err) {
          if (err.rawError?.code === 10008) {
            console.log("Message was deleted or is no longer accessible.");
            return;
          }
          console.error(err);
        }
      
        if (i.customId === 'prev_page') {
          page = Math.max(1, page - 1);
        } else if (i.customId === 'next_page') {
          page += 1;
        } else if (i.customId === 'category_select') {
          category = i.values[0];
          page = 1;
        }
      
        await updateLeaderboard();
      });

      collector.on('end', async () => {
        try {
          await interaction.editReply({ components: [] });
        } catch (err) {
          if (err.rawError?.code === 10008) {
            console.log("Cannot edit reply after collector ended (message not found).");
          } else {
            console.error(err);
          }
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'An error occurred while executing the command.',
        ephemeral: true
      });
    }
  }
};
