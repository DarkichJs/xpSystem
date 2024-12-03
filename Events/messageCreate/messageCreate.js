const { Collection, joinVoiceChannel, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const os = require("os");
const chalk = require("chalk");
const osu = require('node-os-utils');
const User = require('../../Schema/user.js'); 

module.exports = async (client, message) => {
    if (message.author.bot) return; 

    const excludedChannels = [
        '1297531012233953300',
        '1297548077195984906',
        '1304325987894562836',
        '1297869789498310748',
        '1297585983478562928',
        '1307890048347279461',
        '1300530265403297914'
    ];

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
        return 50 * level + 50; 
    }
    
    user.xp = (user.xp || 0) + 2; 

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

        const roles = {
            5: '1152817072414404688',
            10: '1152817285803802684',
            15: '1152817700184268850',
            20: '1152817755649757256',
            25: '1152817954631725076'
        };

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
