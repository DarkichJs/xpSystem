const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('test'),

  async execute(interaction) {
    const adminIds = ['479889258623139851'];
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    console.log('Starting total XP to messages conversion...');
    
    function getXpForNextLevel(level) {
      return 100 + (level - 1) * 50;
    }

    function calculateTotalXp(level, currentXp) {
      let totalXp = currentXp || 0;
      // Add XP from all completed levels
      for (let i = 1; i <= level; i++) {
        totalXp += getXpForNextLevel(i);
      }
      return totalXp;
    }

    const allUsers = await User.find();
    
    for (const user of allUsers) {
      const totalXp = calculateTotalXp(user.lvl || 0, user.xp || 0);
      const calculatedMessages = Math.floor(totalXp / config.xpPerMessage);
      
      console.log(`User ${user.userID}:
        Level: ${user.lvl || 0}
        Current XP: ${user.xp || 0}
        Total XP (including levels): ${totalXp}
        Current messages: ${user.messages || 0}
        Calculated messages: ${calculatedMessages}
      `);

      user.messages = calculatedMessages;
      user.inactive = calculatedMessages;
      await user.save();
    }

    console.log('Conversion complete');
    await interaction.editReply({ content: 'All users have been updated based on their total XP including levels.', ephemeral: true });

  },
};