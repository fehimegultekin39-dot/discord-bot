require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

const DESTEK_ROL_ID = '1520515365786882178';
const YETKILI_ROL_ID = '1520515365786882178';
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1520473034694066361/1520530500022960198';

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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});

// SLASH KOMUTLARI
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi (Örn: 1x Minecraft Premium)').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod/link').setRequired(true))
        // ARTIK KESİNLİKLE GEÇMİŞTEKİ İSİMLE AYNI DEĞİL, SIFIRDAN ATTACHMENT YAPILDI:
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('PC veya Telefondan direkt fotoğraf yükleyin').setRequired(false)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
    
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir (Herkes kullanabilir).')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili kişi').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Değerlendirme yıldızı (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Eklemek istediğiniz not veya yorum').setRequired(true)),
        
    new SlashCommandBuilder().setName('yetkilipuan').setDescription('Yetkilinin vouch ve legit puanlarına bakar.').addUserOption(o => o.setName('kullanici').setDescription('Bakmak istediğiniz kişi')),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyi susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('legit').setDescription('Legit onayı oluşturur.').addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Verilen ödül').setRequired(true)).addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true)).addStringOption(o => o.setName('not_').setDescription('Ekstra not').setRequired(false)),
    new SlashCommandBuilder().setName('anket').setDescription('Gelişmiş butonlu anket başlatır.').addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
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

    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@r2xzzs`;

    if (katilimcilar.size === 0) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nKatılımcı yetersiz olduğu için çekiliş iptal oldu.`)
            .setColor('#FF0000')
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
        .setColor('#00FFAA')
        .setFooter({ text: `Drop Zone TR • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
        .setTimestamp();

    const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cekilis_reroll_${messageId}`)
            .setLabel('🔄 Yeniden Çek')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setLabel('Ödülü Almak İçin Ticket Aç')
            .setStyle(ButtonStyle.Link)
            .setURL(TICKET_KANAL_LINKI)
            .setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
    await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** 💜`);
}

client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Slash komutları yenileniyor...');
        // Sunucu bazlı eski kalıntıları tamamen ezmek için global komutları sıfırdan basıyoruz
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('Slash komutları başarıyla güncellendi!');
    } catch (error) {
        console.error('Komutlar yüklenirken hata oluştu:', error);
    }
    
    console.log(`${c.user.tag} aktif!`);

    const tumVeriler = await db.all();
    const aktifCekilisler = tumVeriler.filter(v => v.id.startsWith('cekilis_'));

    for (const cekilis of aktifCekilisler) {
        const msgId = cekilis.id.replace('cekilis_', '');
        const veri = cekilis.value;
        
        if (veri && veri.bitti === true) continue;

        if (veri && veri.bitisMs) {
            const kalanSure = veri.bitisMs - Date.now();
            
            if (kalanSure <= 0) {
                await cekilisBitir(veri.channelId, msgId);
            } else {
                setTimeout(async () => {
                    await cekilisBitir(veri.channelId, msgId);
                }, kalanSure);
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        // DROP KOMUTU
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            // Yeni argüman ismiyle dosyayı yakalıyoruz
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            
            const gorselUrl = gorselDosyası ? gorselDosyası.url : null;
            const dropId = Date.now();
            const customId = `drop_${dropId}`;
            
            await db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
                gizli: gizliOdul,
                gorsel: gorselUrl,
                baslatan: interaction.user.username,
                bitti: false
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel('ÖDÜLÜ KAP!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 DROP ZONE TR DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur ve ödül otomatik olarak DM kutusuna gönderilir!*`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Drop Zone TR • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // TICKET PANEL
        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Seçim yap')
                    .addOptions([
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '💟', description: 'Kazandığınız çekiliş ödülünü talep etmek için burayı kullanın.' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁', description: 'Yayın veya etkinliklerden kazandığınız dropları teslim alın.' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲', description: 'Güvenli hesap satın alma, fiyat ve stok bilgisi almak için.' },
                        { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝', description: 'Ortaklık, reklam ya da sponsorluk görüşmeleri yapmak için.' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🔵', description: 'Ekibimize katılmak ve yetkili olmak istiyorsanız başvurun.' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧', description: 'Yaşadığınız problemlerle ilgili teknik destek talebi oluşturun.' },
                        { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝', description: 'Sunucu içi şikayetlerinizi veya önerilerinizi bize iletin.' },
                        { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm konular ogün sorularınız için bu kategoriyi seçin.' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('💜 Drop Zone TR — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#2F3136')
                .setFooter({ text: 'Drop Zone TR • @r2xzzs' });

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // VOUCH
        if (interaction.commandName === 'vouch') {
            const yetkili = interaction.options.getUser('veren');
            const alanUye = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const yildizSayisi = interaction.options.getInteger('yildiz');
            const ekNot = interaction.options.getString('not');
            
            const guildMember = await interaction.guild.members.fetch(yetkili.id);
            if (!guildMember.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Sadece **Yetkili Ekibi** rolündekilere vouch atılabilir.', flags: MessageFlags.Ephemeral });
            
            await db.add(`vouch_${yetkili.id}`, 1);
            const toplam = await db.get(`vouch_${yetkili.id}`);
            const yildizlar = '⭐'.repeat(yildizSayisi);
            
            const embed = new EmbedBuilder()
                .setTitle('💜 Yeni Vouch Onayı')
                .setDescription(`${yetkili} yetkilisine başarılı bir işlem için vouch bırakıldı!`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                    { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: yildizlar, inline: true },
                    { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#800080')
                .setFooter({ 
                    text: `Vouch Ekleyen: ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }

        // YETKİLİ PUAN
        if (interaction.commandName === 'yetkilipuan') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const vSayi = await db.get(`vouch_${hedef.id}`) || 0;
            const lSayi = await db.get(`legit_${hedef.id}`) || 0;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${hedef.username} - İstatistikleri`)
                .setColor('#2F3136')
                .addFields(
                    { name: '💜 Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                )
                .setThumbnail(hedef.displayAvatarURL());
            
            await interaction.reply({ embeds: [embed] });
        }

        // ÇEKİLİŞ
        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply(); 

            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
            
            let msDur = ms(parseTurkceSure(durInput));
            const MAX_TIMEOUT = 2147483647; 

            if (msDur > MAX_TIMEOUT || !msDur) {
                const temizSure = durInput.toLowerCase().trim();
                if (temizSure.endsWith('saat') || temizSure.endsWith('h') || temizSure.endsWith('sn') || temizSure.includes('saniye')) {
                    let saat = parseFloat(temizSure.replace(/saat|h/g, ''));
                    if (!isNaN(saat)) msDur = saat * 60 * 60 * 1000;
                } 
                else if (temizSure.endsWith('gun') || temizSure.endsWith('gün') || temizSure.endsWith('d')) {
                    let gun = parseFloat(temizSure.replace(/gun|gün|d/g, ''));
                    if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                }
            }
            
            if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)' });
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 DROP ZONE TR ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Drop Zone TR • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
                .setTimestamp();
            
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

        // MODERASYON
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', flags: MessageFlags.Ephemeral });
            
            if (interaction.commandName === 'ban') { const m = interaction.options.getMember('kisi'); await m.ban(); await interaction.reply(`${m.user.tag} banlandı.`); }
            if (interaction.commandName === 'unban') { await interaction.guild.members.unban(interaction.options.getString('kisi_id')); await interaction.reply('Ban kalktı.'); }
            
            if (interaction.commandName === 'mute') { 
                const m = interaction.options.getMember('kisi'); 
                const sureInput = interaction.options.getString('sure');
                let msDur = ms(parseTurkceSure(sureInput));
                const MAX_TIMEOUT = 2147483647;

                if (msDur > MAX_TIMEOUT || !msDur) {
                    const temizSure = sureInput.toLowerCase().trim();
                    if (temizSure.endsWith('saat') || temizSure.endsWith('h') || temizSure.endsWith('sn') || temizSure.includes('saniye')) {
                        let saat = parseFloat(temizSure.replace(/saat|h/g, ''));
                        if (!isNaN(saat)) msDur = saat * 60 * 60 * 1000;
                    } 
                    else if (temizSure.endsWith('gun') || temizSure.endsWith('gün') || temizSure.endsWith('d')) {
                        let gun = parseFloat(sureInput.toLowerCase().trim().replace(/gun|gün|d/g, ''));
                        if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                    }
                }
                
                if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)', flags: MessageFlags.Ephemeral });
                
                await m.timeout(msDur, 'Mute Komutu'); 
                await interaction.reply(`✅ ${m} kullanıcısı **${sureInput}** boyunca susturuldu.`); 
            }
            
            if (interaction.commandName === 'unmute') { const m = interaction.options.getMember('kisi'); await m.timeout(null); await interaction.reply(`${m} susturması kaldırıldı.`); }
        }

        // LEGIT
        if (interaction.commandName === 'legit') {
            const alan = interaction.options.getUser('alan');
            await db.add(`legit_${alan.id}`, 1);
            const toplam = await db.get(`legit_${alan.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Legit Onayı!')
                .setColor('#00FF00')
                .addFields(
                    { name: '👤 Alan', value: `${alan}`, inline: true }, 
                    { name: '🔢 Toplam Legit', value: `${toplam}`, inline: true }
                )
                .setImage(interaction.options.getAttachment('image').url);
            
            await interaction.reply({ embeds: [embed] });
        }

        // ANKET
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();

            await db.set(`anket_${anketId}_soru`, soru);
            await db.set(`anket_${anketId}_sahip`, interaction.user.username);
            await db.set(`anket_${anketId}_evet`, []);
            await db.set(`anket_${anketId}_hayir`, []);

            const embed = new EmbedBuilder()
                .setTitle('📊 DROP ZONE TR - ANKET')
                .setDescription(`**Soru:** ${soru}\n\n🟩 **Evet:** \`0%\` (0 Oy)\n🟥 **Hayır:** \`0%\` (0 Oy)`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Anketi Başlatan: ${interaction.user.username}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`anket_evet_${anketId}`).setLabel('Evet').setStyle(ButtonStyle.Success).setEmoji('🟩'),
                new ButtonBuilder().setCustomId(`anket_hayir_${anketId}`).setLabel('Hayır').setStyle(ButtonStyle.Danger).setEmoji('🟥')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // SELECT MENUS
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
                    .setTitle('🎟️ Drop Zone TR — Destek Bileti')
                    .setDescription(`Merhaba ${interaction.user}, biletiniz başarıyla açıldı!\nYetkililerimiz en kısa sürede sizinle ilgilenecektir.\n\n**Seçtiğiniz Kategori:** \`${canalAdi.split('-')[1].toUpperCase()}\``)
                    .setColor('#8A2BE2')
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

    // BUTTONS
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde siliniyor...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }

        // DROP ÖDÜLÜ KAPMA
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = await db.get(`drop_data_${dropId}`);

            if (!dropVeri) {
                return interaction.reply({ content: '❌ Bu drop verisine ulaşılamadı.', flags: MessageFlags.Ephemeral });
            }

            if (dropVeri.bitti === true) {
                return interaction.reply({ content: '❌ Bu drop ödülü daha önce başkası tarafından kapılmış!', flags: MessageFlags.Ephemeral });
            }

            await db.set(`drop_data_${dropId}.bitti`, true);

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Drop Ödülün Teslim Edildi!')
                    .setDescription(`Merhaba! Sunucudaki droptan başarıyla kaptığın ödül aşağıdadır:\n\n**Ödül:** \`${dropVeri.gorunen}\`\n**Teslim Edilen Bilgi/Kod:**\n\`\`\`${dropVeri.gizli}\`\`\n\n*Bizi tercih ettiğin için teşekkürler!*`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'Drop Zone TR Otomatik Teslimat' })
                    .setTimestamp();

                if (dropVeri.gorsel) {
                    dmEmbed.setImage(dropVeri.gorsel);
                }

                await interaction.user.send({ embeds: [dmEmbed] });

                const kazananEmbed = new EmbedBuilder()
                    .setAuthor({ name: `Drop Başlatan: ${dropVeri.baslatan}`, iconURL: interaction.guild.iconURL() || interaction.user.defaultAvatarURL })
                    .setTitle('🎉 DROP KAZANILDI! 💜')
                    .setDescription(`🏆 ${interaction.user}\n**ödülü kaptı!**`)
                    .setColor('#8A2BE2')
                    .addFields(
                        { name: '🎁 Ödül', value: `\`${dropVeri.gorunen}\``, inline: true }, 
                        { name: '👤 Kazanan', value: `${interaction.user}`, inline: true },
                        { name: '📩 Teslimat', value: 'Ödül otomatik olarak **DM kutusuna gönderildi!** ✅', inline: false }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setFooter({ text: 'Drop Zone TR • @r2xzzs' })
                    .setTimestamp();

                await interaction.update({ embeds: [kazananEmbed], components: [] });
                await interaction.followUp({ content: `✅ **Tebrikler!** Ödülün DM kutuna başarıyla gönderildi!`, flags: MessageFlags.Ephemeral });

            } catch (dmHata) {
                console.error("DM gönderilemedi:", dmHata);
                await db.set(`drop_data_${dropId}.bitti`, false); 
                return interaction.reply({ content: '❌ **Ödül Alınamadı:** DM kutun kapalı olduğu için bot sana mesaj gönderemedi!', flags: MessageFlags.Ephemeral });
            }
        }

        // REROLL
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ **Yetki Yetersiz:** Bu butonu sadece yetkili ekibi kullanabilir.', flags: MessageFlags.Ephemeral });
            }

            const messageId = interaction.customId.replace('cekilis_reroll_', '');
            const veri = await db.get(`cekilis_${messageId}`);

            if (!veri) {
                return interaction.reply({ content: '❌ Bu çekilişe ait veritabanı kaydı bulunamadı.', flags: MessageFlags.Ephemeral });
            }

            try {
                const targetMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
                if (!targetMessage) return interaction.reply({ content: '❌ Çekiliş mesajına ulaşılamadı.', flags: MessageFlags.Ephemeral });

                const reaction = targetMessage.reactions.cache.get('🎉');
                if (!reaction) return interaction.reply({ content: '❌ Katılımcı reaksiyonu (🎉) bulunamadı.', flags: MessageFlags.Ephemeral });

                await reaction.users.fetch();
                const katilimcilar = reaction.users.cache.filter(u => !u.bot);

                if (katilimcilar.size === 0) {
                    return interaction.reply({ content: '❌ Çekilişte reaksiyon veren geçerli kullanıcı kalmadığı için yeniden çekilemiyor.', flags: MessageFlags.Ephemeral });
                }

                const yeniKazananlar = katilimcilar.random(Math.min(veri.count, katilimcilar.size));
                const kazananMention = Array.isArray(yeniKazananlar) ? yeniKazananlar.map(u => u.toString()).join(', ') : yeniKazananlar.toString();

                const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@r2xzzs`;

                const yeniEmbed = new EmbedBuilder()
                    .setTitle('🏆 ÇEKİLİŞ YENİDEN ÇEKİLDİ!')
                    .setDescription(`**Ödül:** \`${veri.prize}\``)
                    .addFields(
                        { name: '👑 Kazanan(lar)', value: `> ${kazananMention}`, inline: true }, 
                        { name: '🎟 Katılımcı', value: `\`${katilimcilar.size} kişi\``, inline: true },
                        { name: '👤 Başlatan', value: `> ${baslatanUye}`, inline: false },
                        { name: '📅 Çekiliş Zamanı', value: `*Başlangıç:* <t:${veri.simdi}:F>\n*Son Yenilenme:* <t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
                    )
                    .setColor('#FF00AA')
                    .setFooter({ text: `Drop Zone TR • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'} • Yenilenme!` })
                    .setTimestamp();

                await targetMessage.edit({ embeds: [yeniEmbed] });
                await interaction.reply({ content: `✅ Çekiliş başarıyla yeniden sonuçlandırıldı!`, flags: MessageFlags.Ephemeral });
                await interaction.channel.send(`🎉 **Çekiliş Yeniden Çekildi!** Yeni Kazanan(lar): ${kazananMention} 💜`);

            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Yeniden çekme işlemi esnasında teknik bir hata oluştu.', flags: MessageFlags.Ephemeral });
            }
        }

        // ANKET BUTONLARI
        if (interaction.customId.startsWith('anket_')) {
            const parcalar = interaction.customId.split('_'); 
            const tip = parcalar[1];
            const anketId = parcalar[2];
            const userId = interaction.user.id;

            let evetOylari = await db.get(`anket_${anketId}_evet`) || [];
            let hayirOylari = await db.get(`anket_${anketId}_hayir`) || [];
            const soru = await db.get(`anket_${anketId}_soru`) || "Bilinmeyen Soru";
            const sahip = await db.get(`anket_${anketId}_sahip`) || "Bilinmiyor";

            if (tip === 'evet') {
                if (evetOylari.includes(userId)) {
                    evetOylari = evetOylari.filter(id => id !== userId);
                } else {
                    evetOylari.push(userId);
                    hayirOylari = hayirOylari.filter(id => id !== userId);
                }
            } else if (tip === 'hayir') {
                if (hayirOylari.includes(userId)) {
                    hayirOylari = hayirOylari.filter(id => id !== userId);
                } else {
                    hayirOylari.push(userId);
                    evetOylari = evetOylari.filter(id => id !== userId);
                }
            }

            await db.set(`anket_${anketId}_evet`, evetOylari);
            await db.set(`anket_${anketId}_hayir`, hayirOylari);

            const toplamOy = evetOylari.length + hayirOylari.length;
            const evetYuzde = toplamOy === 0 ? 0 : Math.round((evetOylari.length / toplamOy) * 100);
            const hayirYuzde = toplamOy === 0 ? 0 : Math.round((hayirOylari.length / toplamOy) * 100);

            const guncelEmbed = new EmbedBuilder()
                .setTitle('📊 DROP ZONE TR - ANKET')
                .setDescription(`**Soru:** ${soru}\n\n🟩 **Evet:** \`${evetYuzde}%\` (${evetOylari.length} Oy)\n🟥 **Hayır:** \`${hayirYuzde}%\` (${hayirOylari.length} Oy)`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Anketi Başlatan: ${sahip}` })
                .setTimestamp();

            await interaction.update({ embeds: [guncelEmbed] });
        }
    }
});

client.login(process.env.TOKEN);
