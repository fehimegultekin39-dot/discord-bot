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
    PermissionsBitField, 
    ChannelType,
    AttachmentBuilder 
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000, () => console.log('Web sunucusu 3000 portunda aktif.'));

// 🛠️ SUNUCU VE ROL AYARLARI
const DESTEK_ROL_ID = '1520515365786882178';
const YETKILI_ROL_ID = '1520515365786882178';
const DROP_ROL_ID = '1526170253506379847'; 
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1520473034694066361/1520530500022960198';

function parseTurkceSure(sure) {
    if (!sure) return null;
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
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Bot sizin yerinize belirttiğiniz kanala mesaj gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj metni').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(ChannelType.GuildText).setRequired(false)),

    new SlashCommandBuilder()
        .setName('yaz')
        .setDescription('Bot sizin yerinize belirttiğiniz kanala mesaj gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj metni').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(ChannelType.GuildText).setRequired(false)),

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
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Çizginin altında görünecek dipnot').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Sunucudaki tüm üyelere DM üzerinden duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek DM mesajı').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(false)),

    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('Fotoğraf yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Gidecek .txt dosyası').setRequired(false)),

    new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Yeni çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Destek panelini gönderir.'),

    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Değerlendirme yıldızı (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Ek not').setRequired(true)),

    new SlashCommandBuilder()
        .setName('yetkilipuan')
        .setDescription('Yetkilinin vouch ve legit puanlarına bakar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Bakmak istediğiniz kişi')),

    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),

    new SlashCommandBuilder()
        .setName('legit')
        .setDescription('Legit onayı oluşturur.')
        .addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Verilen ödül').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addStringOption(o => o.setName('not_').setDescription('Ekstra not').setRequired(false)),

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

// 🎁 ÇEKİLİŞ BİTİRME VE RE-ROLL FONKSİYONU
async function cekilisBitir(channelId, messageId, isReroll = false) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri) return null;
    if (veri.bitti === true && !isReroll) return null;

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return null;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return null;

    await db.set(`cekilis_${messageId}.bitti`, true);

    const reaction = guncelMesaj.reactions.cache.get('🎉');
    if (!reaction) {
        await kanal.send(`❌ \`${veri.prize}\` çekilişi için reaksiyon bulunamadı.`);
        return;
    }

    await reaction.users.fetch();
    const katilimcilar = reaction.users.cache.filter(u => !u.bot);

    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@StealDawn`;

    if (katilimcilar.size === 0) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nKatılımcı bulunmadığı için çekiliş iptal edildi.`)
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

    const kazananSayisi = Math.min(veri.count, katilimcilar.size);
    const kazananlarListesi = katilimcilar.random(kazananSayisi);
    const kazananlar = Array.isArray(kazananlarListesi) ? kazananlarListesi : [kazananlarListesi];
    const kazananMention = kazananlar.map(u => u.toString()).join(', ');

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
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} **\`${veri.prize}\` kazandı!** ⚡` });
    return kazananMention;
}

