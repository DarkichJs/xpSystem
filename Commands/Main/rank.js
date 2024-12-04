const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../../Schema/user.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('srank')
    .setDescription('Display your rank, XP, level, and progress bar')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to display the rank for')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userID: targetUser.id });

    if (!user) {
      return interaction.reply({ content: 'User not found.', ephemeral: true });
    }

    function getXpForNextLevel(level) {
      return 100 + (level - 1) * 50;
  }
  

    function generateLevelBar(xp, level) {
      const totalBars = 20;
      const xpForNextLevel = getXpForNextLevel(level) || 1; 
      const progress = xp / xpForNextLevel;
      const filledBars = Math.round(Math.min(progress, 1) * totalBars);
      const emptyBars = totalBars - filledBars;
      return `${'■'.repeat(filledBars)}${'□'.repeat(emptyBars)}`;
    }

    const levelBar = generateLevelBar(user.xp, user.lvl);
    const xpForNextLevel = getXpForNextLevel(user.lvl);
    const embed = new EmbedBuilder()
      .setAuthor({name: `Rank - ${targetUser.username}`, iconURL: 'https://cdn.discordapp.com/emojis/1304721428217860106.webp?size=96'})  
      .setDescription(`
        **・Level:** ${user.lvl}
        **・XP:** ${user.xp}/${xpForNextLevel}
        **・Progress:** \`\`\`${levelBar}\`\`\`
      `)
      .setColor('#303136')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    interaction.reply({ embeds: [embed] });
  },
};