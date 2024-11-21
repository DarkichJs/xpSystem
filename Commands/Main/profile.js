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
    .setName("profile")
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
        status: false,
      });
    }
    const statusText = user_find.status ? 'protected' : 'not protected';
    const embed = new EmbedBuilder()
      .setAuthor({name: `Profile - ${user.tag}`, iconURL: 'https://cdn.discordapp.com/emojis/1305439461949313035.webp?size=96'})
      .setDescription(`
        \`\`\`User: ${user.globalName}\`\`\` 
        \`\`\`Messages: ${user_find.messages}/200\`\`\`
        \`\`\`Status: ${statusText}\`\`\`
        `)
      .setColor("#303136")
    interaction.reply({ embeds: [embed] });
  },
};
