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

// SLASH KOMUT TANIMLAMALARI
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi (Örn: 1x Minecraft Premium)').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod (Fotoğraf veya TXT atacaksanız boş bırakın)').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('PC veya Telefondan direkt fotoğraf yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Kazananın DMsine gönderilecek .txt uzantılı liste/dosya').setRequired(false)),
        
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
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('legit').setDescription('Legit onayı oluşturur.').addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Verilen ödül').setRequired(true)).addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true)).addStringOption(o => o.setName('not_').setDescription('Ekstra not').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Gelişmiş çoktan seçmeli anket başlatır.')
        .addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
        .addStringOption(o => o.setName('secenek_a').setDescription('A Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_b').setDescription('B Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_c').setDescription('C Seçeneği (İsteğe bağlı)').setRequired(false))
        .addStringOption(o => o.setName('secenek_d').setDescription('D Seçeneği (İsteğe bağlı)').setRequired(false))
        .addStringOption(o => o.setName('secenek_e').setDescription('E Seçeneği (İsteğe bağlı)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Bot aracılığıyla sunucuda şık bir duyuru yapar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) 
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni. (Satır atlamak için \\n kullanın)').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı (Varsayılan: DUYURU)').setRequired(false))
        .addStringOption(o => o.setName('ping').setDescription('Etiketlenecek rol').addChoices(
            { name: '@everyone', value: 'everyone' },
            { name: '@here', value: 'here' },
            { name: 'Etiket Yok', value: 'none' }
        ).setRequired(false))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal (Seçilmezse bulunduğunuz kanala atar)').addChannelTypes(0).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Çizginin altında görünecek dipnot mesajı (Örn: Partner Ol • Rolünü Al!)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Sunucudaki tüm üyelere DM üzerinden şık bir duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek duyuru metni (Alt satıra geçmek için \\n kullanabilirsiniz).').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel').setDescription('Duyuruya eklenecek görsel (İsteğe bağlı).').setRequired(false))
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

        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [rerollRow] }).catch(() => null);
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

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] }).catch(() => null);
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⚡` }).catch(() => null);
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

    // GÜVENLİ ÇEKİLİŞ CANLANDIRMA VE KONTROL MEKANİZMASI
    setInterval(async () => {
        try {
            const tumVeriler = await db.all();
            const aktifCekilisler = tumVeriler.filter(v => v.id.startsWith('cekilis_'));

            for (const cekilis of aktifCekilisler) {
                const msgId = cekilis.id.replace('cekilis_', '');
                const veri = cekilis.value;
                
                if (!veri || veri.bitti === true) continue;

                if (veri.bitisMs && veri.bitisMs <= Date.now()) {
                    await cekilisBitir(veri.channelId, msgId);
                }
            }
        } catch (err) {
            console.error('Zamanlanmış çekiliş kontrolünde hata:', err);
        }
    }, 15000); 
});

// 🔄 GÜVENLİ VE ANLIK DURUM (CUSTOM STATUS) KONTROL SİSTEMİ
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member || !newPresence.guild) return;
    
    const member = newPresence.member;
    if (member.guild.id !== newPresence.guild.id) return;
    if (member.user.bot) return;

    try {
        const customActivity = newPresence.activities.find(act => act.type === 4); 
        const statusText = customActivity && customActivity.state ? customActivity.state.toLowerCase() : "";

        const hasTargetText = statusText.includes('.gg/stealdawn') || statusText.includes('stealdawn');
        const hasRole = member.roles.cache.has(DROP_ROL_ID);

        if (hasTargetText && !hasRole) {
            await member.roles.add(DROP_ROL_ID);
            console.log(`✅ ${member.user.tag} durumuna kelimeyi ekledi. Rol verildi.`);
        } 
        else if (!hasTargetText && hasRole) {
            await member.roles.remove(DROP_ROL_ID);
            console.log(`❌ ${member.user.tag} durumundan kelimeyi sildi. Rol geri alındı.`);
        }
    } catch (err) {
        console.error(`⚠️ Rol verme/alma işleminde hata (Kullanıcı: ${member.user.tag}):`, err.message);
    }
});

// ETKİLEŞİM YÖNETİMİ (INTERACTIONS)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        // GELİŞMİŞ DUYURU KOMUTU
        if (interaction.commandName === 'duyuru') {
            try {
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

                let icerikMesaj = '';
                if (pingTipi === 'everyone') icerikMesaj = '@everyone';
                if (pingTipi === 'here') icerikMesaj = '@here';

                await kanal.send({ 
                    content: icerikMesaj ? icerikMesaj : undefined, 
                    embeds: [duyuruEmbed] 
                });

                await interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi!`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('Duyuru gönderilirken hata oluştu:', error);
                await interaction.reply({ content: '❌ Duyuru gönderilemedi. Yetkilerimi kontrol edin.', flags: MessageFlags.Ephemeral }).catch(() => null);
            }
        }

        // DM DUYURU SİSTEMİ
        if (interaction.commandName === 'dmduyuru') {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const mesajMetni = interaction.options.getString('mesaj').replace(/\\n/g, '\n');
                const gorsel = interaction.options.getAttachment('gorsel');

                const dmEmbed = new EmbedBuilder()
                    .setTitle(`📢 ${interaction.guild.name} • ÖNEMLİ DUYURU 📢`)
                    .setDescription(mesajMetni)
                    .setColor('#f1c40f')
                    .setTimestamp()
                    .setFooter({ 
                        text: `${interaction.guild.name} Yönetimi`, 
                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                    });

                if (gorsel) {
                    dmEmbed.setImage(gorsel.url);
                }

                const members = await interaction.guild.members.fetch();
                let basarili = 0;
                let basarisiz = 0;

                await interaction.editReply({ content: `⏳ DM Duyuru işlemi başlatıldı. Toplam **${members.size}** üyeye gönderiliyor...` });

                for (const [id, member] of members) {
                    if (member.user.bot) continue; 

                    try {
                        await member.send({ embeds: [dmEmbed] });
                        basarili++;
                        await new Promise(resolve => setTimeout(resolve, 350));
                    } catch (err) {
                        basarisiz++;
                    }
                }

                return interaction.editReply({ 
                    content: `✅ **DM Duyuru Tamamlandı!**\n\n🟢 Başarıyla Ulaşan: **${basarili}**\n🔴 İletilemeyen (DM Kapalı): **${basarisiz}**` 
                });
            } catch (error) {
                console.error("DM Duyuru hatası:", error);
                await interaction.editReply({ content: '❌ İşlem sırasında teknik bir hata oluştu.' }).catch(() => null);
            }
        }
        
        // DROP KOMUTU
        if (interaction.commandName === 'drop') {
            try {
                const gorunenOdul = interaction.options.getString('gorunen');
                const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
                const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
                const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
                
                if (!gizliOdul && !gorselDosyası && !txtDosyasi) {
                    return interaction.reply({ content: '❌ **Hata:** Ya `teslim_edilecek_odul` kısmına yazılı bilgi girmeli, ya `gorsel_dosyasi` kısmına bir fotoğraf yüklemeli ya da `txt_dosyasi` kısmına bir metin belgesi eklemelisiniz!', flags: MessageFlags.Ephemeral });
                }

                const gorselUrl = gorselDosyası ? gorselDosyası.url : null;
                const txtUrl = txtDosyasi ? txtDosyasi.url : null;
                const txtAdi = txtDosyasi ? txtDosyasi.name : null;
                
                const dropId = Date.now();
                const customId = `drop_${dropId}`;
                
                await db.set(`drop_data_${dropId}`, {
                    gorunen: gorunenOdul,
                    gizli: gizliOdul,
                    gorsel: gorselUrl,
                    txt: txtUrl,
                    txtIsim: txtAdi,
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
            } catch (error) {
                console.error("Drop başlatma hatası:", error);
                await interaction.reply({ content: '❌ Drop başlatılamadı.', flags: MessageFlags.Ephemeral }).catch(() => null);
            }
        }

        // TICKET PANEL
        if (interaction.commandName === 'ticketpanel') {
            try {
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticket_secim')
                        .setPlaceholder('Seçim yap')
                        .addOptions([
                            { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '🔮', description: 'Kazandığınız çekiliş ödülünü talep etmek için burayı kullanın.' },
                            { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁', description: 'Yayın veya etkinliklerden kazandığınız dropları teslim alın.' },
                            { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲', description: 'Güvenli hesap satın alma, fiyat ve stok bilgisi almak için.' },
                            { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝', description: 'Ortaklık, reklam ya da sponsorluk görüşmeleri yapmak için.' },
                            { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🤖', description: 'Ekibimize katılmak ve yetkili olmak istiyorsanız başvurun.' },
                            { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧', description: 'Yaşadığınız problemlerle ilgili teknik destek talebi oluşturun.' },
                            { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝', description: 'Sunucu içi şikayetlerinizi veya önerilerinizi bize iletin.' },
                            { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.' }
                        ])
                );

                const embed = new EmbedBuilder()
                    .setTitle('⚡ Steal Dawn — Destek Merkezi')
                    .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                    .setColor('#f1c40f')
                    .setFooter({ text: 'Steal Dawn • @r2xzzs' });

                await interaction.reply({ embeds: [embed], components: [row] });
            } catch (error) {
                console.error("Ticket panel hatası:", error);
            }
        }

        // VOUCH
        if (interaction.commandName === 'vouch') {
            try {
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
                    .setTitle('⚡ Yeni Vouch Onayı')
                    .setDescription(`${yetkili} yetkilisine başarılı bir işlem için vouch bırakıldı!`)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                        { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                        { name: '⭐ Değerlendirme', value: yildizlar, inline: true },
                        { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                        { name: '📝 Not', value: ekNot, inline: false }
                    )
                    .setColor('#f1c40f')
                    .setFooter({ 
                        text: `Vouch Ekleyen: ${interaction.user.username} • Steal Dawn`, 
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error("Vouch hatası:", error);
            }
        }

        // YETKİLİ PUAN
        if (interaction.commandName === 'yetkilipuan') {
            try {
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
            } catch (error) {
                console.error("Yetkili puan hatası:", error);
            }
        }

        // ÇEKİLİŞ KOMUTU (Uygulama yanıt vermedi hatası KESİN OLARAK ÇÖZÜLDÜ)
        if (interaction.commandName === 'cekilis') {
            try {
                // Discord 3 saniye süre dolup hata vermesin diye ilk iş deferReply tetikliyoruz
                await interaction.deferReply().catch(() => null); 

                const durInput = interaction.options.getString('sure');
                const count = interaction.options.getInteger('kazanan_sayisi');
                const prize = interaction.options.getString('odul');
                
                let msDur = ms(parseTurkceSure(durInput));
                const MAX_TIMEOUT = 2147483647; 

                if (!msDur || msDur > MAX_TIMEOUT) {
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
                
                if (!msDur || isNaN(msDur)) {
                    return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)' }).catch(() => null);
                }
                
                const simdi = Math.floor(Date.now() / 1000);
                const bitis = simdi + Math.floor(msDur / 1000);
                const bitisMs = Date.now() + msDur;
                
                const embed = new EmbedBuilder()
                    .setTitle('🎉 STEAL DAWN ÇEKİLİŞ 🎉')
                    .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                    .setColor('#f1c40f')
                    .setFooter({ text: `Steal Dawn • @${interaction.user.username} • 🎉 emojisine tıklayın!` })
                    .setTimestamp();
                
                const mesaj = await interaction.editReply({ embeds: [embed] }).catch(() => null);
                if (!mesaj) return; 

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
            } catch (error) {
                console.error("Çekiliş oluşturma hatası:", error);
                await interaction.editReply({ content: '❌ Çekiliş başlatılamadı.' }).catch(() => null);
            }
        }

        // MODERASYON (BAN, UNBAN, MUTE, UNMUTE)
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            try {
                if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', flags: MessageFlags.Ephemeral });
                
                await interaction.deferReply(); 

                if (interaction.commandName === 'ban') { 
                    const m = interaction.options.getMember('kisi'); 
                    if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                    await m.ban(); 
                    await interaction.editReply(`✅ ${m.user.tag} başarıyla banlandı.`); 
                }
                if (interaction.commandName === 'unban') { 
                    const id = interaction.options.getString('kisi_id');
                    await interaction.guild.members.unban(id); 
                    await interaction.editReply(`✅ \`${id}\` ID'li kullanıcının banı kaldırıldı.`); 
                }
                
                if (interaction.commandName === 'mute') { 
                    const m = interaction.options.getMember('kisi'); 
                    if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
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
                    
                    if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)' });
                    
                    await m.timeout(msDur, 'Mute Komutu'); 
                    await interaction.editReply(`✅ ${m} kullanıcısı **${sureInput}** boyunca susturuldu.`); 
                }
                
                if (interaction.commandName === 'unmute') { 
                    const m = interaction.options.getMember('kisi'); 
                    if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                    await m.timeout(null); 
                    await interaction.editReply(`✅ ${m} susturması başarıyla kaldırıldı.`); 
                }
            } catch (error) {
                console.error(`${interaction.commandName} komutunda hata oluştu:`, error);
                await interaction.editReply({ content: `❌ İşlem gerçekleştirilirken bir hata oluştu.` }).catch(() => null);
            }
        }

        // LEGIT
        if (interaction.commandName === 'legit') {
            try {
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
            } catch (error) {
                console.error("Legit hatası:", error);
            }
        }
    }
});

// 🔥 KORKUNÇ ÇÖKMELERİ VE LOG PATLAMALARINI ENGELLEYEN KORUMA KALKANI
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [HATA ENGELLENDİ] Yakalanamayan Söz Reddi (Unhandled Rejection):', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error('⚠️ [HATA ENGELLENDİ] Yakalanamayan İstisna (Uncaught Exception):', err);
});
