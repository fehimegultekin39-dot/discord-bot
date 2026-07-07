require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField, Partials } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// ==========================================
//           SABİT YAPILANDIRMALAR
// ==========================================
const YETKILI_ROL_ID = '1520564676956655738';
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1469787899712241807/1521588401864704222';
// ==========================================

function parseTurkceSure(sure) {
    return sure
        .toLowerCase()
        .trim()
        .replace(/saniye|sn/g, 's') 
        .replace(/dakika|dk/g, 'm')
        .replace(/hafta/g, 'w')     
        .replace(/saat/g, 'h')     
        .replace(/gun|gün|g/g, 'd');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User
    ]
});

// SLASH KOMUTLARI TANIMLAMALARI
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('PC veya Telefondan direkt fotoğraf yükleyin').setRequired(false)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
    
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyi banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyi susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('anket').setDescription('Gelişmiş butonlu anket başlatır.').addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true)),

    // Ekonomi & Kumar Komutları
    new SlashCommandBuilder().setName('bakiye').setDescription('Mevcut coin miktarınızı görüntüler.').addUserOption(o => o.setName('kullanici').setDescription('Bakılacak kullanıcı')),
    new SlashCommandBuilder().setName('gunluk').setDescription('Günlük ücretsiz coin ödülünüzü alırsınız.'),
    new SlashCommandBuilder().setName('calis').setDescription('Bir meslek icra ederek coin kazanırsınız.'),
    new SlashCommandBuilder().setName('slot').setDescription('Slot makinesinde şansınızı denersiniz.').addIntegerOption(o => o.setName('bahis').setDescription('Yatırmak istediğiniz coin miktarı').setRequired(true).setMinValue(10)),
    new SlashCommandBuilder().setName('blackjack').setDescription('21 (Blackjack) oynayarak bahis yaparsınız.').addIntegerOption(o => o.setName('bahis').setDescription('Yatırmak istediğiniz coin miktarı').setRequired(true).setMinValue(10)),
    new SlashCommandBuilder().setName('yazi-tura').setDescription('Yazı tura oynarsınız.').addStringOption(o => o.setName('secim').setDescription('Yazı mı tura mı?').setRequired(true).addChoices({ name: 'Yazı', value: 'yazi' }, { name: 'Tura', value: 'tura' })).addIntegerOption(o => o.setName('bahis').setDescription('Yatırmak istediğiniz coin miktarı').setRequired(true).setMinValue(10)),
    new SlashCommandBuilder().setName('at-yarisi').setDescription('At yarışında bahis oynarsınız.').addIntegerOption(o => o.setName('bahis').setDescription('Yatırmak istediğiniz coin miktarı').setRequired(true).setMinValue(10))
].map(c => c.toJSON());

