const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const User = require("../../Schema/user.js");
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription(`Profile`)
    .addUserOption((option) =>
      option.setName("user").setDescription(`User`).setRequired(false)
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser("user") || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);
      let user_find = await User.findOne({ userID: user.id });
      if(!user_find) {
        user_find = await User.create({
          userID: user.id,
          messages: 0,
          xp: 0,
          lvl: 0,
        });
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Profile - ${user.tag}`,
          iconURL: config.icons.profile
        })
        .setColor("#303136")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }));

      if (config.xpsystem) {
        function getXpForNextLevel(level) {
          return 100 + (level - 1) * 50;
        }

        function generateLevelBar(xp, level) {
          const totalBars = 20;
          const xpForNextLevel = getXpForNextLevel(level) || 1;
          const progress = xp / xpForNextLevel;
          const filledBars = Math.round(Math.min(progress, 1) * totalBars);
          const emptyBars = totalBars - filledBars;
          return `${"■".repeat(filledBars)}${"□".repeat(emptyBars)}`;
        }

        const levelBar = generateLevelBar(user_find.xp, user_find.lvl);
        embed.setDescription(`
          \`\`\`・Messages: ${user_find.messages}\`\`\`
          \`\`\`・XP: ${user_find.xp}\`\`\`
          \`\`\`・Level: ${user_find.lvl}\`\`\`
          \`\`\`${levelBar}\`\`\`
        `);
      } else {
        embed.setDescription(`
          \`\`\`・Messages: ${user_find.messages}\`\`\`
        `);
      }

      interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      interaction.reply({ content: "An error occurred.", ephemeral: true });
    }
  },
};
