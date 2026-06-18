require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] 
});

const commands = [
    new SlashCommandBuilder().setName('drop').setDescription('Ödüllü drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Ödül ismi').setRequired(true)),
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (1m, 1h)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.')
].map(c => c.toJSON());

client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log(`${c.user.tag} aktif!`);
});

let aktifDrop = null;

client.on('interactionCreate', async interaction => {
    // 1. TICKET PANELİ
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticketpanel') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_secim').setPlaceholder('Talebinize uygun kategoriyi seçin...')
                .addOptions([
                    // New categories based on images
                    { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '💖' },
                    { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁' },
                    { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💰' },
                    { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝' },
                    { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧' },
                    { label: 'Bug Bildiri', value: 'bug', emoji: '🐛' },
                    { label: 'İstek & Öneri', value: 'istek_oneri', emoji: '📝' },
                    { label: 'Şikayet', value: 'sikayet', emoji: '💥' },
                    { label: 'Diğer', value: 'diger', emoji: '❓' },
                    { label: 'Reklam', value: 'reklam', emoji: '📢' },
                    { label: 'gmail ver owo kazan', value: 'gmail_owo', emoji: '📧' }
                ])
        );
        const embed = new EmbedBuilder()
            // Updated title and description based on images
            .setTitle('💜 CrackerSpace — Destek Merkezi')
            .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n' +
                '💖 **Çekiliş Kazandım** — Çekiliş ödülünü talep etmek için\n' +
                '🎁 **Drop Kazandım** — Drop ödüllerini teslim almak için\n' +
                '💰 **Hesap Satın Alıcam** — Güvenli hesap satın alma için\n' +
                '🤝 **Partnerlik & İşbirliği** — Ortaklık görüşmeleri için\n' +
                '🔧 **Teknik Destek** — Bot veya sistem sorunları için\n' +
                '🐛 **Bug Bildiri** — Hata bildirmek istiyorsan\n' +
                '📝 **İstek & Öneri** — Öneri ve isteklerin için\n' +
                '💥 **Şikayet** — Şikayet bildirmek istiyorsan\n' +
                '📢 **Reklam** — Reklam talepleriniz için\n' +
                '📧 **gmail ver owo kazan** — OwO kazanmak istiyorsan\n' +
                '❓ **Diğer** — Diğer tüm talepler için\n\n' +
                '⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**\n\n' +
                '⚠️ **Önemli Uyarılar**\n' +
                '• Yan sunucudan banlanma sebebiyle ticket açarsanız buradan da banlanırsınız.\n' +
                '• Yetkili ekibini gereksiz etiketlemek yasak ve ban sebebidir.')
            .setColor('#2F3136')
            .setThumbnail('https://cdn.discordapp.com/icons/1504445537724923944/a_6c1c1f062d592f6b865582a898495a43.webp') // Example image
            .setFooter({ text: 'CrackerSpace • @r2xzzs • 30.05.2026 16:16' }); // Example timestamp
        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // TICKET OLUŞTURMA VE KAPATMA DÜĞMESİ
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_secim') {
        const k = interaction.values[0];
        await interaction.deferReply({ ephemeral: true });
        const ch = await interaction.guild.channels.create({ name: `ticket-${k}-${interaction.user.username}`, type: 0,
            permissionOverwrites: [{ id: interaction.guild.id, deny: ['ViewChannel'] }, { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }]
        });
        const kapatRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('kapat_ticket').setLabel('🔒 Ticket\'ı Kapat').setStyle(ButtonStyle.Danger));
        await ch.send({ content: `Hoş geldin ${interaction.user}, **${k}** ile ilgili yetkililer seninle ilgilenecek.`, components: [kapatRow] });
        await interaction.editReply({ content: `Kanalınız açıldı: ${ch}` });
    }

    if (interaction.isButton() && interaction.customId === 'kapat_ticket') {
        await interaction.reply('Bu kanal 5 saniye içinde silinecektir...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }

    // 2. DROP
    if (interaction.isChatInputCommand() && interaction.commandName === 'drop') {
        if (aktifDrop) return interaction.reply({ content: 'Zaten aktif bir drop var!', ephemeral: true });
        aktifDrop = interaction.options.getString('gorunen');
        const embed = new EmbedBuilder().setTitle('🎉 BLACK & MARKET DROP! 💜').setDescription(`🎁 **Ödül:** ${aktifDrop}\n\n👑 *Butona ilk tıklayan kapar!*`).setColor('#5865F2');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('drop_kap').setLabel('🎉 ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success));
        const res = await interaction.reply({ embeds: [embed], components: [row] });
        res.createMessageComponentCollector({ filter: i => i.customId === 'drop_kap', max: 1 }).on('collect', async i => {
            await i.deferUpdate();
            const ticketRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🎫 TICKET AÇ').setURL('https://discord.com/channels/1504445537724923944/1504450075235979374').setStyle(ButtonStyle.Link));
            await interaction.editReply({ content: `🎉 **Kazanan:** ${i.user}\n🎁 Ödül: **${aktifDrop}**`, embeds: [], components: [ticketRow] });
            aktifDrop = null;
        });
    }

    // 3. ÇEKİLİŞ
    if (interaction.isChatInputCommand() && interaction.commandName === 'cekilis') {
        const dur = interaction.options.getString('sure');
        const count = interaction.options.getInteger('kazanan_sayisi');
        const prize = interaction.options.getString('odul');
        const msDur = ms(dur);
        if (!msDur) return interaction.reply({ content: 'Geçersiz süre!', ephemeral: true });
        const embed = new EmbedBuilder().setTitle('🎉 ÇEKİLİŞ BAŞLADI 🎉').setDescription(`Ödül: **${prize}**\nKazanan: **${count}**\nSüre: **${dur}**`).setColor('#FF0000');
        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
        await reply.react('🎉');
        setTimeout(async () => {
            const users = (await (await interaction.channel.messages.fetch(reply.id)).reactions.cache.get('🎉').users.fetch()).filter(u => !u.bot);
            if (users.size < count) return interaction.followUp('Yeterli katılım yok, çekiliş iptal.');
            const w = Array.from(users.values()).sort(() => 0.5 - Math.random()).slice(0, count).map(w => w.toString()).join(', ');
            const resEmbed = new EmbedBuilder().setTitle('🎉 ÇEKİLİŞ SONA ERDİ 🎉').setDescription(`Tebrikler ${w}! 🎉\n🎁 **Ödül:** ${prize}\n⚠️ **Önemli:** Ödülünüzü teslim almak için ticket açın. **1 gün süreniz var!**`).setColor('#00FF00');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🎫 TICKET AÇ').setURL('https://discord.com/channels/1504445537724923944/1504450075235979374').setStyle(ButtonStyle.Link));
            await interaction.followUp({ embeds: [resEmbed], components: [row] });
        }, msDur);
    }
});

client.login(process.env.TOKEN);