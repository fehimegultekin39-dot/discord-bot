require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField, AttachmentBuilder, Collection } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// 🛠️ SUNUCU AYARLARI (Kendi ID'lerinizle Değiştirin)
const DESTEK_ROL_ID = '1520515365786882178';
const YETKILI_ROL_ID = '1520515365786882178'; 
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1520473034694066361/1520530500022960198';
const PREFIX = '-'; // İstediğin mesaj ön eki

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

// Davet takibi için GuildInvites niyetini (intent) ekledik
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// Davet kodlarının kullanım verilerini önbellekte tutmak için koleksiyon
client.invites = new Collection();

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
        .setName('davet')
        .setDescription('Davet istatistiklerinizi veya belirtilen kullanıcının istatistiklerini gösterir.')
        .addUserOption(o => o.setName('kullanici').setDescription('Davetlerine bakmak istediğiniz kullanıcı').setRequired(false))
].map(c => c.toJSON());

// YARDIMCI VERİ TABANI FONKSİYONU
async function getUserInviteData(userId) {
    const veri = await db.get(`invData_${userId}`);
    if (!veri) {
        return { regular: 0, fake: 0, leaves: 0, rejoins: 0, bonus: 0 };
    }
    return {
        regular: veri.regular || 0,
        fake: veri.fake || 0,
        leaves: veri.leaves || 0,
        rejoins: veri.rejoins || 0,
        bonus: veri.bonus || 0
    };
}

