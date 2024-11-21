const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const User = require('../../Schema/user.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kicklb")
        .setDescription(`Kick Leaderboard`),

    async execute(interaction) {
        const users = await User.find().sort({ messages: -1 }).exec();
        const notProtectedUsers = users.filter(user => !user.status);
        const protectedUsers = users.filter(user => user.status);

        let description = '';

        if (notProtectedUsers.length > 0) {
            description += '**Not Protected Users:**\n';
            notProtectedUsers.forEach((user, index) => {
                description += `${index + 1}. <@${user.userID}> - ${user.messages} messages\n`;
            });
        } else {
            description += 'No users with status "not protected".\n';
        }

        if (protectedUsers.length > 0) {
            description += '\n**Protected Users:**\n';
            protectedUsers.forEach((user, index) => {
                description += `${index + 1}. <@${user.userID}> - ${user.messages} messages\n`;
            });
        } else {
            description += '\nNo users with status "protected".\n';
        }

        const embed = new EmbedBuilder()
            .setTitle('Kick Leaderboard')
            .setDescription(description)
            .setColor('#303136');

        interaction.reply({ embeds: [embed] });
    },
};