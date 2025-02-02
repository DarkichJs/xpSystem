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
            inactive: 1
        });
    } else {
        user.messages += 1;
        user.inactive = (user.inactive || 0) + 1;
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

        if (config.xpsystem) {
            const levelUpEmbed = new EmbedBuilder()
                .setAuthor({name: `LEVEL UP - ${message.author.username}`, iconURL: config.icons.levelUp})
                .setDescription(`**${message.author}, you leveled up to level \`${user.lvl}\`!**`)
                .setColor("#303136")
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

            const levelUpChannelId = config.levelupchannel;
            const levelUpChannel = message.guild.channels.cache.get(levelUpChannelId);

            if (levelUpChannel) {
                levelUpChannel.send({ embeds: [levelUpEmbed] }).catch(error => {
                    if (error.code !== 50013) {
                        console.error('Failed to send level up message:', error);
                    }
                });
            } else {
                console.error('Level up channel not found.');
            }
        }

        const roles = config.roles;
        const perLevel = config.perlevel;

        if (perLevel) {
            if (roles[user.lvl]) {
                const role = message.guild.roles.cache.get(roles[user.lvl]);
                if (role) {
                    const previousRoles = Object.values(roles).filter(r => r !== roles[user.lvl]);
                    message.member.roles.remove(previousRoles).catch(console.error);
                    message.member.roles.add(role).catch(console.error);
                }
            }
        }
    }

    const roles = config.roles;
    const perMessage = config.perMessage;

    if (perMessage) {
        const userMessages = user.messages;
        const roleLevels = Object.keys(roles).map(Number).filter(msgCount => msgCount <= userMessages);
        const assignableMessageCount = Math.max(...roleLevels);
        if (isFinite(assignableMessageCount)) {
            const roleId = roles[assignableMessageCount];
            const role = message.guild.roles.cache.get(roleId);
            if (role) {
                const previousRoles = Object.values(roles).filter(r => r !== roleId);
                message.member.roles.remove(previousRoles).catch(console.error);
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
