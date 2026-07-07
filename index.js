require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField, Partials } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

// 7/24 Aktif Kalma Portu
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// ==========================================
//           SABİT YAPILANDIRMALAR
// ==========================================
const YETKILI_ROL_ID = '1520564676956655738';
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1469787899712241807/1521588401864704222';
const PREFIX = '!';

// Çoklu tıklama / spam kanal açmayı RAM üzerinde engelleyen kilit havuzu
const ticketIslem Kilitleri = new Set();
// ==========================================

function parseTurkceSure(sure) {
    if (!sure) return '0s';
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
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction]
});

// SLASH KOMUTLARI
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('Fotoğraf yükleyin').setRequired(false)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('anket').setDescription('Gelişmiş butonlu anket başlatır.').addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
].map(c => c.toJSON());

// ÇEKİLİŞ ANA FONKSİYONU
async function cekilisBitir(channelId, messageId, isReroll = false) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri || (veri.bitti === true && !isReroll)) return; 

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

    await db.set(`cekilis_${messageId}.bitti`, true);

    const reaction = guncelMesaj.reactions.cache.get('🎉');
    if (!reaction) return;

    const reaksiyonKullanicilari = await reaction.users.fetch({ force: true });
    const katilimcilar = reaksiyonKullanicilari.filter(u => !u.bot);

    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `Yetkili`;

    if (katilimcilar.size === 0) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nKatılımcı yetersiz olduğu için çekiliş iptal oldu.`)
            .setColor('#FF0000')
            .setFooter({ text: `stardebugX` })
            .setTimestamp();
        
        const rerollRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`cekilis_reroll_${messageId}`).setLabel('🔄 Yeniden Çek').setStyle(ButtonStyle.Secondary)
        );

        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [rerollRow] }).catch(() => null);
    }

    const kazananlar = katilimcilar.random(Math.min(veri.count, katilimcilar.size));
    const kazananMention = Array.isArray(kazananlar) ? kazananlar.map(u => u.toString()).join(', ') : kazananlar.toString();
    const bitisTimestamp = Math.floor(veri.bitisMs / 1000);

    const sonEmbed = new EmbedBuilder()
        .setTitle(isReroll ? '🔄 ÇEKİLİŞ YENİDEN ÇEKİLDİ!' : '🏆 ÇEKİLİŞ SONA ERDİ!')
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

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] }).catch(() => null);
    await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⭐`).catch(() => null);
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Yakalanmayan Hata Kontrolü:', reason);
});

client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('Slash komutları başarıyla güncellendi!');
    } catch (error) {
        console.error(error);
    }
    console.log(`${c.user.tag} aktif!`);
});

// PREFIX TABANLI KOMUTLAR (!uyarı)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'uyarı' || command === 'uyari') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Bu komutu kullanmak için yetkiniz yetersiz!').catch(() => null);
        }

        const hedefUye = message.mentions.members.first();
        if (!hedefUye) return message.reply('❌ Lütfen uyarmak istediğiniz kullanıcıyı etiketleyin! Örnek: `!uyarı @kullanıcı`').catch(() => null);

        if (hedefUye.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Bir yöneticiyi uyaramazsınız!').catch(() => null);
        }

        const userId = hedefUye.id;
        const mevcutUyari = (await db.get(`uyari_sayisi_${userId}`)) || 0;
        const yeniUyari = mevcutUyari + 1;

        if (yeniUyari === 1) {
            await db.set(`uyari_sayisi_${userId}`, 1);
            return message.channel.send(`⚠️ ${hedefUye} kullanıcısı ilk uyarısını aldı! **(Uyarı 1/3)**`).catch(() => null);
        } 
        else if (yeniUyari === 2) {
            await db.set(`uyari_sayisi_${userId}`, 2);
            const ikiSaatMs = 2 * 60 * 60 * 1000; 
            await hedefUye.timeout(ikiSaatMs, '2. Uyarı Cezası').catch(() => null);
            return message.channel.send(`🔇 ${hedefUye} kullanıcısı 2. uyarısını aldı! Ceza olarak **2 saat susturuldu**. **(Uyarı 2/3)**`).catch(() => null);
        } 
        else if (yeniUyari >= 3) {
            await db.delete(`uyari_sayisi_${userId}`); 
            await hedefUye.kick('3. Uyarı Cezası (Sunucudan Atılma)').catch(() => null);
            return message.channel.send(`🧲 ${hedefUye.user.tag} kullanıcısı 3. uyarısını aldı ve **sunucudan atıldı!**`).catch(() => null);
        }
    }
});

