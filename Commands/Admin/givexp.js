const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../../Schema/user.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('givexp')
    .setDescription('Give XP to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to give XP to')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('The amount of XP to give')
        .setRequired(true)),

  async execute(interaction) {
    const adminIds = ['356238807156391936', '479889258623139851'];
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    let user = await User.findOne({ userID: targetUser.id });
    if (!user) {
      user = new User({
        userID: targetUser.id,
        messages: 0,
        xp: 0,
        lvl: 0,
      });
    }

    user.xp += amount;

    function getXpForNextLevel(level) {
      return 35 + (level * 15);
    }

    let xpForNextLevel = getXpForNextLevel(user.lvl);
    while (user.xp >= xpForNextLevel) {
      user.xp -= xpForNextLevel;
      user.lvl += 1;
      xpForNextLevel = getXpForNextLevel(user.lvl);
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setTitle('XP Given')
      .setDescription(`Gave **${amount}** XP to **${targetUser.tag}**. They are now level **${user.lvl}** with **${user.xp}** XP.`)
      .setColor('#303136');

    interaction.reply({ embeds: [embed] });
  },
};