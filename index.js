require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    StringSelectMenuBuilder, 
    MessageFlags, 
    PermissionsBitField, 
    AttachmentBuilder 
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// 🛠️ SUNUCU VE ROL AYARLARI
const DESTEK_ROL_ID = '1520515365786882178';
const YETKILI_ROL_ID = '1520515365786882178';
const DROP_ROL_ID = '1526170253506379847'; 
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
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// 📌 TÜM SLASH KOMUTLARININ TANIMLANMASI
const commands = [
    // 📢 BOTUN SİZİN YERİNİZE MESAJ YAZMASI (/say VE /yaz)
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Bot sizin yerinize belirttiğiniz kanala mesaj gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj metni').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal (Seçilmezse bulunduğunuz kanal)').addChannelTypes(0).setRequired(false)),

    new SlashCommandBuilder()
        .setName('yaz')
        .setDescription('Bot sizin yerinize belirttiğiniz kanala mesaj gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj metni').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal (Seçilmezse bulunduğunuz kanal)').addChannelTypes(0).setRequired(false)),

    // 📢 KANAL DUYURU KOMUTU
    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Bot aracılığıyla kanalda şık bir duyuru yapar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) 
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(false))
        .addStringOption(o => o.setName('ping').setDescription('Etiketlenecek rol').addChoices(
            { name: '@everyone', value: 'everyone' },
            { name: '@here', value: 'here' },
            { name: 'Etiket Yok', value: 'none' }
        ).setRequired(false))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(0).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Çizginin altında görünecek dipnot').setRequired(false)),

    // 📩 DM DUYURU KOMUTU
    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Sunucudaki tüm üyelere DM üzerinden duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek DM mesajı').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(false)),

    // 🎁 DROP KOMUTU
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi (Örn: 1x Minecraft Premium)').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('PC veya Telefondan fotoğraf yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Kazananın DMsine gönderilecek .txt uzantılı dosya').setRequired(false)),
        
    // 🎉 ÇEKİLİŞ KOMUTU
    new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Yeni çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),

    // 🎫 TICKET PANELİ KOMUTU
    new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Destek panelini gönderir.'),
        
    // ⭐ VOUCH KOMUTU
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili kişi').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Değerlendirme yıldızı (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Eklemek istediğiniz not').setRequired(true)),
        
    // 📊 YETKİLİ PUAN KOMUTU
    new SlashCommandBuilder()
        .setName('yetkilipuan')
        .setDescription('Yetkilinin vouch ve legit puanlarına bakar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Bakmak istediğiniz kişi')),

    // 🔨 MODERASYON KOMUTLARI
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    
    // ✅ LEGİT KOMUTU
    new SlashCommandBuilder()
        .setName('legit')
        .setDescription('Legit onayı oluşturur.')
        .addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Verilen ödül').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addStringOption(o => o.setName('not_').setDescription('Ekstra not').setRequired(false)),
    
    // 📊 ANKET KOMUTU
    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Gelişmiş çoktan seçmeli anket başlatır.')
        .addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
        .addStringOption(o => o.setName('secenek_a').setDescription('A Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_b').setDescription('B Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_c').setDescription('C Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_d').setDescription('D Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_e').setDescription('E Seçeneği').setRequired(false))
].map(c => c.toJSON());

