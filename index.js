require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField, Partials } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// ================== SUNUCU YAPILANDIRMALARI ==================
const YETKILI_ROL_ID = '1520564676956655738';
const DESTEK_ROL_ID = '1520564676956655738';
const TICKET_KANAL_ID = '1521588401864704222';
const GELEN_GIDEN_KANAL_ID = 'KANAL_ID_BURAYA'; // Burayı güncelle!
// =============================================================

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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

// SLASH KOMUTLARI
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addAttachmentOption(o => o.setName('dosya').setDescription('İçinde ödülün olduğu .txt dosyasını yükle').setRequired(true)),

    new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Yeni çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
        
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),

    new SlashCommandBuilder()
        .setName('uyari')
        .setDescription('Kullanıcıya uyarı verir (1: Uyarı, 2: 2 Saat Mute, 3: Sunucudan Atma).')
        .addUserOption(o => o.setName('kisi').setDescription('Uyarılacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('anket').setDescription('Gelişmiş butonlu anket başlatır.').addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
].map(c => c.toJSON());

async function cekilisBitir(channelId, messageId) {
    try {
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

        const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@r2xzzs`;

        if (katilimcilar.size === 0) {
            const iptalEmbed = new EmbedBuilder()
                .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
                .setDescription(`**Ödül:** \`${veri.prize}\`\n\nKatılımcı yetersiz olduğu için çekiliş iptal oldu.`)
                .setColor('#000000')
                .setFooter({ text: `Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
                .setTimestamp();

            const rerollRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`cekilis_reroll_${messageId}`)
                    .setLabel('🔄 Yeniden Çek')
                    .setStyle(ButtonStyle.Secondary)
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
            .setColor('#000000')
            .setFooter({ text: `stardebugX • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
            .setTimestamp();

        const ticketRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cekilis_reroll_${messageId}`)
                .setLabel('🔄 Yeniden Çek')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel('Ödülü Almak İçin Ticket Aç')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${guncelMesaj.guild.id}/${TICKET_KANAL_ID}`)
                .setEmoji('🎟️')
        );

        await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
        await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⭐`);
    } catch (error) {
        console.error('Çekiliş bitirilirken hata:', error);
    }
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
    console.log(`${c.user.tag} aktif!`);
});

client.on('guildMemberRemove', async (member) => {
    const kanal = member.guild.channels.cache.get(GELEN_GIDEN_KANAL_ID);
    if (kanal) {
        const gorusuruzEmbed = new EmbedBuilder()
            .setTitle('👋 Biri Aramızdan Ayrıldı...')
            .setDescription(`❌ **Baybay** **${member.user.tag}**... Sunucudan çıkış yaptı. Geride **${member.guild.memberCount}** kişi kaldık, özleneceksin!`)
            .setColor('#000000')
            .setTimestamp();

        await kanal.send({ embeds: [gorusuruzEmbed] }).catch(err => console.error("Giden mesajı atılamadı:", err));
    }
});

// ANA HATA YÖNETİMİ - Botun "düşünüyor" modunda takılmasını engeller
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'drop') {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Yetkiniz yok!', flags: MessageFlags.Ephemeral });

                const dosya = interaction.options.getAttachment('dosya');
                const gorunenOdul = interaction.options.getString('gorunen');

                const response = await fetch(dosya.url);
                const dosyaIcerigi = await response.text();

                const dropId = Date.now();
                await db.set(`drop_data_${dropId}`, {
                    gorunen: gorunenOdul,
                    gizli: dosyaIcerigi,
                    bitti: false
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`drop_${dropId}`).setLabel('ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success).setEmoji('🏆')
                );

                const baslangicEmbed = new EmbedBuilder()
                    .setTitle('⭐ StardebugX DROP!')
                    .setDescription(`Ödül: **${gorunenOdul}**\n\n*Butona basan ödülü .txt dosyası olarak alır.*`)
                    .setColor('#000000');

                await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
            }

            else if (interaction.commandName === 'ticketpanel') {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', flags: MessageFlags.Ephemeral });

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticket_secim')
                        .setPlaceholder('Seçim yap')
                        .addOptions([
                            { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', description: 'Kazandığınız çekiliş ödülünü talep etmek için burayı kullanın.', emoji: '❤️' },
                            { label: 'Drop Kazandım', value: 'drop_kazandim', description: 'Yayın veya etkinliklerden kazandığınız dropları teslim alın.', emoji: '🎁' },
                            { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', description: 'Güvenli hesap satın alma, fiyat ve stok bilgisi almak için.', emoji: '💲' },
                            { label: 'Partnerlik & İşbirliği', value: 'partnerlik', description: 'Ortaklık, reklam ya da sponsorluk görüşmeleri yapmak için.', emoji: '🤝' },
                            { label: 'Yetkili Alım', value: 'yetkili_alim', description: 'Ekibimize katılmak ve yetkili olmak istiyorsanız başvurun.', emoji: '🔵' },
                            { label: 'Teknik Destek', value: 'teknik_destek', description: 'Yaşadığınız problemlerle ilgili teknik destek talebi oluşturun.', emoji: '🔧' },
                            { label: 'Şikayet & Öneri', value: 'sikayet_oneri', description: 'Sunucu içi şikayetlerinizi veya önerilerinizi bize iletin.', emoji: '📝' },
                            { label: 'Diğer', value: 'diger', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.', emoji: '❓' }
                        ])
                );

                const embed = new EmbedBuilder()
                    .setTitle('⭐ STAR DEBUG TICKET')
                    .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                    .setColor('#000000')
                    .setFooter({ text: 'stardebugX • @r2xzzs' });

                await interaction.reply({ embeds: [embed], components: [row] });
            }

            else if (interaction.commandName === 'uyari') {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', flags: MessageFlags.Ephemeral });

                const hedefKisi = interaction.options.getMember('kisi');
                const sebep = interaction.options.getString('sebep');

                if (!hedefKisi) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: MessageFlags.Ephemeral });

                let uyariSayisi = await db.get(`uyari_${hedefKisi.id}`) || 0;
                uyariSayisi += 1;
                await db.set(`uyari_${hedefKisi.id}`, uyariSayisi);

                if (uyariSayisi === 1) {
                    const embed = new EmbedBuilder()
                        .setTitle('⚠️ Kullanıcı Uyardı!')
                        .setDescription(`${hedefKisi} kullanıcısına **1. uyarısı** verildi.`)
                        .addFields(
                            { name: '📝 Sebep', value: sebep, inline: true },
                            { name: '🔢 Toplam Uyarı', value: `\`1 / 3\``, inline: true }
                        )
                        .setColor('#000000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed] });
                }
                else if (uyariSayisi === 2) {
                    const embed = new EmbedBuilder()
                        .setTitle('🤫 2. Uyarı: 2 Saat Susturma!')
                        .setDescription(`${hedefKisi} kullanıcısı **2. uyarısını** aldığı için otomatik olarak **2 saat boyunca susturuldu** (Mute).`)
                        .addFields(
                            { name: '📝 Sebep', value: sebep, inline: true },
                            { name: '🔢 Toplam Uyarı', value: `\`2 / 3\``, inline: true }
                        )
                        .setColor('#000000')
                        .setTimestamp();

                    await hedefKisi.timeout(2 * 60 * 60 * 1000, `2. Uyarı Cezası: ${sebep}`).catch(() => null);
                    await interaction.reply({ embeds: [embed] });
                }
                else if (uyariSayisi >= 3) {
                    const embed = new EmbedBuilder()
                        .setTitle('🚪 3. Uyarı: Sunucudan Atıldı!')
                        .setDescription(`${hedefKisi} kullanıcısı **3 uyarısını doldurduğu için** otomatik olarak sunucudan atıldı (Kick).`)
                        .addFields(
                            { name: '📝 Son Sebep', value: sebep, inline: true },
                            { name: '🔄 Durum', value: `\`Uyarı limitine ulaşıldı, sayaç sıfırlandı.\``, inline: false }
                        )
                        .setColor('#000000')
                        .setTimestamp();

                    await db.delete(`uyari_${hedefKisi.id}`);
                    await hedefKisi.kick(`3. Uyarı Cezası: ${sebep}`).catch(() => null);
                    await interaction.reply({ embeds: [embed] });
                }
            }

            else if (interaction.commandName === 'cekilis') {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', flags: MessageFlags.Ephemeral });
                
                await interaction.deferReply(); // Önce "düşünüyor" göster, sonra cevapla

                const durInput = interaction.options.getString('sure');
                const count = interaction.options.getInteger('kazanan_sayisi');
                const prize = interaction.options.getString('odul');

                let msDur = ms(parseTurkceSure(durInput));
                const MAX_TIMEOUT = 2147483647;

                if (!msDur || isNaN(msDur) || msDur > MAX_TIMEOUT) {
                    const temizSure = durInput.toLowerCase().trim();
                    if (temizSure.includes('saat') || temizSure.includes('h')) {
                        let saat = parseFloat(temizSure.replace(/saat|h/g, ''));
                        if (!isNaN(saat)) msDur = saat * 60 * 60 * 1000;
                    }
                    else if (temizSure.includes('gun') || temizSure.includes('gün') || temizSure.includes('d')) {
                        let gun = parseFloat(temizSure.replace(/gun|gün|d/g, ''));
                        if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                    }
                    else if (temizSure.includes('dakika') || temizSure.includes('dk') || temizSure.includes('m')) {
                        let dakika = parseFloat(temizSure.replace(/dakika|dk|m/g, ''));
                        if (!isNaN(dakika)) msDur = dakika * 60 * 1000;
                    }
                }

                if (!msDur || isNaN(msDur)) {
                    return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)' });
                }

                const simdi = Math.floor(Date.now() / 1000); // DÜZELTİLDİ: simdi
                const bitis = simdi + Math.floor(msDur / 1000);
                const bitisMs = Date.now() + msDur;

                // DÜZELTİLDİ: simni -> simdi (Buradaydı ana hata!)
                const embed = new EmbedBuilder()
                    .setTitle('🎉 STARDEBUGX ÇEKİLİŞ 🎉')
                    .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                    .setColor('#000000')
                    .setFooter({ text: `stardebugX • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
                    .setTimestamp();

                const mesaj = await interaction.editReply({ embeds: [embed] });
                await mesaj.react('🎉');

                await db.set(`cekilis_${mesaj.id}`, {
                    channelId: interaction.channel.id,
                    prize: prize,
                    count: count,
                    simdi: simdi, // Düzeltildi
                    bitisMs: bitisMs,
                    bitti: false,
                    baslatanId: interaction.user.id,
                    baslatanTag: `@${interaction.user.username}`
                });

                setTimeout(async () => {
                    await cekilisBitir(interaction.channel.id, mesaj.id);
                }, msDur);
            }

            else if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Yetkiniz yok!', flags: MessageFlags.Ephemeral });

                if (interaction.commandName === 'ban') { 
                    const m = interaction.options.getMember('kisi'); 
                    if(!m) return interaction.reply({content: '❌ Kullanıcı bulunamadı!', flags: MessageFlags.Ephemeral});
                    await m.ban(); 
                    await interaction.reply(`${m.user.tag} banlandı.`); 
                }
                
                if (interaction.commandName === 'unban') { 
                    await interaction.guild.members.unban(interaction.options.getString('kisi_id')); 
                    await interaction.reply('Ban kalktı.'); 
                }

                if (interaction.commandName === 'mute') {
                    const m = interaction.options.getMember('kisi');
                    const sureInput = interaction.options.getString('sure');
                    let msDur = ms(parseTurkceSure(sureInput));

                    if (!msDur || isNaN(msDur)) {
                        const temizSure = sureInput.toLowerCase().trim();
                        if (temizSure.includes('saat') || temizSure.includes('h')) {
                            let saat = parseFloat(temizSure.replace(/saat|h/g, ''));
                            if (!isNaN(saat)) msDur = saat * 60 * 60 * 1000;
                        }
                        else if (temizSure.includes('gun') || temizSure.includes('gün') || temizSure.includes('d')) {
                            let gun = parseFloat(temizSure.replace(/gun|gün|d/g, ''));
                            if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                        }
                        else if (temizSure.includes('dk') || temizSure.includes('m')) {
                            let dk = parseFloat(temizSure.replace(/dk|m/g, ''));
                            if (!isNaN(dk)) msDur = dk * 60 * 1000;
                        }
                    }

                    if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre formatı!', flags: MessageFlags.Ephemeral });
                    await m.timeout(msDur, 'Mute Komutu');
                    await interaction.reply(`✅ ${m} kullanıcısı **${sureInput}** boyunca susturuldu.`);
                }

                if (interaction.commandName === 'unmute') { 
                    const m = interaction.options.getMember('kisi'); 
                    await m.timeout(null); 
                    await interaction.reply(`${m} susturması kaldırıldı.`); 
                }
            }

            else if (interaction.commandName === 'anket') {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Yetkiniz yok!', flags: MessageFlags.Ephemeral });
                const soru = interaction.options.getString('soru');
                const anketId = Date.now();

                await db.set(`anket_${anketId}_soru`, soru);
                await db.set(`anket_${anketId}_evet`, []);
                await db.set(`anket_${anketId}_hayir`, []);

                const embed = new EmbedBuilder()
                    .setTitle('📊 STARDEBUGX - ANKET')
                    .setDescription(`**Soru:** ${soru}\n\n🟩 **Evet:** \`0%\` (0 Oy)\n🟥 **Hayır:** \`0%\` (0 Oy)`)
                    .setColor('#000000')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`anket_evet_${anketId}`).setLabel('Evet').setStyle(ButtonStyle.Success).setEmoji('🟩'),
                    new ButtonBuilder().setCustomId(`anket_hayir_${anketId}`).setLabel('Hayır').setStyle(ButtonStyle.Danger).setEmoji('🟥')
                );

                await interaction.reply({ embeds: [embed], components: [row] });
            }
        }

        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_secim') {
                const secim = interaction.values[0];
                await interaction.reply({ content: '🔄 Destek talebiniz oluşturuluyor, lütfen bekleyin...', flags: MessageFlags.Ephemeral });

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

                const canalAdi = `${kategoriIsimleri[secim] || 'ticket'}-${interaction.user.username}`;

                try {
                    const ticketKanal = await interaction.guild.channels.create({
                        name: canalAdi,
                        type: 0,
                        permissionOverwrites: [
                            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                            { id: DESTEK_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                        ]
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle('🎟️ STAR DEBUG TICKET')
                        .setDescription(`Merhaba ${interaction.user}, biletiniz başarıyla açıldı!\nYetkililerimiz en kısa sürede sizinle ilgilenecektir.\n\n**Seçtiğiniz Kategori:** \`${canalAdi.split('-')[1].toUpperCase()}\``)
                        .setColor('#000000')
                        .setFooter({ text: 'Bileti kapatmak için aşağıdaki butona tıklayabilirsiniz.' })
                        .setTimestamp();

                    const closeRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_kapat')
                            .setLabel('🔒 Bileti Kapat')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await ticketKanal.send({ content: `${interaction.user} • <@&${DESTEK_ROL_ID}>`, embeds: [ticketEmbed], components: [closeRow] });
                    await interaction.editReply({ content: `✅ Destek kanalınız başarıyla oluşturuldu: ${ticketKanal}` });
                } catch (error) {
                    console.error(error);
                    await interaction.editReply({ content: '❌ Ticket kanalı oluşturulurken bir hata meydana geldi.' });
                }
            }
        }

        else if (interaction.isButton()) {
            if (interaction.customId === 'ticket_kapat') {
                await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde siliniyor...' });
                setTimeout(async () => {
                    await interaction.channel.delete().catch(() => null);
                }, 5000);
                return;
            }

            if (interaction.customId.startsWith('drop_')) {
                const dropId = interaction.customId.replace('drop_', '');
                const dropVeri = await db.get(`drop_data_${dropId}`);

                if (!dropVeri) return interaction.reply({ content: '❌ Hata.', flags: MessageFlags.Ephemeral });
                if (dropVeri.bitti === true) return interaction.reply({ content: '❌ Bu ödül çoktan kapıldı!', flags: MessageFlags.Ephemeral });

                await db.set(`drop_data_${dropId}.bitti`, true);

                const kazananEmbed = new EmbedBuilder()
                    .setTitle('⭐ StardebugX | DROP KAZANILDI')
                    .setDescription(`🏆 ${interaction.user} ödülü kaptı!\n\n📩 **Ödül, DM üzerinden .txt dosyası olarak gönderildi.**`)
                    .setColor('#000000');

                await interaction.update({ embeds: [kazananEmbed], components: [] });

                try {
                    const buffer = Buffer.from(dropVeri.gizli, 'utf-8');
                    await interaction.user.send({
                        content: `🎉 Tebrikler! **${dropVeri.gorunen}** ödülünü kazandın.`,
                        files: [{ attachment: buffer, name: `${dropVeri.gorunen}.txt` }]
                    });
                } catch (e) {
                    return interaction.followUp({ 
                        content: '❌ DM kutun kapalı olduğu için ödülü gönderemedim! Lütfen DMlerini aç ve yetkililere ulaş.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            if (interaction.customId.startsWith('cekilis_reroll_')) {
                const messageId = interaction.customId.replace('cekilis_reroll_', '');
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID) && !interaction.member.permissions.has('Administrator')) {
                    return interaction.reply({ content: '❌ Bu çekilişi sadece yetkililer yeniden çekebilir!', flags: MessageFlags.Ephemeral });
                }
                await interaction.reply({ content: '🔄 Çekiliş yeniden çekiliyor...', flags: MessageFlags.Ephemeral });
                await db.set(`cekilis_${messageId}.bitti`, false);
                await cekilisBitir(interaction.channel.id, messageId);
            }
            
            // Anket Butonları
            if (interaction.customId.startsWith('anket_evet_') || interaction.customId.startsWith('anket_hayir_')) {
                const anketId = interaction.customId.replace('anket_evet_', '').replace('anket_hayir_', '');
                const tur = interaction.customId.includes('evet') ? 'evet' : 'hayir';
                
                let oyListesi = await db.get(`anket_${anketId}_${tur}`) || [];
                
                if (oyListesi.includes(interaction.user.id)) {
                    return interaction.reply({ content: '❌ Zaten bu ankete oy verdiniz!', flags: MessageFlags.Ephemeral, ephemeral: true });
                }
                
                oyListesi.push(interaction.user.id);
                await db.set(`anket_${anketId}_${tur}`, oyListesi);
                
                const evetListesi = await db.get(`anket_${anketId}_evet`) || [];
                const hayirListesi = await db.get(`anket_${anketId}_hayir`) || [];
                const toplam = evetListesi.length + hayirListesi.length;
                const evetYuzde = toplam > 0 ? Math.round((evetListesi.length / toplam) * 100) : 0;
                const hayirYuzde = toplam > 0 ? Math.round((hayirListesi.length / toplam) * 100) : 0;
                
                const soru = await db.get(`anket_${anketId}_soru`);
                const yeniEmbed = new EmbedBuilder()
                    .setTitle('📊 STARDEBUGX - ANKET')
                    .setDescription(`**Soru:** ${soru}\n\n🟩 **Evet:** \`${evetYuzde}%\` (${evetListesi.length} Oy)\n🟥 **Hayır:** \`${hayirYuzde}%\` (${hayirListesi.length} Oy)`)
                    .setColor('#000000')
                    .setTimestamp();
                
                await interaction.update({ embeds: [yeniEmbed] });
                await interaction.followUp({ content: '✅ Oyunuz kaydedildi!', flags: MessageFlags.Ephemeral, ephemeral: true });
            }
        }
    } catch (error) {
        console.error('[HATA] Interaction hatası:', error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: `❌ Bir hata oluştu: ${error.message}` }).catch(() => {});
            } else {
                await interaction.reply({ content: `❌ Bir hata oluştu: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        } catch (e) {
            console.error('[HATA] Hata mesajı gönderilemedi:', e);
        }
    }
});

client.login(process.env.TOKEN);
