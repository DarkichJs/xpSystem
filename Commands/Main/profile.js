const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const User = require("../../Schema/user.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("sprofile")
    .setDescription(`Profile`)
    .addUserOption((option) =>
      option.setName("user").setDescription(`User`).setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    let user_find = await User.findOne({
      userID: user.id,
    });
    if(!user_find) {
      user_find = await User.create({
        userID: user.id,
        messages: 0,
        xp: 0,
        lvl: 0,
      });
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

    const levelBar = generateLevelBar(user_find.xp, user_find.lvl);
    const xpForNextLevel = getXpForNextLevel(user_find.lvl);
    const xpPerMessage = 7; 
    const messagesToNextLevel = Math.ceil((xpForNextLevel - user_find.xp) / xpPerMessage);

    const embed = new EmbedBuilder()
      .setAuthor({name: `Profile - ${user.tag}`, iconURL: 'https://cdn.discordapp.com/emojis/1305439515518701599.webp?size=96'})
      .setDescription(`
        \`\`\`・User: ${user.globalName}\`\`\` 
        \`\`\`・Messages: ${user_find.messages} -> Left: ${messagesToNextLevel}\`\`\`
        \`\`\`・XP: ${user_find.xp}\`\`\`
        \`\`\`・Level: ${user_find.lvl}\`\`\`
        \`\`\`${levelBar}\`\`\`
        `)
      .setColor("#303136")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))

    interaction.reply({ embeds: [embed] });
  },
};