// ÇEKİLİŞ BİTİRME FONKSİYONU
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
            .setColor('#f1c40f')
            .setFooter({ text: `Steal Dawn • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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
        .setColor('#f1c40f')
        .setFooter({ text: `Steal Dawn • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⚡` });
}

// BOT HAZIR OLDUĞUNDA
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

    // Custom Status Kontrolü (Durumunda .gg/stealdawn olanlara otomatik rol verme)
    setInterval(async () => {
        client.guilds.cache.forEach(async (guild) => {
            try {
                await guild.members.fetch().catch(() => null); 
                const rol = guild.roles.cache.get(DROP_ROL_ID);
                if (!rol) return;

                guild.members.cache.forEach(async (member) => {
                    if (!member || !member.user || member.user.bot) return;

                    if (!member.presence || !member.presence.activities) return;

                    const customStatus = member.presence.activities.find(a => a.type === 4); 
                    const durumYazisi = customStatus && customStatus.state ? customStatus.state.toLowerCase() : "";

                    if (durumYazisi.includes('.gg/stealdawn')) {
                        if (!member.roles.cache.has(DROP_ROL_ID)) {
                            await member.roles.add(DROP_ROL_ID).catch(() => null);
                        }
                    } else {
                        if (member.roles.cache.has(DROP_ROL_ID)) {
                            await member.roles.remove(DROP_ROL_ID).catch(() => null);
                        }
                    }
                });
            } catch (err) {
                console.error("Durum kontrol hatası:", err);
            }
        });
    }, 30000); 
});

// ETKİLEŞİM VE KOMUT YÖNETİMİ
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {

        // 🤖 /SAY VEYA /YAZ KOMUTLARI
        if (interaction.commandName === 'say' || interaction.commandName === 'yaz') {
            const mesaj = interaction.options.getString('mesaj');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;

            const duzgunMesaj = mesaj.replace(/\\n/g, '\n');

            try {
                await kanal.send({ content: duzgunMesaj });
                await interaction.reply({ content: `✅ Mesajınız ${kanal} kanalına gönderildi!`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                console.error("Mesaj gönderme hatası:", err);
                await interaction.reply({ content: '❌ Mesaj gönderilirken bir hata oluştu.', flags: MessageFlags.Ephemeral });
            }
        }

        // 📢 /DUYURU KOMUTU
        if (interaction.commandName === 'duyuru') {
            const mesaj = interaction.options.getString('mesaj');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';
            const pingTipi = interaction.options.getString('ping') || 'none';
            const altMesaj = interaction.options.getString('alt_mesaj');

            let duzgunMesaj = mesaj.replace(/\\n/g, '\n');

            if (altMesaj) {
                const duzgunAltMesaj = altMesaj.replace(/\\n/g, '\n');
                duzgunMesaj += `\n\n--------------------\n🤝 **${duzgunAltMesaj}**\n--------------------`;
            }

            const duyuruEmbed = new EmbedBuilder()
                .setTitle(`📢 ${baslikMetni.toUpperCase()} 📢`)
                .setDescription(duzgunMesaj)
                .setColor('#f1c40f') 
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} Yönetimi`, 
                    iconURL: interaction.guild.iconURL({ dynamic: true }) 
                });

            try {
                let icerikMesaj = '';
                if (pingTipi === 'everyone') icerikMesaj = '@everyone';
                if (pingTipi === 'here') icerikMesaj = '@here';

                await kanal.send({ 
                    content: icerikMesaj ? icerikMesaj : undefined, 
                    embeds: [duyuruEmbed] 
                });

                await interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi!`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('Duyuru hatası:', error);
                await interaction.reply({ content: '❌ Duyuru gönderilemedi.', flags: MessageFlags.Ephemeral });
            }
        }

        // 📩 /DMDUYURU KOMUTU (ZAMAN AŞIMI KORUMALI)
        if (interaction.commandName === 'dmduyuru') {
            const mesaj = interaction.options.getString('mesaj');
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';

            await interaction.reply({ 
                content: '🔄 **DM Duyurusu başlatıldı!** Üyelere sırayla gönderiliyor, işlem bittiğinde size bilgi verilecektir...', 
                flags: MessageFlags.Ephemeral 
            });

            const duyuruEmbed = new EmbedBuilder()
                .setTitle(`📢 ${baslikMetni.toUpperCase()}`)
                .setDescription(mesaj.replace(/\\n/g, '\n'))
                .setColor('#f1c40f')
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} Yönetimi`, 
                    iconURL: interaction.guild.iconURL({ dynamic: true }) 
                });

            (async () => {
                try {
                    const members = await interaction.guild.members.fetch();
                    let basarili = 0;
                    let basarisiz = 0;

                    for (const [id, member] of members) {
                        if (member.user.bot) continue;

                        try {
                            await member.send({ embeds: [duyuruEmbed] });
                            basarili++;
                        } catch (err) {
                            basarisiz++;
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    await interaction.followUp({ 
                        content: `✅ **DM Duyurusu Tamamlandı!**\n\n🟢 **Başarıyla Gönderilen:** \`${basarili}\` kişi\n🔴 **DM Kapalı/Başarısız:** \`${basarisiz}\` kişi`,
                        flags: MessageFlags.Ephemeral 
                    });
                } catch (err) {
                    console.error("DM Duyuru Hatası:", err);
                }
            })();
        }
        
        // 🎁 /DROP KOMUTU
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
            
            if (!gizliOdul && !gorselDosyası && !txtDosyasi) {
                return interaction.reply({ content: '❌ Eksik bilgi girdiniz!', flags: MessageFlags.Ephemeral });
            }

            const dropId = Date.now();
            const customId = `drop_${dropId}`;
            
            await db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
                gizli: gizliOdul,
                gorsel: gorselDosyası ? gorselDosyası.url : null,
                txt: txtDosyasi ? txtDosyasi.url : null,
                txtIsim: txtDosyasi ? txtDosyasi.name : null,
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
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*\n⚠️ **Not:** Bu drop ödülünü sadece durumunda \`.gg/stealdawn\` taşıyan özel üyeler kapabilir!`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // 🎫 /TICKETPANEL KOMUTU
        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Seçim yap')
                    .addOptions([
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '🔮', description: 'Çekiliş ödül talebi.' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁', description: 'Drop ödül talebi.' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲', description: 'Hesap satışı ve bilgi.' },
                        { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝', description: 'Partnerlik görüşmeleri.' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🤖', description: 'Ekip başvurusu.' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧', description: 'Destek talepleri.' },
                        { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝', description: 'Şikayet ve önerileriniz.' },
                        { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer konular.' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('⚡ Steal Dawn — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#f1c40f')
                .setFooter({ text: 'Steal Dawn • @r2xzzs' });

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // ⭐ /VOUCH KOMUTU
        if (interaction.commandName === 'vouch') {
            const yetkili = interaction.options.getUser('veren');
            const alanUye = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const yildizSayisi = interaction.options.getInteger('yildiz');
            const ekNot = interaction.options.getString('not');
            
            const guildMember = await interaction.guild.members.fetch(yetkili.id);
            if (!guildMember.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Sadece Yetkili Ekibine vouch atılabilir.', flags: MessageFlags.Ephemeral });
            
            await db.add(`vouch_${yetkili.id}`, 1);
            const toplam = await db.get(`vouch_${yetkili.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('⚡ Yeni Vouch Onayı')
                .setDescription(`${yetkili} yetkilisine başarılı bir işlem için vouch bırakıldı!`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                    { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: '⭐'.repeat(yildizSayisi), inline: true },
                    { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#f1c40f')
                .setFooter({ text: `Vouch Ekleyen: ${interaction.user.username} • Steal Dawn` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }

        // 📊 /YETKİLİPUAN KOMUTU
        if (interaction.commandName === 'yetkilipuan') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const vSayi = await db.get(`vouch_${hedef.id}`) || 0;
            const lSayi = await db.get(`legit_${hedef.id}`) || 0;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${hedef.username} - İstatistikleri`)
                .setColor('#f1c40f')
                .addFields(
                    { name: '⚡ Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                )
                .setThumbnail(hedef.displayAvatarURL())
                .setFooter({ text: 'Steal Dawn' });
            
            await interaction.reply({ embeds: [embed] });
        }

        // 🎉 /CEKILIS KOMUTU
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
                .setTitle('🎉 STEAL DAWN ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • @${interaction.user.username}` })
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

        // 🔨 MODERASYON KOMUTLARI
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', flags: MessageFlags.Ephemeral });
            
            await interaction.deferReply(); 

            if (interaction.commandName === 'ban') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                await m.ban(); 
                await interaction.editReply(`✅ ${m.user.tag} banlandı.`); 
            }
            if (interaction.commandName === 'unban') { 
                const id = interaction.options.getString('kisi_id');
                await interaction.guild.members.unban(id); 
                await interaction.editReply(`✅ \`${id}\` ID'li kullanıcının banı kaldırıldı.`); 
            }
            if (interaction.commandName === 'mute') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                let msDur = ms(parseTurkceSure(interaction.options.getString('sure')));
                if (!msDur) return interaction.editReply('❌ Geçersiz süre.');
                await m.timeout(msDur, 'Mute Komutu'); 
                await interaction.editReply(`✅ ${m} susturuldu.`); 
            }
            if (interaction.commandName === 'unmute') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                await m.timeout(null); 
                await interaction.editReply(`✅ ${m} susturması kaldırıldı.`); 
            }
        }

        // ✅ /LEGIT KOMUTU
        if (interaction.commandName === 'legit') {
            const alan = interaction.options.getUser('alan');
            await db.add(`legit_${alan.id}`, 1);
            const toplam = await db.get(`legit_${alan.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Legit Onayı!')
                .setColor('#f1c40f')
                .addFields(
                    { name: '👤 Alan', value: `${alan}`, inline: true }, 
                    { name: '🔢 Toplam Legit', value: `${toplam}`, inline: true }
                )
                .setImage(interaction.options.getAttachment('image').url)
                .setFooter({ text: 'Steal Dawn' });
            
            await interaction.reply({ embeds: [embed] });
        }

        // 📊 /ANKET KOMUTU
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();

            const secenekler = [];
            if (interaction.options.getString('secenek_a')) secenekler.push({ id: 'a', metin: interaction.options.getString('secenek_a'), emoji: '🇦' });
            if (interaction.options.getString('secenek_b')) secenekler.push({ id: 'b', metin: interaction.options.getString('secenek_b'), emoji: '🇧' });
            if (interaction.options.getString('secenek_c')) secenekler.push({ id: 'c', metin: interaction.options.getString('secenek_c'), emoji: '🇨' });
            if (interaction.options.getString('secenek_d')) secenekler.push({ id: 'd', metin: interaction.options.getString('secenek_d'), emoji: '🇩' });
            if (interaction.options.getString('secenek_e')) secenekler.push({ id: 'e', metin: interaction.options.getString('secenek_e'), emoji: '🇪' });

            await db.set(`anket_${anketId}`, { soru, sahip: interaction.user.username, secenekler, oylar: {} });

            let aciklama = `**Soru:** ${soru}\n\n`;
            const row = new ActionRowBuilder();

            secenekler.forEach(s => {
                aciklama += `${s.emoji} **${s.metin}:** \`0%\` (0 Oy)\n`;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`anket_oy_${anketId}_${s.id}`)
                        .setLabel(s.metin.length > 20 ? s.metin.substring(0, 17) + '...' : s.metin)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(s.emoji)
                );
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 STEAL DAWN - GELİŞMİŞ ANKET')
                .setDescription(aciklama)
                .setColor('#f1c40f')
                .setFooter({ text: `Anketi Başlatan: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // 🔘 BUTON DİNLEYİCİLERİ
    else if (interaction.isButton()) {
        
        // 🔒 TICKET KAPATMA BUTONU
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 **Ticket 5 saniye içinde kapatılıyor ve siliniyor...**' });
            
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error("Kanal silme hatası:", err);
                }
            }, 5000);
        }

        // DROP BUTONU
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropData = await db.get(`drop_data_${dropId}`);

            if (!dropData) {
                return interaction.reply({ content: '❌ Bu drop verisi bulunamadı veya süresi doldu.', flags: MessageFlags.Ephemeral });
            }

            if (dropData.bitti) {
                return interaction.reply({ content: '❌ Bu drop ödülü zaten başkası tarafından kapıldı!', flags: MessageFlags.Ephemeral });
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const customStatus = member.presence?.activities?.find(a => a.type === 4);
            const durumYazisi = customStatus && customStatus.state ? customStatus.state.toLowerCase() : "";

            if (!durumYazisi.includes('.gg/stealdawn')) {
                return interaction.reply({ 
                    content: '❌ Bu drop ödülünü alabilmek için profil durumunda (Custom Status) `.gg/stealdawn` linki bulunmalıdır!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.deferUpdate();
            await db.set(`drop_data_${dropId}.bitti`, true);

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(interaction.customId)
                    .setLabel('KAPILDI!')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

            const kazananEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setTitle('🏆 DROP KAPILDI!')
                .setDescription(`**Ödül:** \`${dropData.gorunen}\`\n\n🎉 **Ödülü Kapan:** ${interaction.user}`)
                .setColor('#2ecc71');

            await interaction.message.edit({ embeds: [kazananEmbed], components: [disabledRow] });

            try {
                let dmMesaj = `🎉 **Tebrikler!** \`${interaction.guild.name}\` sunucusunda **${dropData.gorunen}** drop ödülünü kazandın!\n`;
                if (dropData.gizli) dmMesaj += `\n🔑 **Ödül Bilgisi / Kod:** \`${dropData.gizli}\``;

                const files = [];
                if (dropData.gorsel) files.push(dropData.gorsel);
                if (dropData.txt) files.push(new AttachmentBuilder(dropData.txt, { name: dropData.txtIsim || 'odul.txt' }));

                await interaction.user.send({ content: dmMesaj, files: files.length > 0 ? files : undefined });
                await interaction.followUp({ content: `✅ Ödülünüz DM üzerinden gönderildi, ${interaction.user}!`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                await interaction.followUp({ content: `✅ Ödülü kazandınız ${interaction.user}, ancak DM kutunuz kapalı olduğu için ödül bilgisi iletilemedi!`, flags: MessageFlags.Ephemeral });
            }
        }

        // ANKET OY BUTONU
        if (interaction.customId.startsWith('anket_oy_')) {
            const parts = interaction.customId.split('_');
            const anketId = parts[2];
            const secenekId = parts[3];

            const anket = await db.get(`anket_${anketId}`);
            if (!anket) return interaction.reply({ content: '❌ Bu anket bulunamadı.', flags: MessageFlags.Ephemeral });

            anket.oylar[interaction.user.id] = secenekId;
            await db.set(`anket_${anketId}.oylar`, anket.oylar);

            const toplamOy = Object.keys(anket.oylar).length;
            let yeniAciklama = `**Soru:** ${anket.soru}\n\n`;

            anket.secenekler.forEach(s => {
                const oySayisi = Object.values(anket.oylar).filter(o => o === s.id).length;
                const yuzde = toplamOy > 0 ? Math.round((oySayisi / toplamOy) * 100) : 0;
                yeniAciklama += `${s.emoji} **${s.metin}:** \`%${yuzde}\` (${oySayisi} Oy)\n`;
            });

            const guncelEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(yeniAciklama);
            await interaction.update({ embeds: [guncelEmbed] });
        }

        // ÇEKİLİŞ REROLL BUTONU
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ Yeniden çekiliş yapma yetkiniz yok!', flags: MessageFlags.Ephemeral });
            }

            const msgId = interaction.customId.replace('cekilis_reroll_', '');
            const reaction = interaction.message.reactions.cache.get('🎉');
            if (!reaction) return interaction.reply({ content: '❌ Reaksiyon verisi bulunamadı.', flags: MessageFlags.Ephemeral });

            await reaction.users.fetch();
            const katilimcilar = reaction.users.cache.filter(u => !u.bot);

            if (katilimcilar.size === 0) {
                return interaction.reply({ content: '❌ Katılımcı olmadığı için yeni kazanan seçilemedi.', flags: MessageFlags.Ephemeral });
            }

            const yeniKazanan = katilimcilar.random();
            await interaction.reply({ content: `🎉 **Yeni Kazanan:** ${yeniKazanan}! Tebrikler!` });
        }
    }

    // SELECT MENU / TICKET İŞLEMLERİ
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

            const kanalAdi = `${kategoriIsimleri[secim] || 'ticket'}-${interaction.user.username}`;

            try {
                const ticketKanal = await interaction.guild.channels.create({
                    name: kanalAdi,
                    type: 0,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                        { id: DESTEK_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎟️ Destek Talebi Oluşturuldu')
                    .setDescription(`Merhaba ${interaction.user}, destek ekibimiz en kısa sürede sizinle ilgilenecektir.\n\n**Seçilen Kategori:** \`${secim}\``)
                    .setColor('#f1c40f')
                    .setTimestamp();

                // 🔒 TICKET KAPATMA BUTONU
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_kapat')
                        .setLabel('Talebi Kapat')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

                await ticketKanal.send({ 
                    content: `${interaction.user} | <@&${DESTEK_ROL_ID}>`, 
                    embeds: [ticketEmbed], 
                    components: [closeRow] 
                });

                await interaction.editReply({ content: `✅ Ticket kanalınız oluşturuldu: ${ticketKanal}` });
            } catch (err) {
                console.error("Ticket kanalı oluşturma hatası:", err);
                await interaction.editReply({ content: '❌ Ticket kanalı oluşturulurken bir hata oluştu.' });
            }
        }
    }
});

client.login(process.env.TOKEN);