// ŞIK DAVET EMBED TASARIMI
function createInviteEmbed(targetUser, data) {
    const total = data.regular + data.rejoins + data.bonus;
    return new EmbedBuilder()
        .setTitle(`📩 ${targetUser.username} Davet Bilgileri`)
        .setDescription(`Toplam **${total}** geçerli davetin bulunuyor!\n\n` +
                     `✅ **Normal (Düzenli):** ${data.regular}\n` +
                     `🔄 **Tekrar Giren (Rejoin):** ${data.rejoins}\n` +
                     `❌ **Ayrılan (Leave):** ${data.leaves}\n` +
                     `⚠️ **Sahte (Fake):** ${data.fake}\n` +
                     `✨ **Bonus:** ${data.bonus}`)
        .setColor('#000000')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `Nexus Davet Takip Sistemi` });
}

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
            .setColor('#000000')
            .setFooter({ text: `Nexus • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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
        .setFooter({ text: `Nexus • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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

    // Mevcut sunucu davet kodlarını hafızaya çekiyoruz
    client.guilds.cache.forEach(async (guild) => {
        try {
            const currentInvites = await guild.invites.fetch();
            client.invites.set(guild.id, new Collection(currentInvites.map(i => [i.code, i.uses])));
            console.log(`[DAVET] ${guild.name} sunucusunun davet kodları hafızaya alındı.`);
        } catch (err) {
            console.log(`[DAVET HATA] ${guild.name} davetleri alınamadı.`);
        }
    });

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

// DAVET TAKİP TETİKLEYİCİLERİ
client.on('guildMemberAdd', async (member) => {
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = client.invites.get(member.guild.id);
        
        const invite = newInvites.find(i => oldInvites && i.uses > oldInvites.get(i.code));
        
        if (invite && invite.inviter) {
            const inviterId = invite.inviter.id;
            const data = await getUserInviteData(inviterId);
            
            // Rejoin Kontrolü: Bu kullanıcı daha önce girip çıkmış mı?
            const joinHistory = await db.get(`joinedBefore_${member.guild.id}_${member.id}`);
            
            if (joinHistory) {
                const previousInviterId = joinHistory;
                const prevData = await getUserInviteData(previousInviterId);
                
                if (prevData.leaves > 0) prevData.leaves -= 1;
                data.rejoins += 1;
                
                await db.set(`invData_${previousInviterId}`, prevData);
            } else {
                // İlk defa geliyorsa sahte hesap kontrolü (3 günden yeniyse fake)
                const isFake = (Date.now() - member.user.createdTimestamp) < 259200000;
                if (isFake) {
                    data.fake += 1;
                } else {
                    data.regular += 1;
                }
            }
            
            await db.set(`joinedBefore_${member.guild.id}_${member.id}`, inviterId);
            await db.set(`invData_${inviterId}`, data);
        }
        
        client.invites.set(member.guild.id, new Collection(newInvites.map(i => [i.code, i.uses])));
    } catch (err) {
        console.error('Katılma davet takibi hatası:', err);
    }
});

client.on('guildMemberRemove', async (member) => {
    try {
        const inviterId = await db.get(`joinedBefore_${member.guild.id}_${member.id}`);
        if (inviterId) {
            const data = await getUserInviteData(inviterId);
            data.leaves += 1;
            if (data.regular > 0) data.regular -= 1;
            
            await db.set(`invData_${inviterId}`, data);
        }
    } catch (err) {
        console.error('Ayrılma davet takibi hatası:', err);
    }
});

// Sunucuda yeni davet oluşturulursa hafızaya ekle
client.on('guildInviteCreate', async (invite) => {
    if (!client.invites.has(invite.guild.id)) client.invites.set(invite.guild.id, new Collection());
    client.invites.get(invite.guild.id).set(invite.code, invite.uses);
});

// Davet silinirse hafızadan kaldır
client.on('guildInviteDelete', async (invite) => {
    if (client.invites.has(invite.guild.id)) client.invites.get(invite.guild.id).delete(invite.code);
});


// ETKİLEŞİM YÖNETİMİ (INTERACTIONS)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        // DROP KOMUTU
        if (interaction.commandName === 'drop') {
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
                .setTitle('🎉 NEXUS DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur ve otomatik olarak DM kutusuna gönderilir!*`)
                .setColor('#000000')
                .setFooter({ text: `Nexus • Başlatan: @${interaction.user.username}` })
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
                .setTitle('⚡ Nexus — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#000000')
                .setFooter({ text: 'Nexus • @r2xzzs' });

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
                .setColor('#000000')
                .setFooter({ 
                    text: `Vouch Ekleyen: ${interaction.user.username} • Nexus`, 
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
                .setColor('#000000')
                .addFields(
                    { name: '⚡ Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                )
                .setThumbnail(hedef.displayAvatarURL())
                .setFooter({ text: 'Nexus' });
            
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
                .setTitle('🎉 NEXUS ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#000000')
                .setFooter({ text: `Nexus • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
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
        }

        // LEGIT
        if (interaction.commandName === 'legit') {
            const alan = interaction.options.getUser('alan');
            await db.add(`legit_${alan.id}`, 1);
            const toplam = await db.get(`legit_${alan.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Legit Onayı!')
                .setColor('#000000')
                .addFields(
                    { name: '👤 Alan', value: `${alan}`, inline: true }, 
                    { name: '🔢 Toplam Legit', value: `${toplam}`, inline: true }
                )
                .setImage(interaction.options.getAttachment('image').url)
                .setFooter({ text: 'Nexus' });
            
            await interaction.reply({ embeds: [embed] });
        }

        // ANKET SİSTEMİ
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();

            const secenekler = [];
            if (interaction.options.getString('secenek_a')) secenekler.push({ id: 'a', metin: interaction.options.getString('secenek_a'), emoji: '🇦' });
            if (interaction.options.getString('secenek_b')) secenekler.push({ id: 'b', metin: interaction.options.getString('secenek_b'), emoji: '🇧' });
            if (interaction.options.getString('secenek_c')) secenekler.push({ id: 'c', metin: interaction.options.getString('secenek_c'), emoji: '🇨' });
            if (interaction.options.getString('secenek_d')) secenekler.push({ id: 'd', metin: interaction.options.getString('secenek_d'), emoji: '🇩' });
            if (interaction.options.getString('secenek_e')) secenekler.push({ id: 'e', metin: interaction.options.getString('secenek_e'), emoji: '🇪' });

            await db.set(`anket_${anketId}`, {
                soru: soru,
                sahip: interaction.user.username,
                secenekler: secenekler,
                oylar: {} 
            });

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
                .setTitle('📊 NEXUS - GELİŞMİŞ ANKET')
                .setDescription(aciklama)
                .setColor('#000000')
                .setFooter({ text: `Anketi Başlatan: ${interaction.user.username} • Herkes 1 oy kullanabilir.` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // SLASH DAVET KOMUTU
        if (interaction.commandName === 'davet') {
            const hedefUye = interaction.options.getUser('kullanici') || interaction.user;
            const data = await getUserInviteData(hedefUye.id);
            const embed = createInviteEmbed(hedefUye, data);
            await interaction.reply({ embeds: [embed] });
        }
    }

    // SELECTION MENUS LOGIC
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
                    .setTitle('🎟️ Nexus — Destek Bileti')
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

    // BUTTONS LOGIC
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde siliniyor...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }

        // ANKET OY VERME SİSTEMİ
        if (interaction.customId.startsWith('anket_oy_')) {
            const parcalar = interaction.customId.split('_');
            const anketId = parcalar[2];
            const secenekId = parcalar[3];

            const anketVeri = await db.get(`anket_${anketId}`);
            if (!anketVeri) return interaction.reply({ content: '❌ Bu anket veritabanında bulunamadı.', flags: MessageFlags.Ephemeral });

            const userId = interaction.user.id;
            
            if (anketVeri.oylar[userId] === secenekId) {
                delete anketVeri.oylar[userId];
                await interaction.reply({ content: '🔄 Oyunu başarıyla geri çektin.', flags: MessageFlags.Ephemeral });
            } else {
                anketVeri.oylar[userId] = secenekId;
                await interaction.reply({ content: `✅ Oyun başarıyla kaydedildi!`, flags: MessageFlags.Ephemeral });
            }

            await db.set(`anket_${anketId}.oylar`, anketVeri.oylar);

            const toplamOy = Object.keys(anketVeri.oylar).length;
            let yeniAciklama = `**Soru:** ${anketVeri.soru}\n\n`;

            anketVeri.secenekler.forEach(s => {
                const oylarSayisi = Object.values(anketVeri.oylar).filter(v => v === s.id).length;
                const yuzde = toplamOy > 0 ? Math.round((oylarSayisi / toplamOy) * 100) : 0;
                
                const barKarakterSayisi = Math.round(yuzde / 10);
                const bar = '⬛'.repeat(barKarakterSayisi) + '⬜'.repeat(10 - barKarakterSayisi);

                yeniAciklama += `${s.emoji} **${s.metin}:** \`${yuzde}%\` (${oylarSayisi} Oy)\n> ${bar}\n\n`;
            });

            const guncelEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(yeniAciklama)
                .setTimestamp();

            await interaction.message.edit({ embeds: [guncelEmbed] });
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

            const basarisizRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`kapildi_${dropId}`)
                    .setLabel(`KAPILDI! (Kazanan: ${interaction.user.username})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            const guncelEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`**Ödül:** \`${dropVeri.gorunen}\`\n\n🎉 **Ödülü Kapan:** ${interaction.user}\n\n*Ödül kazanan kişinin DM kutusuna gönderildi!*`)
                .setColor('#2f3136');

            await interaction.message.edit({ embeds: [guncelEmbed], components: [basarisizRow] });

            try {
                if (dropVeri.gizli) {
                    await interaction.user.send({ content: `🎉 **Tebrikler, kodu kaptın!** İşte ödülün:\n\`${dropVeri.gizli}\`` });
                }
                if (dropVeri.gorsel) {
                    await interaction.user.send({ content: `🎉 **Tebrikler, görsel ödülü kaptın!**`, files: [new AttachmentBuilder(dropVeri.gorsel)] });
                }
                if (dropVeri.txt) {
                    await interaction.user.send({ content: `🎉 **Tebrikler, dosya ödülünü kaptın!**`, files: [new AttachmentBuilder(dropVeri.txt, { name: dropVeri.txtIsim || 'odul.txt' })] });
                }
                await interaction.reply({ content: '✅ Ödül DM kutunuza gönderildi!', flags: MessageFlags.Ephemeral });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ DM kutunuz kapalı olduğu için ödül gönderilemedi! Lütfen yetkililerle iletişime geçin.', flags: MessageFlags.Ephemeral });
            }
        }
    }
});

// MESAJ TABANLI KOMUTLAR (-i ve -invite DİNLEYİCİSİ)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'i' || command === 'invite') {
        const hedefUye = message.mentions.users.first() || message.author;
        const data = await getUserInviteData(hedefUye.id);
        const embed = createInviteEmbed(hedefUye, data);
        
        await message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