// INTERACTION OLAYLARI
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (['drop', 'cekilis', 'ticketpanel', 'anket', 'ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member?.roles?.cache?.has(YETKILI_ROL_ID) && !interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Bu sistemi kullanmak için yetkiniz yetersiz!', flags: MessageFlags.Ephemeral }).catch(() => null);
            }
        }

        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            
            if (!gizliOdul && !gorselDosyası) {
                return interaction.reply({ content: '❌ Gizli bilgi veya görsel dosyası eklemelisiniz!', flags: MessageFlags.Ephemeral }).catch(() => null);
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
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] }).catch(() => null);
        }

        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Destek konusu seçiniz...')
                    .addOptions([
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', description: 'Kazandığınız çekiliş ödülünü talep etmek için burayı kullanın.', emoji: '❤️' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', description: 'Yayın veya etkinliklerden kazandığınız dropları teslim alın.', emoji: '🎁' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', description: 'Güvenli hesap satın alma, fiyat ve stok bilgisi almak için.', emoji: '💰' },
                        { label: 'Partnerlik & İşbirliği', value: 'partnerlik', description: 'Ortaklık, reklam ya da sponsorluk görüşmeleri yapmak için.', emoji: '🤝' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', description: 'Ekibimize katılmak ve yetkili olmak istiyorsanız başvurun.', emoji: '🔵' },
                        { label: 'Teknik Destek', value: 'teknik_destek', description: 'Yaşadığınız problemlerle ilgili teknik destek talebi oluşturun.', emoji: '🔧' },
                        { label: 'Şikayet & Öneri', value: 'sikayet_oneri', description: 'Sunucu içi şikayetlerinizi veya önerilerinizi bize iletin.', emoji: '📝' },
                        { label: 'Diğer', value: 'diger', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.', emoji: '❓' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('⭐ star debug ticket — Destek Merkezi')
                .setDescription('Merhaba! Yardım almak istediğiniz kategoriyi aşağıdaki menüden seçerek bir destek bileti oluşturabilirsiniz.')
                .setColor('#2F3136')
                .setFooter({ text: 'stardebugX Gelişmiş Bilet Sistemi' });

            await interaction.reply({ embeds: [embed], components: [row] }).catch(() => null);
        }

        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply().catch(() => null); 
            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
            
            let msDur = ms(parseTurkceSure(durInput));
            if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı!' }).catch(() => null);
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 stardebugX ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n⏳ **Bitiş:** <t:${bitis}:R>`)
                .setColor('#8A2BE2')
                .setFooter({ text: '🎉 emojisine tıklayarak katılın!' });
            
            const mesaj = await interaction.editReply({ embeds: [embed] }).catch(() => null);
            if (mesaj) {
                await mesaj.react('🎉').catch(() => null);
                
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
        }

        if (interaction.commandName === 'ban') {
            const m = interaction.options.getMember('kisi');
            if (!m) return interaction.reply('Kullanıcı bulunamadı.').catch(() => null);
            await m.ban().catch(() => null);
            await interaction.reply(`✅ ${m.user.tag} sunucudan banlandı.`).catch(() => null);
        }
        if (interaction.commandName === 'unban') {
            const id = interaction.options.getString('kisi_id');
            await interaction.guild.members.unban(id).catch(() => null);
            await interaction.reply('✅ Belirtilen kullanıcının banı kaldırıldı.').catch(() => null);
        }
        if (interaction.commandName === 'mute') {
            const m = interaction.options.getMember('kisi');
            const sureInput = interaction.options.getString('sure');
            let msDur = ms(parseTurkceSure(sureInput));
            if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre!', flags: MessageFlags.Ephemeral }).catch(() => null);
            
            await m.timeout(msDur, 'Mute Komutu').catch(() => null);
            await interaction.reply(`✅ ${m} kullanıcısı **${sureInput}** süresince susturuldu.`).catch(() => null);
        }
        if (interaction.commandName === 'unmute') {
            const m = interaction.options.getMember('kisi');
            if (!m) return interaction.reply('Kullanıcı bulunamadı.').catch(() => null);
            await m.timeout(null, 'Manuel Unmute').catch(() => null);
            await interaction.reply(`✅ ${m} susturulması kaldırıldı.`).catch(() => null);
        }
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const embed = new EmbedBuilder().setTitle('📊 ANKET').setDescription(`**Soru:** ${soru}\n\n🟩 **Evet** | 🟥 **Hayır**`).setColor('#8A2BE2');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_e').setLabel('Evet').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('anket_h').setLabel('Hayır').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ embeds: [embed], components: [row] }).catch(() => null);
        }
    }

    // ==========================================
    //    TICKET MENÜ SEÇİMİ (SPAM KORUMALI)
    // ==========================================
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_secim') {
            const userId = interaction.user.id;

            // 1. ADIM: RAM ÜZERİNDEN GEÇİCİ KİLİT KONTROLÜ (Milisaniyeler içinde ardı ardına basılmayı engeller)
            if (ticketIslemKilitleri.has(userId)) {
                return interaction.reply({ 
                    content: `❌ **Yavaş ol! İşleminiz zaten şu an gerçekleştiriliyor. Lütfen bekleyin.**`, 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => null);
            }

            // Kilidi hemen aktif et
            ticketIslemKilitleri.add(userId);

            // 2. ADIM: VERİTABANI KONTROLÜ (Zaten açık kanalı var mı?)
            const eskiKanalId = await db.get(`aktif_ticket_${userId}`);
            if (eskiKanalId) {
                const varMi = interaction.guild.channels.cache.get(eskiKanalId);
                if (varMi) {
                    ticketIslemKilitleri.delete(userId); // Kilidi kaldır
                    return interaction.reply({ 
                        content: `❌ **Zaten açık bir destek talebiniz bulunuyor!** Lütfen önce mevcut biletinizi kapatın: ${varMi}`, 
                        flags: MessageFlags.Ephemeral 
                    }).catch(() => null);
                } else {
                    await db.delete(`aktif_ticket_${userId}`);
                }
            }

            await interaction.reply({ content: '🔄 Destek talebiniz güvenli şekilde açılıyor, lütfen bekleyin...', flags: MessageFlags.Ephemeral }).catch(() => null);

            const secim = interaction.values[0];
            const kategoriIsimleri = {
                'cekilis_kazandim': 'ticket-çekiliş',
                'drop_kazandim': 'ticket-drop',
                'hesap_satinal': 'ticket-satınalma',
                'partnerlik': 'ticket-partner',
                'yetkili_alim': 'ticket-başvuru',
                'teknik_destek': 'ticket-destek',
                'sikayet_oneri': 'ticket-şikayet',
                'diger': 'ticket-diğer'
            };

            const kategoriAciklamalari = {
                'cekilis_kazandim': '🎉 **Çekiliş Kazandınız Talebi:**\nLütfen kazandığınız çekilişe dair ekran görüntüsünü (SS) ve gerekli bilgilerinizi bu kanala ileterek yetkilinin yanıt vermesini bekleyin.',
                'drop_kazandim': '🎁 **Drop Kazandınız Talebi:**\nHızlıca drop kazandığınız anı veya drop ödül adını belirtin. Sistem kontrol edilip teslimat doğrulanacaktır.',
                'hesap_satinal': '💲 **Hesap Satın Alma Talebi:**\nSatın almak istediğiniz ürün listesini veya miktarını yazın. Güvenli ödeme kanalları ve detaylar birazdan paylaşılacaktır.',
                'partnerlik': '🤝 **Partnerlik & İşbirliği Talebi:**\nLütfen sunucunuzun davet bağlantısını, üye istatistiklerinizi ve partnerlik metninizi buraya bırakın. Partnerlik sorumlumuz inceleyecektir.\n\n📝 *Not: Lütfen partnerlik metninizin altına partnerinizin kısa açıklamasını eklemeyi unutmayın!*',
                'yetkili_alim': '🔵 **Yetkili Alım Başvurusu:**\nEkibimize katılmak istediğiniz için teşekkürler! Yaşınız, aktiflik süreniz ve daha önceki tecrübeleriniz hakkında buraya kısa bir özet geçiniz.',
                'teknik_destek': '🔧 **Teknik Destek Talebi:**\nYaşadıgınız teknik problemi veya hatayı detaylıca (varsa görsel ekleyerek) açıklayın. Teknik ekip en kısa sürede müdahale edecektir.',
                'sikayet_oneri': '📝 **Şikayet & Öneri Bildirimi:**\nSunucumuzla veya üyelerle ilgili şikayetlerinizi ya da geliştirmemizi istediğiniz önerileri bu kanaldan detaylıca yazabilirsiniz.',
                'diger': '❓ **Genel / Diğer Konular:**\nYukarıdaki kategorilere uymayan sorunuzu veya talebinizi doğrudan bu kanala yazabilirsiniz.'
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

                // Kullanıcı verilerini kaydet
                await db.set(`aktif_ticket_${userId}`, ticketKanal.id);
                await db.set(`ticket_sahibi_${ticketKanal.id}`, userId);

                const detayAciklama = kategoriAciklamalari[secim] || 'Yetkililerimiz en kısa sürede sizinle ilgilenecektir.';

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎟️ star debug ticket — Destek Bileti')
                    .setDescription(`Merhaba ${interaction.user}, biletiniz başarıyla açıldı!\n\n${detayAciklama}`)
                    .setColor('#8A2BE2')
                    .setFooter({ text: 'Bileti kapatmak için aşağıdaki kırmızı butona basabilirsiniz.' })
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_kapat').setLabel('🔒 Bileti Kapat').setStyle(ButtonStyle.Danger)
                );

                await ticketKanal.send({ content: `<@&${YETKILI_ROL_ID}> • ${interaction.user}`, embeds: [ticketEmbed], components: [closeRow] }).catch(() => null);
                await interaction.editReply({ content: `✅ Destek kanalınız açıldı: ${ticketKanal}` }).catch(() => null);
                
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ Kanal oluşturulurken bir hata oluştu.' }).catch(() => null);
            } finally {
                // İşlem bittiğinde kilidi RAM'den temizle (1 saniye sonra güvenli sıfırlama)
                setTimeout(() => {
                    ticketIslemKilitleri.delete(userId);
                }, 1000);
            }
        }
    }

    // BUTTON OLAYLARI
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde kalıcı olarak siliniyor...' }).catch(() => null);
            
            const sahibiId = await db.get(`ticket_sahibi_${interaction.channel.id}`);
            if (sahibiId) {
                await db.delete(`aktif_ticket_${sahibiId}`);
                await db.delete(`ticket_sahibi_${interaction.channel.id}`);
            }

            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }

        if (interaction.customId === 'anket_e' || interaction.customId === 'anket_h') {
            return interaction.reply({ content: '✅ Oyunuz başarıyla sisteme kaydedildi!', flags: MessageFlags.Ephemeral }).catch(() => null);
        }

        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = await db.get(`drop_data_${dropId}`);

            if (!dropVeri) return interaction.reply({ content: '❌ Drop verisi bulunamadı.', flags: MessageFlags.Ephemeral }).catch(() => null);
            if (dropVeri.bitti === true) return interaction.reply({ content: '❌ Bu drop ödülü zaten kapılmış!', flags: MessageFlags.Ephemeral }).catch(() => null);

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
                    .setTitle('🎉 DROP KAZANILDI! ⭐')
                    .setDescription(`🏆 ${interaction.user} ödülü ilk kapan kişi oldu!\n\n**Ödül:** \`${dropVeri.gorunen}\``)
                    .setColor('#8A2BE2')
                    .setThumbnail(interaction.user.displayAvatarURL());

                await interaction.update({ embeds: [kazananEmbed], components: [] }).catch(() => null);
            } catch (err) {
                await db.set(`drop_data_${dropId}.bitti`, false); 
                return interaction.reply({ content: '❌ Ödül teslim edilemedi, lütfen DM kutunuzu açın!', flags: MessageFlags.Ephemeral }).catch(() => null);
            }
        }

        if (interaction.customId.startsWith('cekilis_reroll_')) {
            const messageId = interaction.customId.replace('cekilis_reroll_', '');
            const veri = await db.get(`cekilis_${messageId}`);
            if (!veri) return interaction.reply({ content: '❌ Çekiliş verisi yok.', flags: MessageFlags.Ephemeral }).catch(() => null);

            if (!interaction.member?.roles?.cache?.has(YETKILI_ROL_ID) && !interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Bunu sadece yetkililer yeniden çekebilir!', flags: MessageFlags.Ephemeral }).catch(() => null);
            }

            await interaction.reply({ content: '🔄 Yeni kazanan belirleniyor...', flags: MessageFlags.Ephemeral }).catch(() => null);
            await cekilisBitir(veri.channelId, messageId, true);
        }
    }
});

client.login(process.env.TOKEN);
