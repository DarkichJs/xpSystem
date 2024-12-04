const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ssync')
    .setDescription('Sync message counts for all users'),

  async execute(interaction) {
    const adminIds = config.adminIds;
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const guild = interaction.guild;
    const messageCounts = {};

    const channels = guild.channels.cache.filter(c => c.isTextBased());

    for (const channel of channels.values()) {
      let lastId;

      while (true) {
        const options = { limit: 100 };
        if (lastId) {
          options.before = lastId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
          break;
        }

        messages.forEach(message => {
          if (!message.author.bot) {
            if (!messageCounts[message.author.id]) {
              messageCounts[message.author.id] = 0;
            }
            messageCounts[message.author.id] += 1;
          }
        });

        lastId = messages.last().id;
      }
    }

    for (const [userId, count] of Object.entries(messageCounts)) {
      let user = await User.findOne({ userID: userId });
      if (!user) {
        user = new User({
          userID: userId,
          messages: count,
          xp: 0,
          lvl: 0,
        });
      } else {
        user.messages = count;
      }
      await user.save();
    }

    interaction.editReply({ content: 'Message counts have been synchronized.' });
  },
};