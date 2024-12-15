const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const User = require('../../Schema/user.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync message counts, XP, levels, and roles for all users')
    .addStringOption(option =>
      option
        .setName('channelid')
        .setDescription('ID of the channel to sync messages from')
        .setRequired(false)
    ),

  async execute(interaction) {
    const adminIds = ['479889258623139851'];
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const guild = interaction.guild;
    const messageCounts = {};
    const channelId = interaction.options.getString('channelid');
    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      return interaction.editReply({ content: 'Specified channel not found.' });
    }

    const botMember = guild.members.me;
    if (!botMember || !channel.permissionsFor(botMember).has([
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
    ])) {
      console.log(`Missing permissions for channel ${channel.name} (${channel.id}).`);
      return interaction.editReply({ content: 'Missing permissions for the specified channel.' });
    }

    console.log(`Starting message synchronization for channel ${channel.name} (${channel.id}).`);

    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) {
        options.before = lastId;
      }

      try {
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
      } catch (error) {
        console.error(`Failed to fetch messages for channel ${channel.name} (${channel.id}):`, error);
        break;
      }
    }

    console.log(`Finished fetching messages. Updating user data...`);

    for (const [userId, count] of Object.entries(messageCounts)) {
      const member = guild.members.cache.get(userId);
      if (!member) {
        continue;
      }

      let user = await User.findOne({ userID: userId });
      if (!user) {
        user = new User({
          userID: userId,
          messages: count,
          xp: 0,
          lvl: 0,
        });
        console.log(`Added new user ${userId} with ${count} messages.`);
      } else {
        user.messages = count;
        console.log(`Updated user ${userId} with ${count} messages.`);
      }

      user.xp = user.messages * config.xpPerMessage;

      function getXpForNextLevel(level) {
        return 100 + (level - 1) * 50;
      }

      let totalXp = user.xp;
      let level = 0;
      while (totalXp >= getXpForNextLevel(level + 1)) {
        totalXp -= getXpForNextLevel(level + 1);
        level += 1;
      }

      user.lvl = level;
      user.xp = totalXp;

      await user.save();
      const perLevel = config.perlevel;
      const perMessage = config.perMessage;
      const levelRoles = config.roles;
      const userLevel = user.lvl;
      const userMessages = user.messages;

      const allLevelRoleIds = Object.values(levelRoles);
      await member.roles.remove(allLevelRoleIds).catch(console.error);

      if (perLevel) {
        const roleLevels = Object.keys(levelRoles).map(Number).filter(lvl => lvl <= userLevel);
        const assignableLevel = Math.max(...roleLevels);
        if (isFinite(assignableLevel)) {
          const newRoleId = levelRoles[assignableLevel];
          const newRole = guild.roles.cache.get(newRoleId);
          if (newRole) {
            await member.roles.add(newRole).catch(console.error);
          }
        }
      } else if (perMessage) {
        const roleMessages = Object.keys(levelRoles).map(Number).filter(msgCount => msgCount <= userMessages);
        const assignableMessageCount = Math.max(...roleMessages);
        if (isFinite(assignableMessageCount)) {
          const newRoleId = levelRoles[assignableMessageCount];
          const newRole = guild.roles.cache.get(newRoleId);
          if (newRole) {
            await member.roles.add(newRole).catch(console.error);
          }
        }
      }

      console.log(`Updated user ${userId}: ${count} messages, level ${user.lvl}, ${user.xp} XP.`);
    }

    console.log('Synchronization complete.');
    interaction.editReply({ content: 'Message counts, XP, levels, and roles have been synchronized.' });
  },
};