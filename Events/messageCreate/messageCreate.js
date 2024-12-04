const { Collection, joinVoiceChannel, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const os = require("os");
const chalk = require("chalk");
const osu = require('node-os-utils');
const User = require('../../Schema/user.js'); 
const config = require('../../config.json');

module.exports = async (client, message) => {
    if (message.author.bot) return; 

    const excludedChannels = config.excludedChannels;

    if (excludedChannels.includes(message.channel.id)) return;

    let user = await User.findOne({ userID: message.author.id });

    if (!user) {
        user = new User({
            userID: message.author.id,
            messages: 1,
            xp: 0,
            lvl: 0,
        });
    } else {
        user.messages += 1;
    }

    function getXpForNextLevel(level) {
        return 100 + (level - 1) * 50;
    }
    
    user.xp = (user.xp || 0) + config.xpPerMessage;

    let xpForNextLevel = getXpForNextLevel(user.lvl);
    while (user.xp >= xpForNextLevel) {
        user.xp -= xpForNextLevel;
        user.lvl += 1;
        xpForNextLevel = getXpForNextLevel(user.lvl);
        const levelUpEmbed = new EmbedBuilder()
            .setAuthor({name: `LEVEL UP - ${message.author.username}`, iconURL: 'https://cdn.discordapp.com/emojis/1299860143999156224.webp?size=96&animated=true'})
            .setDescription(`**${message.author}, you leveled up to level \`${user.lvl}\`!**`)
            .setColor("#303136")
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        message.channel.send({ embeds: [levelUpEmbed] }).then(sentMessage => {
            setTimeout(() => {
                sentMessage.delete().catch(console.error);
            }, 10000); 
        });

        const roles = config.roles;

        if (roles[user.lvl]) {
            const role = message.guild.roles.cache.get(roles[user.lvl]);
            if (role) {
                message.member.roles.add(role).catch(console.error);
            }
        }
    }

    try {
        await user.save();
    } catch (error) {
        console.error(chalk.red('Error:'), error);
    }
};