// BOT HAZIR OLDUĞUNDA
client.once('ready', async (c) => {
    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log('Slash komutları yenileniyor...');
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('Slash komutları başarıyla güncellendi!');
    } catch (error) {
        console.error('Komutlar yüklenirken hata oluştu:', error);
    }
    
    console.log(`${c.user.tag} aktif!`);

    // Aktif Çekilişleri Kontrol Et
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

    // Custom Status Kontrolü (.gg/stealdawn taşıyanlara rol)
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

    // 1️⃣ SLASH KOMUTLARI
    if (interaction.isChatInputCommand()) {

        // /SAY & /YAZ
        if (interaction.commandName === 'say' || interaction.commandName === 'yaz') {
            const mesaj = interaction.options.getString('mesaj');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;
            const duzgunMesaj = mesaj.replace(/\\n/g, '\n');

            try {
                await kanal.send({ content: duzgunMesaj });
                await interaction.reply({ content: `✅ Mesajınız ${kanal} kanalına gönderildi!`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Mesaj gönderilirken bir hata oluştu.', ephemeral: true });
            }
        }

        // /DUYURU
        if (interaction.commandName === 'duyuru') {
            const mesaj = interaction.options.getString('mesaj');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';
            const pingTipi = interaction.options.getString('ping') || 'none';
            const altMesaj = interaction.options.getString('alt_mesaj');

            let duzgunMesaj = mesaj.replace(/\\n/g, '\n');
            if (altMesaj) {
                duzgunMesaj += `\n\n--------------------\n🤝 **${altMesaj.replace(/\\n/g, '\n')}**\n--------------------`;
            }

            const duyuruEmbed = new EmbedBuilder()
                .setTitle(`📢 ${baslikMetni.toUpperCase()} 📢`)
                .setDescription(duzgunMesaj)
                .setColor('#f1c40f') 
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL({ dynamic: true }) });

            try {
                let icerikMesaj = '';
                if (pingTipi === 'everyone') icerikMesaj = '@everyone';
                if (pingTipi === 'here') icerikMesaj = '@here';

                await kanal.send({ content: icerikMesaj || undefined, embeds: [duyuruEmbed] });
                await interaction.reply({ content: `✅ Duyuru ${kanal} kanalına gönderildi!`, ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: '❌ Duyuru gönderilemedi.', ephemeral: true });
            }
        }

        // /DMDUYURU
        if (interaction.commandName === 'dmduyuru') {
            const mesaj = interaction.options.getString('mesaj');
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';

            await interaction.deferReply({ ephemeral: true });

            (async () => {
                try {
                    const members = await interaction.guild.members.fetch();
                    const insanUyeler = members.filter(m => !m.user.bot);
                    const toplam = insanUyeler.size;

                    let basarili = 0, basarisiz = 0, sayac = 0;

                    const barYap = (mevcut, toplamSayi) => {
                        const yuzde = Math.round((mevcut / toplamSayi) * 10);
                        return '🟩'.repeat(yuzde) + '⬜'.repeat(10 - yuzde);
                    };

                    const gonderilecekEmbed = new EmbedBuilder()
                        .setTitle(`📢 ${baslikMetni.toUpperCase()}`)
                        .setDescription(mesaj.replace(/\\n/g, '\n'))
                        .setColor('#f1c40f')
                        .setTimestamp()
                        .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL({ dynamic: true }) });

                    for (const [id, member] of insanUyeler) {
                        sayac++;
                        try {
                            await member.send({ embeds: [gonderilecekEmbed] });
                            basarili++;
                        } catch (err) {
                            basarisiz++;
                        }

                        if (sayac % 5 === 0 || sayac === toplam) {
                            const yuzdeSayi = Math.floor((sayac / toplam) * 100);
                            await interaction.editReply({ 
                                content: `🔄 **DM Duyurusu Gönderiliyor...**\n` +
                                         `İlerleme: [${barYap(sayac, toplam)}] **%${yuzdeSayi}**\n` +
                                         `📊 Toplam: **${toplam}** | ✅ Başarılı: **${basarili}** | ❌ Kapalı DM: **${basarisiz}**`
                            });
                        }

                        await new Promise(resolve => setTimeout(resolve, 1200));
                    }

                    await interaction.editReply({ 
                        content: `✅ **DM Duyuru İşlemi Tamamlandı!**\n\n` +
                                 `📊 Toplam: **${toplam}** | 🟢 Gönderilen: **${basarili}** | 🔴 Başarısız: **${basarisiz}**`
                    });

                } catch (err) {
                    await interaction.editReply({ content: '❌ DM Duyurusu gönderilirken hata oluştu.' });
                }
            })();
        }

        // /DROP
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyasi = interaction.options.getAttachment('gorsel_dosyasi');
            const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
            
            if (!gizliOdul && !gorselDosyasi && !txtDosyasi) {
                return interaction.reply({ content: '❌ En az bir ödül veya dosya eklemelisiniz!', ephemeral: true });
            }

            const dropId = Date.now();
            
            await db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
                gizli: gizliOdul,
                gorsel: gorselDosyasi ? gorselDosyasi.url : null,
                txt: txtDosyasi ? txtDosyasi.url : null,
                txtIsim: txtDosyasi ? txtDosyasi.name : null,
                baslatan: interaction.user.username,
                bitti: false
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`drop_${dropId}`)
                    .setLabel('ÖDÜLÜ KAP!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*\n⚠️ **Not:** Sadece durumunda \`.gg/stealdawn\` taşıyan üyeler alabilir!`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // /TICKETPANEL (Görseldeki "Uygulama Yanıt Vermedi" Hatası Kesin Düzeltildi!)
        if (interaction.commandName === 'ticketpanel') {
            await interaction.deferReply({ ephemeral: true }); // Discord'a işlem aldığımızı bildiriyoruz

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Destek kategorisi seçin...')
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
                .setFooter({ text: 'Steal Dawn • Destek Sistemi' });

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: '✅ Ticket paneli başarıyla gönderildi!' });
        }

        // /VOUCH
        if (interaction.commandName === 'vouch') {
            const yetkili = interaction.options.getUser('veren');
            const alanUye = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const yildizSayisi = interaction.options.getInteger('yildiz');
            const ekNot = interaction.options.getString('not');
            
            const guildMember = await interaction.guild.members.fetch(yetkili.id).catch(() => null);
            if (!guildMember || !guildMember.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ Sadece Yetkili Ekibine vouch verilebilir.', ephemeral: true });
            }
            
            await db.add(`vouch_${yetkili.id}`, 1);
            const toplam = await db.get(`vouch_${yetkili.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('⚡ Yeni Vouch Onayı')
                .setDescription(`${yetkili} yetkilisine başarılı işlem için vouch bırakıldı!`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
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

        // /YETKİLİPUAN
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

        // /CEKILIS
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

        // MODERASYON KOMUTLARI
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            
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

        // /LEGIT
        if (interaction.commandName === 'legit') {
            const alan = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const not = interaction.options.getString('not_') || 'Yok';

            await db.add(`legit_${alan.id}`, 1);
            const toplam = await db.get(`legit_${alan.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Legit Onayı!')
                .setColor('#f1c40f')
                .addFields(
                    { name: '👤 Ödülü Alan', value: `${alan}`, inline: true }, 
                    { name: '🎁 Ödül', value: `${odul}`, inline: true },
                    { name: '🔢 Toplam Legit', value: `\`${toplam}\``, inline: true },
                    { name: '📝 Not', value: `${not}`, inline: false }
                )
                .setImage(interaction.options.getAttachment('image').url)
                .setFooter({ text: 'Steal Dawn' });
            
            await interaction.reply({ embeds: [embed] });
        }

        // /ANKET
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();

            const secenekler = [];
            const emojiler = ['🇦', '🇧', '🇨', '🇩', '🇪'];
            const harfler = ['a', 'b', 'c', 'd', 'e'];

            harfler.forEach((h, index) => {
                const val = interaction.options.getString(`secenek_${h}`);
                if (val) {
                    secenekler.push({ id: h, metin: val, emoji: emojiler[index], oy: 0 });
                }
            });

            await db.set(`anket_${anketId}`, { soru, secenekler, oyKullananlar: {} });

            let aciklama = `**${soru}**\n\n`;
            const buttons = new ActionRowBuilder();

            secenekler.forEach(s => {
                aciklama += `${s.emoji} **${s.metin}** — \`0 oy (%0)\`\n`;
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`anket_${anketId}_${s.id}`)
                        .setLabel(s.emoji)
                        .setStyle(ButtonStyle.Primary)
                );
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 ANKET BAŞLADI')
                .setDescription(aciklama)
                .setColor('#f1c40f')
                .setFooter({ text: 'Oy vermek için aşağıdaki butonlara tıklayın!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [buttons] });
        }
    }

    // 2️⃣ TICKET AÇMA SEÇİM MENÜSÜ
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_secim') {
        const secim = interaction.values[0];
        const guild = interaction.guild;
        const user = interaction.user;

        const varolanKanal = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        if (varolanKanal) {
            return interaction.reply({ content: `❌ Zaten açık bir biletiniz var: ${varolanKanal}`, ephemeral: true });
        }

        const channel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                { id: DESTEK_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎟️ Destek Talebi — ${secim.toUpperCase().replace('_', ' ')}`)
            .setDescription(`Merhaba ${user}, destek ekibimiz en kısa sürede seninle ilgilenecektir.\n\nTicket kapatmak için aşağıdaki butona basabilirsiniz.`)
            .setColor('#f1c40f')
            .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_kapat')
                .setLabel('🔒 Ticket Kapat')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${user.id}> | <@&${DESTEK_ROL_ID}>`, embeds: [embed], components: [closeRow] });
        await interaction.reply({ content: `✅ Ticket kanalınız oluşturuldu: ${channel}`, ephemeral: true });
    }

    // 3️⃣ BUTON ETKİLEŞİMLERİ (Drop, Ticket Kapatma, Re-roll, Anket)
    if (interaction.isButton()) {
        
        // TICKET KAPATMA
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply('🔒 Bilet 5 saniye içinde siliniyor...');
            setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
        }

        // DROP ÖDÜLÜ KAPMA
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropData = await db.get(`drop_data_${dropId}`);

            if (!dropData) return interaction.reply({ content: '❌ Drop bulunamadı veya süresi doldu.', ephemeral: true });
            if (dropData.bitti) return interaction.reply({ content: '❌ Bu drop daha önce kapıldı!', ephemeral: true });

            // Durum kontrolü (.gg/stealdawn)
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const customStatus = member.presence?.activities.find(a => a.type === 4);
            const durumYazisi = customStatus?.state ? customStatus.state.toLowerCase() : "";

            if (!durumYazisi.includes('.gg/stealdawn')) {
                return interaction.reply({ 
                    content: '❌ Bu dropu kapabilmek için Discord durumunuza (Custom Status) `.gg/stealdawn` yazmalısınız!', 
                    ephemeral: true 
                });
            }

            await db.set(`drop_data_${dropId}.bitti`, true);

            // Ödülü Kazananın DM'ine Gönder
            try {
                let dmContent = `🎉 **Tebrikler! Drop Kaptınız!**\n\n**Kazandığınız Ödül:** \`${dropData.gorunen}\``;
                if (dropData.gizli) dmContent += `\n**Gizli Kod/Hesap:** \`${dropData.gizli}\``;

                const files = [];
                if (dropData.txt) files.push(new AttachmentBuilder(dropData.txt, { name: dropData.txtIsim || 'odul.txt' }));

                await interaction.user.send({ content: dmContent, files: files });
            } catch (err) {
                console.log("DM Gönderilemedi:", err);
            }

            const bitisEmbed = new EmbedBuilder()
                .setTitle('🏆 DROP KAPILDI!')
                .setDescription(`**Ödül:** \`${dropData.gorunen}\`\n\n🎉 **Kazanan:** ${interaction.user}`)
                .setColor('#2ecc71')
                .setFooter({ text: `Steal Dawn • Başlatan: @${dropData.baslatan}` })
                .setTimestamp();

            const pasifRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('drop_bitti')
                    .setLabel('KAZANILDI')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await interaction.update({ embeds: [bitisEmbed], components: [pasifRow] });
            await interaction.followUp({ content: `🎉 Tebrikler ${interaction.user}, drop ödülü DM adresine gönderildi!` });
        }

        // ÇEKİLİŞ RE-ROLL (YENİDEN ÇEK)
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ Yeniden çekmek için yetkiniz yok.', ephemeral: true });
            }

            const msgId = interaction.customId.replace('cekilis_reroll_', '');
            await interaction.reply({ content: '🔄 Çekiliş yeniden çekiliyor...', ephemeral: true });
            await cekilisBitir(interaction.channel.id, msgId, true);
        }

        // ANKET OY KULLANMA
        if (interaction.customId.startsWith('anket_')) {
            const parts = interaction.customId.split('_');
            const anketId = parts[1];
            const secenekId = parts[2];

            const anket = await db.get(`anket_${anketId}`);
            if (!anket) return interaction.reply({ content: '❌ Anket bulunamadı.', ephemeral: true });

            if (anket.oyKullananlar[interaction.user.id]) {
                return interaction.reply({ content: '❌ Bu ankette zaten oy kullandınız!', ephemeral: true });
            }

            anket.oyKullananlar[interaction.user.id] = secenekId;
            const secenek = anket.secenekler.find(s => s.id === secenekId);
            if (secenek) secenek.oy += 1;

            await db.set(`anket_${anketId}`, anket);

            const toplamOy = Object.keys(anket.oyKullananlar).length;

            let yeniAciklama = `**${anket.soru}**\n\n`;
            anket.secenekler.forEach(s => {
                const yuzde = toplamOy > 0 ? Math.round((s.oy / toplamOy) * 100) : 0;
                yeniAciklama += `${s.emoji} **${s.metin}** — \`${s.oy} oy (%${yuzde})\`\n`;
            });

            const guncelEmbed = new EmbedBuilder()
                .setTitle('📊 ANKET (GÜNCEL)')
                .setDescription(yeniAciklama)
                .setColor('#f1c40f')
                .setFooter({ text: `Toplam Oy: ${toplamOy}` })
                .setTimestamp();

            await interaction.message.edit({ embeds: [guncelEmbed] });
            await interaction.reply({ content: `✅ Oyunuz (${secenek.emoji}) kaydedildi!`, ephemeral: true });
        }
    }
});

// BOTU BAŞLAT
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
