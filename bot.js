const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fetch = require('node-fetch');
const { URL } = require('url');

const prefix = config.prefix;
const ranks = config.ranks;

client.once('ready', () => {
	console.log('Ready!');
});

client.login(config.discordToken);

client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot)	return;

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	switch (command) {
	case 'rank':
		setRoleByRank(message, args);
		break;
	default:
		break;
	}
});

async function getData(message, url) {
	try {
		const response = await fetch(new URL(url), {
			headers: {
				'X-Riot-Token': config.riotToken,
			},
		});
		const json = await response.json();
		return json;
	} catch (error) {
		console.log(error);
		message.reply(`There was an error processing the request! Please try again in a few minutes, or contact an admin via ${message.guild.channels.get(config.channels.help).toString()} if the issue persists!`);
	}
}

async function getSummonerData(message, args) {
	const summonerName = args.join('');
	console.log('Getting data for ' + summonerName);
	const summonerDataURL = 'https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + summonerName;

	const summonerData = await getData(message, summonerDataURL);

	return summonerData;
}

async function setRoleByRank(message, args, summonerData = null) {
	if (message.channel.id === config.channels.role || message.channel.id === config.channels.debug) {
		if (!summonerData) {
			summonerData = await getSummonerData(message, args);
		}

		const rankDataURL = 'https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + summonerData.id;

		getData(message, rankDataURL).then(rankData => {
			let soloQueueRankData = null;

			for (let key in rankData) {
				let currData = rankData[key];
				if (currData.queueType === 'RANKED_SOLO_5x5') {
					soloQueueRankData = currData;
				}
			}

			if (soloQueueRankData) {
				const formattedTier = soloQueueRankData.tier.charAt(0) + soloQueueRankData.tier.slice(1).toLowerCase();

				const role = message.guild.roles.find(r => r.name === formattedTier);
				const member = message.member;

				if(message.member.roles.has(role.id)) {
					message.reply('You are currently ' + formattedTier + ' ' + soloQueueRankData.rank + '. You already have that role!');
				} else {
					for (let key in ranks) {
						let rank = ranks[key];
						let currRank = message.guild.roles.find(r => r.name === rank);
						if(message.member.roles.has(currRank.id)) {
							member.removeRole(currRank).catch(console.error);
						}
					}

					member.addRole(role).catch(console.error);
					message.reply('You are currently ' + formattedTier + ' ' + soloQueueRankData.rank + '. Assigning role!');
				}
			} else {
				message.reply(`Can't find a Solo Queue rank for that summoner name! Please try again in a few minutes, or contact an admin via ${message.guild.channels.get(config.channels.help).toString()} if the issue persists!`);
			}
		});
	}
}