async function cekilisBitir(channelId, messageId) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri || veri.bitti === true) return; 

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

    await db.set(`cekilis_${messageId}.bitti`, true);

    const reaction = guncelMesaj.reactions.cache.get('🎉');
    if (!reaction) return;

    await reaction.users.fetch();
    const katilimcilar = reaction.users.cache.filter(u => !u.bot);

    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `Yetkili`;

    if (katilimcilar.size === 0) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nKatılımcı yetersiz olduğu için çekiliş iptal oldu.`)
            .setColor('#FF0000')
            .setFooter({ text: `stardebugX • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
            .setTimestamp();
        
        const rerollRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`cekilis_reroll_${messageId}`).setLabel('🔄 Yeniden Çek').setStyle(ButtonStyle.Secondary)
        );

        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [rerollRow] });
    }

    const kazananlar = katilimcilar.random(Math.min(veri.count, katilimcilar.size));
    const kazananMention = Array.isArray(kazananlar) ? kazananlar.map(u => u.toString()).join(', ') : kazananlar.toString();
    const bitisTimestamp = Math.floor(veri.bitisMs / 1000);

    const sonEmbed = new EmbedBuilder()
        .setTitle('🏆 ÇEKİLİŞ SONA ERDİ!')
        .setDescription(`**Ödül:** \`${veri.prize}\``)
        .addFields(
            { name: '👑 Kazanan(lar)', value: `> ${kazananMention}`, inline: true }, 
            { name: '🎟 Katılımcı', value: `\`${katilimcilar.size} kişi\``, inline: true },
            { name: '👤 Başlatan', value: `> ${baslatanUye}`, inline: false },
            { name: '📅 Çekiliş Zamanı', value: `*Başlangıç:* <t:${veri.simdi}:F>\n*Bitiş:* <t:${bitisTimestamp}:F>`, inline: false }
        )
        .setColor('#00FFAA')
        .setFooter({ text: `stardebugX • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
        .setTimestamp();

    const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cekilis_reroll_${messageId}`).setLabel('🔄 Yeniden Çek').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setLabel('Ödülü Almak İçin Ticket Aç').setStyle(ButtonStyle.Link).setURL(TICKET_KANAL_LINKI).setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
    await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** 💜`);
}

client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Slash komutları yenileniyor...');
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('Slash komutları başarıyla güncellendi!');
    } catch (error) {
        console.error('Komutlar yüklenirken hata oluştu:', error);
    }
    console.log(`${c.user.tag} aktif! (stardebugX ready)`);
});

// ETKİLEŞİM YAKALAYICI (INTERACTION CREATE)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        // SUNUCU YETKİLİSİ KONTROLÜ GEREKTİREN KOMUTLAR
        if (['drop', 'cekilis', 'ticketpanel', 'anket', 'ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Bu sistemi veya komutu kullanmak için yetkiniz yetersiz!', flags: MessageFlags.Ephemeral });
            }
        }

        // DROP KOMUTU
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            
            if (!gizliOdul && !gorselDosyası) {
                return interaction.reply({ content: '❌ **Hata:** Gizli bilgi veya görsel dosyası eklemelisiniz!', flags: MessageFlags.Ephemeral });
            }

            const gorselUrl = gorselDosyası ? gorselDosyası.url : null;
            const dropId = Date.now();
            
            await db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
                gizli: gizliOdul,
                gorsel: gorselUrl,
                baslatan: interaction.user.username,
                bitti: false
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`drop_${dropId}`).setLabel('ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success).setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 stardebugX DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülü kapar!*`)
                .setColor('#8A2BE2')
                .setFooter({ text: `stardebugX • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // TICKET PANEL KOMUTU
        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Destek konusu seçiniz...')
                    .addOptions([
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '💟' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲' },
                        { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🔵' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧' },
                        { label: 'Diğer', value: 'diger', emoji: '❓' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('💜 star debug ticket — Destek Merkezi')
                .setDescription('Merhaba! Yardım almak istediğiniz kategoriyi aşağıdaki menüden seçerek bir destek bileti oluşturabilirsiniz.')
                .setColor('#2F3136')
                .setFooter({ text: 'stardebugX Gelişmiş Bilet Sistemi' });

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // ÇEKİLİŞ KOMUTU
        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply(); 
            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
            
            let msDur = ms(parseTurkceSure(durInput));
            if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı!' });
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 stardebugX ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n⏳ **Bitiş:** <t:${bitis}:R>`)
                .setColor('#8A2BE2')
                .setFooter({ text: '🎉 emojisine tıklayarak katılın!' });
            
            const mesaj = await interaction.editReply({ embeds: [embed] });
            await mesaj.react('🎉');
            
            await db.set(`cekilis_${mesaj.id}`, {
                channelId: interaction.channel.id,
                prize: prize,
                count: count,
                simdi: simdi,
                bitisMs: bitisMs,
                bitti: false,
                baslatanId: interaction.user.id,
                baslatanTag: `@${interaction.user.username}`
            });

            setTimeout(async () => {
                await cekilisBitir(interaction.channel.id, mesaj.id);
            }, msDur);
        }

        // MODERASYON KOMUTLARI (BAN-MUTE vb.)
        if (interaction.commandName === 'ban') {
            const m = interaction.options.getMember('kisi');
            if (!m) return interaction.reply('Kullanıcı bulunamadı.');
            await m.ban().catch(() => null);
            await interaction.reply(`✅ ${m.user.tag} sunucudan banlandı.`);
        }
        if (interaction.commandName === 'unban') {
            const id = interaction.options.getString('kisi_id');
            await interaction.guild.members.unban(id).catch(() => null);
            await interaction.reply('✅ Belirtilen kullanıcının banı kaldırıldı.');
        }
        if (interaction.commandName === 'mute') {
            const m = interaction.options.getMember('kisi');
            const sureInput = interaction.options.getString('sure');
            let msDur = ms(parseTurkceSure(sureInput));
            if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre!', flags: MessageFlags.Ephemeral });
            
            await m.timeout(msDur, 'Mute Komutu').catch(() => null);
            await interaction.reply(`✅ ${m} kullanıcısı **${sureInput}** süresince susturuldu.`);
        }
        if (interaction.commandName === 'unmute') {
            const m = interaction.options.getMember('kisi');
            await m.timeout(null).catch(() => null);
            await interaction.reply(`✅ ${m} susturulması açıldı.`);
        }

        // ANKET KOMUTU
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const embed = new EmbedBuilder()
                .setTitle('📊 ANKET')
                .setDescription(`**Soru:** ${soru}\n\n🟩 **Evet** | 🟥 **Hayır**`)
                .setColor('#8A2BE2');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_e').setLabel('Evet').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('anket_h').setLabel('Hayır').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // ==========================================
        //        EKONOMİ VE KUMAR KOMUTLARI
        // ==========================================
        if (interaction.commandName === 'bakiye') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const bakiye = await db.get(`bakiye_${hedef.id}`) || 0;
            const bakiyeEmbed = new EmbedBuilder()
                .setTitle('💰 Bakiye Bilgisi')
                .setDescription(`${hedef} kullanıcısının toplam cüzdan bakiyesi:\n\n**💵 \`${bakiye.toLocaleString()}\` coin**`)
                .setColor('#FFD700')
                .setThumbnail(hedef.displayAvatarURL());
            return interaction.reply({ embeds: [bakiyeEmbed] });
        }

        if (interaction.commandName === 'gunluk') {
            const userId = interaction.user.id;
            const sonKullanim = await db.get(`gunluk_sure_${userId}`) || 0;
            const beklemeSuresi = 24 * 60 * 60 * 1000;

            if (Date.now() - sonKullanim < beklemeSuresi) {
                const kalanMs = beklemeSuresi - (Date.now() - sonKullanim);
                const kalanSaat = Math.ceil(kalanMs / (1000 * 60 * 60));
                return interaction.reply({ content: `❌ Günlük ödülünü zaten almışsın! Tekrar alabilmek için **${kalanSaat} saat** beklemelisin.`, flags: MessageFlags.Ephemeral });
            }

            const odul = Math.floor(Math.random() * 3000) + 1000;
            await db.add(`bakiye_${userId}`, odul);
            await db.set(`gunluk_sure_${userId}`, Date.now());
            const yeniBakiye = await db.get(`bakiye_${userId}`);

            const embed = new EmbedBuilder()
                .setTitle('📆 Günlük Ödül Alındı!')
                .setDescription(`**💵 Kazanılan:** \`${odul}\` coin\n**💰 Toplam Bakiye:** \`${yeniBakiye.toLocaleString()}\` coin`)
                .setColor('#00FF00');
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'calis') {
            const userId = interaction.user.id;
            const sonCalisma = await db.get(`calis_sure_${userId}`) || 0;
            if (Date.now() - sonCalisma < 60000) {
                return interaction.reply({ content: '❌ Çok yoruldun! Dinlenmek için biraz bekle.', flags: MessageFlags.Ephemeral });
            }

            const meslekler = [
                { isim: 'Balıkçı 🐟', min: 200, max: 800 },
                { isim: 'Madenci ⛏️', min: 400, max: 1000 },
                { isim: 'Yazılımcı 💻', min: 600, max: 1500 },
                { isim: 'Kurye 🛵', min: 150, max: 600 }
            ];
            const rastgeleMeslek = meslekler[Math.floor(Math.random() * meslekler.length)];
            const kazanc = Math.floor(Math.random() * (rastgeleMeslek.max - rastgeleMeslek.min)) + rastgeleMeslek.min;

            await db.add(`bakiye_${userId}`, kazanc);
            await db.set(`calis_sure_${userId}`, Date.now());
            const yeniBakiye = await db.get(`bakiye_${userId}`);

            const embed = new EmbedBuilder()
                .setTitle('👔 Meslek Başarı Bildirimi')
                .addFields(
                    { name: '💼 Meslek', value: rastgeleMeslek.isim, inline: true },
                    { name: '🪙 Kazanılan', value: `${kazanc} coin`, inline: true },
                    { name: '💰 Yeni Bakiye', value: `${yeniBakiye.toLocaleString()} coin`, inline: false }
                )
                .setColor('#1E90FF');
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'slot') {
            const userId = interaction.user.id;
            const bahis = interaction.options.getInteger('bahis');
            const bakiye = await db.get(`bakiye_${userId}`) || 0;

            if (bakiye < bahis) return interaction.reply({ content: '❌ Yetersiz coin!', flags: MessageFlags.Ephemeral });

            const slotlar = ['🍎', '🍊', '🍐', '🍋', '💎', '⭐'];
            const s1 = slotlar[Math.floor(Math.random() * slotlar.length)];
            const s2 = slotlar[Math.floor(Math.random() * slotlar.length)];
            const s3 = slotlar[Math.floor(Math.random() * slotlar.length)];

            let kazandi = false;
            let carpan = 0;

            if (s1 === s2 && s2 === s3) { kazandi = true; carpan = 3; }
            else if (s1 === s2 || s2 === s3 || s1 === s3) { kazandi = true; carpan = 1.5; }

            const embed = new EmbedBuilder().setTitle('🎰 Slot Makinesi');

            if (kazandi) {
                const odul = Math.floor(bahis * carpan);
                await db.add(`bakiye_${userId}`, odul);
                const sonBakiye = await db.get(`bakiye_${userId}`);
                embed.setDescription(`**[ ${s1} | ${s2} | ${s3} ]**\n\n🎉 **Tebrikler Kazandınız!**\n💵 **Kazanılan:** \`${odul}\` coin\n💰 **Güncel Bakiye:** \`${sonBakiye.toLocaleString()}\``).setColor('#00FF00');
            } else {
                await db.sub(`bakiye_${userId}`, bahis);
                const sonBakiye = await db.get(`bakiye_${userId}`);
                embed.setDescription(`**[ ${s1} | ${s2} | ${s3} ]**\n\n❌ **Maalesef Kaybettiniz!**\n📉 **Kaybedilen:** \`${bahis}\` coin\n💰 **Güncel Bakiye:** \`${sonBakiye.toLocaleString()}\``).setColor('#FF0000');
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'blackjack') {
            const userId = interaction.user.id;
            const bahis = interaction.options.getInteger('bahis');
            const bakiye = await db.get(`bakiye_${userId}`) || 0;

            if (bakiye < bahis) return interaction.reply({ content: '❌ Yetersiz bakiye!', flags: MessageFlags.Ephemeral });

            const oyuncuSkor = Math.floor(Math.random() * 11) + 11;
            const kasaSkor = Math.floor(Math.random() * 10) + 12;

            const embed = new EmbedBuilder().setTitle('🃏 Blackjack / 21');

            if (oyuncuSkor > 21) {
                await db.sub(`bakiye_${userId}`, bahis);
                embed.setDescription(`**BUST!** 21'i geçtiniz.\nDealer Skor: \`${kasaSkor}\`\nSenin Skor: \`${oyuncuSkor}\`\n\n❌ **Kaybettin:** \`-${bahis}\` coin`).setColor('#FF0000');
            } else if (kasaSkor > 21 || oyuncuSkor > kasaSkor) {
                await db.add(`bakiye_${userId}`, bahis);
                embed.setDescription(`**KAZANDIN!** Kasayı alt ettin.\nDealer Skor: \`${kasaSkor}\`\nSenin Skor: \`${oyuncuSkor}\`\n\n🎉 **Kazandın:** \`+${bahis}\` coin`).setColor('#00FF00');
            } else if (oyuncuSkor === kasaSkor) {
                embed.setDescription(`**Beraberlik!** Paranı geri aldın.\nDealer Skor: \`${kasaSkor}\`\nSenin Skor: \`${oyuncuSkor}\``).setColor('#FFFF00');
            } else {
                await db.sub(`bakiye_${userId}`, bahis);
                embed.setDescription(`**Kasa Kazandı!**\nDealer Skor: \`${kasaSkor}\`\nSenin Skor: \`${oyuncuSkor}\`\n\n❌ **Kaybettin:** \`-${bahis}\` coin`).setColor('#FF0000');
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'yazi-tura') {
            const userId = interaction.user.id;
            const secim = interaction.options.getString('secim');
            const bahis = interaction.options.getInteger('bahis');
            const bakiye = await db.get(`bakiye_${userId}`) || 0;

            if (bakiye < bahis) return interaction.reply({ content: '❌ Bakiyeniz yetersiz.', flags: MessageFlags.Ephemeral });

            const sonuclar = ['yazi', 'tura'];
            const sistemSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
            const embed = new EmbedBuilder().setTitle('🪙 Yazı-Tura Parası Atıldı');

            if (secim === sistemSonuc) {
                await db.add(`bakiye_${userId}`, bahis);
                embed.setDescription(`Para Döndü ve **${sistemSonuc.toUpperCase()}** Geldi!\n\n🎉 **Tebrikler bildiniz!**\n💰 \`+${bahis}\` coin eklendi.`).setColor('#00FF00');
            } else {
                await db.sub(`bakiye_${userId}`, bahis);
                embed.setDescription(`Para Döndü ve **${sistemSonuc.toUpperCase()}** Geldi...\n\n❌ **Yanlış tahmin!**\n📉 \`-${bahis}\` coin kaybettiniz.`).setColor('#FF0000');
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'at-yarisi') {
            const userId = interaction.user.id;
            const bahis = interaction.options.getInteger('bahis');
            const bakiye = await db.get(`bakiye_${userId}`) || 0;

            if (bakiye < bahis) return interaction.reply({ content: '❌ Paran kalmamış!', flags: MessageFlags.Ephemeral });

            const atlar = ['⚡ Yıldırım', '🔥 Ateş', '❄️ Rüzgar', '🌊 Fırtına'];
            const seninAtin = atlar[Math.floor(Math.random() * atlar.length)];
            const kazananAt = atlar[Math.floor(Math.random() * atlar.length)];
            const embed = new EmbedBuilder().setTitle('🏇 At Yarışı Sonucu');

            if (seninAtin === kazananAt) {
                const kazanc = bahis * 2;
                await db.add(`bakiye_${userId}`, kazanc);
                embed.setDescription(`🏁 Yarış bitti!\n\n🌟 **Senin Atın:** \`${seninAtin}\`\n🏆 **Kazanan At:** \`${kazananAt}\`\n\n🎉 Müthiş Tahmin! Kazancın: **\`+${kazanc}\` coin**`).setColor('#00FF00');
            } else {
                await db.sub(`bakiye_${userId}`, bahis);
                embed.setDescription(`🏁 Yarış bitti...\n\n🌟 **Senin Atın:** \`${seninAtin}\`\n🏆 **Kazanan At:** \`${kazananAt}\`\n\n❌ Senin at geride kaldı! **\`-${bahis}\` coin** kaybettin.`).setColor('#FF0000');
            }
            return interaction.reply({ embeds: [embed] });
        }
    }

    // TICKET MENÜ SEÇİM ETKİLEŞİMLERİ
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_secim') {
            const secim = interaction.values[0];
            await interaction.reply({ content: '🔄 Destek talebiniz açılıyor, lütfen bekleyin...', flags: MessageFlags.Ephemeral });

            const kategoriIsimleri = {
                'cekilis_kazandim': 'ticket-çekiliş',
                'drop_kazandim': 'ticket-drop',
                'hesap_satinal': 'ticket-satınalma',
                'partnerlik': 'ticket-partner',
                'yetkili_alim': 'ticket-başvuru',
                'teknik_destek': 'ticket-destek',
                'diger': 'ticket-diğer'
            };

            const canalAdi = `${kategoriIsimleri[secim] || 'ticket'}-${interaction.user.username}`;

            try {
                const ticketKanal = await interaction.guild.channels.create({
                    name: canalAdi,
                    type: 0,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: YETKILI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎟️ star debug ticket — Destek Bileti')
                    .setDescription(`Merhaba ${interaction.user}, biletiniz başarıyla açıldı!\nYetkililerimiz en kısa sürede sizinle ilgilenecektir.\n\n**Talep Türü:** \`${canalAdi.split('-')[1].toUpperCase()}\``)
                    .setColor('#8A2BE2')
                    .setFooter({ text: 'Bileti kapatmak için aşağıdaki kırmızı butona basabilirsiniz.' })
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_kapat').setLabel('🔒 Bileti Kapat').setStyle(ButtonStyle.Danger)
                );

                await ticketKanal.send({ content: `<@&${YETKILI_ROL_ID}> • ${interaction.user}`, embeds: [ticketEmbed], components: [closeRow] });
                await interaction.editReply({ content: `✅ Destek kanalınız açıldı: ${ticketKanal}` });
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ Kanal oluşturulurken teknik hata oluştu.' });
            }
        }
    }

    // BUTON ETKİLEŞİMLERİ YAKALAYICI
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde kalıcı olarak siliniyor...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }

        if (interaction.customId === 'anket_e' || interaction.customId === 'anket_h') {
            return interaction.reply({ content: '✅ Oyunuz başarıyla sisteme kaydedildi!', flags: MessageFlags.Ephemeral });
        }

        // DROP KAZANMA BUTONU
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = await db.get(`drop_data_${dropId}`);

            if (!dropVeri) return interaction.reply({ content: '❌ Drop verisi bulunamadı.', flags: MessageFlags.Ephemeral });
            if (dropVeri.bitti === true) return interaction.reply({ content: '❌ Bu drop ödülü zaten kapılmış!', flags: MessageFlags.Ephemeral });

            await db.set(`drop_data_${dropId}.bitti`, true);

            try {
                const odulMetni = dropVeri.gizli ? `\`\`\`${dropVeri.gizli}\`\`\`` : `*Ödülünüz görselde belirtilmiştir!*`;
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Drop Ödülün Teslim Edildi!')
                    .setDescription(`Tebrikler! stardebugX drobundan kaptığın ödül bilgileri:\n\n**Ödül :** \`${dropVeri.gorunen}\`\n\n**Teslimat Bilgisi:**\n${odulMetni}`)
                    .setColor('#00FF00');

                if (dropVeri.gorsel) dmEmbed.setImage(dropVeri.gorsel);
                await interaction.user.send({ embeds: [dmEmbed] });

                const kazananEmbed = new EmbedBuilder()
                    .setTitle('🎉 DROP KAZANILDI! 💜')
                    .setDescription(`🏆 ${interaction.user} ödülü ilk kapan kişi oldu!\n\n**Ödül:** \`${dropVeri.gorunen}\``)
                    .setColor('#8A2BE2')
                    .setThumbnail(interaction.user.displayAvatarURL());

                await interaction.update({ embeds: [kazananEmbed], components: [] });
            } catch (err) {
                await db.set(`drop_data_${dropId}.bitti`, false); 
                return interaction.reply({ content: '❌ Ödül teslim edilemedi, lütfen DM kutunuzu açın!', flags: MessageFlags.Ephemeral });
            }
        }

        // ÇEKİLİŞ REROLL BUTONU
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            const messageId = interaction.customId.replace('cekilis_reroll_', '');
            const veri = await db.get(`cekilis_${messageId}`);
            if (!veri) return interaction.reply({ content: '❌ Çekiliş verisi yok.', flags: MessageFlags.Ephemeral });

            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Bunu sadece yetkililer yeniden çekebilir!', flags: MessageFlags.Ephemeral });
            }

            await interaction.reply({ content: '🔄 Çekiliş yeniden gerçekleştiriliyor...', flags: MessageFlags.Ephemeral });
            await db.set(`cekilis_${messageId}.bitti`, false);
            await cekilisBitir(veri.channelId, messageId);
        }
    }
});

client.login(process.env.TOKEN);
