const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../../Schema/user.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
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
      return 35 + (level * 15);
    }

    function generateLevelBar(xp, level) {
      const totalBars = 20;
      const xpForNextLevel = getXpForNextLevel(level);
      const filledBars = Math.floor((xp / xpForNextLevel) * totalBars);
      const emptyBars = totalBars - filledBars;
      return `${'■'.repeat(filledBars)}${'□'.repeat(emptyBars)}`;
    }

    const levelBar = generateLevelBar(user.xp, user.lvl);
    const xpForNextLevel = getXpForNextLevel(user.lvl);
    const embed = new EmbedBuilder()
      .setTitle(`Rank - ${targetUser.username}`)
      .setDescription(`
        **Level:** ${user.lvl}
        **XP:** ${user.xp}/${xpForNextLevel}
        **Progress:** \`\`\`${levelBar}\`\`\`
      `)
      .setColor('#303136')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    interaction.reply({ embeds: [embed] });
  },
};