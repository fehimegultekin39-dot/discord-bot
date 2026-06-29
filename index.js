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
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder // TXT dosyası göndermek için eklendi
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// --- SUNUCU AYARLARI ---
const DESTEK_ROL_ID = '1520772451707916368';
const YETKILI_ROL_ID = '1520515365786882178';
const TICKET_KATEGORI_ID = '1520530500022960198';

// --- LOG SİSTEMİ AYARLARI ---
const LOG_KANAL_ID = '1520499241062109405';
const ROLES = {
    booster_log: '1520486297527910420',
    vip_log: '1521129242094473337',
    invite_log: '1521129473863450664'
};

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
        GatewayIntentBits.GuildMessageReactions
    ]
});

// --- SLASH KOMUT TANIMLAMALARI ---
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('66 Adet Steam hesaplı otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi (Örn: 66x Steam Premium Hesap)').setRequired(true)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
    new SlashCommandBuilder().setName('log-panel').setDescription('SnazydiovX log panelini gönderir.'),
    
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
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
            .setURL('https://discord.com/channels/1520473034694066361/1520530500022960198')
            .setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
    await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** 💜`);
}

client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
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
        
        // --- LOG PANEL KOMUTU ---
        if (interaction.commandName === 'log-panel') {
            const embed = new EmbedBuilder()
                .setTitle('🛒 **snazydiovX - Log Sistemi**')
                .setDescription('Aşağıdaki butonlardan istediğiniz log türünü seçin.\n\n**Tüm loglar** ilgili kanala profesyonel şekilde iletilecektir.')
                .setColor('#0F0F0F')
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: 'snazydiovX • Log Management System',
                    iconURL: interaction.guild.iconURL({ dynamic: true }) 
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('booster_log').setLabel('Booster Log').setStyle(ButtonStyle.Danger).setEmoji('🚀'),
                new ButtonBuilder().setCustomId('vip_log').setLabel('VIP Log').setStyle(ButtonStyle.Secondary).setEmoji('💎'),
                new ButtonBuilder().setCustomId('invite_log').setLabel('Invite Log').setStyle(ButtonStyle.Success).setEmoji('📨'),
                new ButtonBuilder().setCustomId('free_log').setLabel('Free Log').setStyle(ButtonStyle.Primary).setEmoji('🎁')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- TICKET PANEL KOMUTU ---
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
                        { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('💜 Drop Zone TR — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#2F3136')
                .setFooter({ text: 'Drop Zone TR • @r2xzzs' });

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- VOUCH KOMUTU ---
        if (interaction.commandName === 'vouch') {
            const yetkili = interaction.options.getUser('veren');
            const alanUye = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const yildizSayisi = interaction.options.getInteger('yildiz');
            const ekNot = interaction.options.getString('not');
            
            const guildMember = await interaction.guild.members.fetch(yetkili.id);
            if (!guildMember.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Sadece **Yetkili Ekibi** rolündekilere vouch atılabilir.', ephemeral: true });
            
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

        // --- YETKİLİ PUAN KOMUTU ---
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

        // --- DROP KOMUTU (GÜNCELLENDİ) ---
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const dropId = Date.now();
            const customId = `drop_${dropId}`;
            
            await db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
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
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur ve 66 Adet Steam Hesabı içeren TXT dosyası anında DM kutusuna gönderilir!*`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Drop Zone TR • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // --- ÇEKİLİŞ KOMUTU ---
        if (interaction.commandName === 'cekilis') {
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
            
            if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre formatı! (Örnek: 30sn, 15dk, 12saat, 1gün)', ephemeral: true });
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 DROP ZONE TR ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#8A2BE2')
                .setFooter({ text: `Drop Zone TR • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            const mesaj = await interaction.fetchReply();
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

        // --- LEGIT KOMUTU ---
        if (interaction.commandName === 'legit') {
            const image = interaction.options.getAttachment('image');
            const odul = interaction.options.getString('odul');
            const alan = interaction.options.getUser('alan');
            const ekNot = interaction.options.getString('not_') || 'Not belirtilmedi.';

            await db.add(`legit_${interaction.user.id}`, 1);
            const toplamLegit = await db.get(`legit_${interaction.user.id}`);

            const embed = new EmbedBuilder()
                .setTitle('✅ NEW LEGIT PROOF')
                .setDescription(`Bir işlem daha başarıyla tamamlandı ve kanıtlandı!`)
                .addFields(
                    { name: '👤 İşlemi Yapan Yetkili', value: `${interaction.user}`, inline: true },
                    { name: '👤 Ödülü Alan', value: `${alan}`, inline: true },
                    { name: '🎁 Verilen Ödül', value: `\`${odul}\``, inline: true },
                    { name: '🔢 Yetkili Toplam Legit', value: `\`${toplamLegit} adet\``, inline: true },
                    { name: '📝 Ekstra Not', value: ekNot, inline: false }
                )
                .setImage(image.url)
                .setColor('#00FF00')
                .setFooter({ text: `Drop Zone TR Legits • Onaylayan: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }

        // --- ANKET KOMUTU ---
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_evet').setLabel('Evet (0)').setStyle(ButtonStyle.Success).setEmoji('👍'),
                new ButtonBuilder().setCustomId('anket_hayir').setLabel('Hayır (0)').setStyle(ButtonStyle.Danger).setEmoji('👎')
            );

            const embed = new EmbedBuilder()
                .setTitle('📊 Drop Zone TR — Yeni Anket')
                .setDescription(`**Soru:**\n> ${soru}\n\n*Lütfen aşağıda bulunan butonları kullanarak oyunuzu belirtin!*`)
                .setColor('#F1C40F')
                .setFooter({ text: `Anketi Başlatan: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- MODERASYON KOMUTLARI ---
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            
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
                        let gun = parseFloat(temizSure.replace(/gun|gün|d/g, ''));
                        if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                    }
                }

                if (!msDur || isNaN(msDur)) return interaction.reply({ content: '❌ Geçersiz süre formatı!', ephemeral: true });
                
                await m.timeout(msDur, 'Komut ile susturuldu');
                await interaction.reply(`${m.user.tag} başarıyla ${sureInput} süreliğine susturuldu.`);
            }

            if (interaction.commandName === 'unmute') {
                const m = interaction.options.getMember('kisi');
                await m.timeout(null);
                await interaction.reply(`${m.user.tag} susturulması kaldırıldı.`);
            }
        }
    }

    if (interaction.isButton()) {
        
        // --- LOG SİSTEMİ BUTON ETKİLEŞİMLERİ ---
        if (['booster_log', 'vip_log', 'invite_log', 'free_log'].includes(interaction.customId)) {
            const logKanal = await client.channels.fetch(LOG_KANAL_ID).catch(() => null);
            if (!logKanal) return interaction.reply({ content: '❌ Log kanalı bulunamadı!', ephemeral: true });

            let title = '', emoji = '', color = '#000000';
            switch (interaction.customId) {
                case 'booster_log': title = '🚀 BOOSTER İŞLEMİ'; emoji = '🚀'; color = '#FF0000'; break;
                case 'vip_log':     title = '💎 VIP İŞLEMİ';      emoji = '💎'; color = '#00FFFF'; break;
                case 'invite_log':  title = '📨 İNVİTE İŞLEMİ';  emoji = '📨'; color = '#00FF00'; break;
                case 'free_log':    title = '🎁 FREE İŞLEMİ';    emoji = '🎁'; color = '#FFD700'; break;
            }

            const logEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`**İşlem Türü:** ${emoji} ${interaction.customId.replace('_log', '').toUpperCase()}\n**Yetkili:** ${interaction.user}\n**Tarih:** <t:${Math.floor(Date.now()/1000)}:F>`)
                .setColor(color)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `snazydiovX • Log ID: ${Date.now()}`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await logKanal.send({ embeds: [logEmbed] });

            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`✅ **${emoji} ${title}** log kanalına gönderildi!`).setColor(color)],
                ephemeral: true
            });
            return;
        }

        // --- DROP BUTONU (HESAP LİSTESİ BURADA OLUŞTURULUYOR) ---
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const veri = await db.get(`drop_data_${dropId}`);
            
            if (!veri) return interaction.reply({ content: 'Bu drop sistemde bulunamadı!', ephemeral: true });
            if (veri.bitti) return interaction.reply({ content: 'Maalesef, bu ödül başka biri tarafından çoktan kapıldı!', ephemeral: true });

            await db.set(`drop_data_${dropId}.bitti`, true);
            
            // Buraya 66 adet rastgele örnek Steam hesabı ekledim. Bunları kendi gerçek hesaplarınla değiştirebilirsin.
            let hesapIcerigi = "";
            for(let i = 1; i <= 66; i++) {
                hesapIcerigi += `Hesap_${i}_KullaniciAdi:Sifre1234 - [Steam Premium Account]\n`;
            }

            // İçeriği buffer formatında .txt dosyasına dönüştürüyoruz
            const txtDosyası = new AttachmentBuilder(Buffer.from(hesapIcerigi, 'utf-8'), { name: 'steam_hesaplari_66x.txt' });

            try {
                await interaction.user.send({
                    content: `🎉 Tebrikler! **${veri.gorunen}** dropunu kazandın!\n🎁 Toplam 66 Adet Steam hesabı aşağıda bulunan **.txt** dosyasının içindedir. Bilgisayarına veya telefonuna indirerek kullanabilirsin!`,
                    files: [txtDosyası]
                });
            } catch (err) {
                return interaction.reply({ content: 'Ödülü kazandın fakat DM kutun kapalı olduğu için sana .txt dosyasını iletemedim! Lütfen DM kutunu açıp yetkililere ulaş.', ephemeral: true });
            }

            const embed = interaction.message.embeds[0];
            const guncellenmisEmbed = EmbedBuilder.from(embed)
                .setDescription(`**Ödül:** \`${veri.gorunen}\`\n\n🎉 **Bu drop ${interaction.user} tarafından kapıldı ve 66 Hesap DM kutusuna gönderildi!**`)
                .setColor('#00FF00');
            
            await interaction.update({ embeds: [guncellenmisEmbed], components: [] });
            await interaction.channel.send(`🎉 ${interaction.user}, harika bir hızla butona bastı ve **${veri.gorunen}** dropunun sahibi oldu! 66 adet hesabı teslim aldı.`);
        }

        // --- ÇEKİLİŞ REROLL BUTONU ---
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: 'Sadece yetkililer çekilişi yeniden çekebilir.', ephemeral: true });
            }
            const msgId = interaction.customId.replace('cekilis_reroll_', '');
            await interaction.reply({ content: 'Çekiliş yeniden sonuçlandırılıyor...', ephemeral: true });
            await cekilisBitir(interaction.channel.id, msgId, true);
        }

        // --- ANKET BUTONLARI ---
        if (['anket_evet', 'anket_hayir'].includes(interaction.customId)) {
            const msgId = interaction.message.id;
            const userVoted = await db.get(`anket_oy_${msgId}_${interaction.user.id}`);
            if (userVoted) return interaction.reply({ content: 'Bu ankette zaten oy kullanmışsınız!', ephemeral: true });

            await db.set(`anket_oy_${msgId}_${interaction.user.id}`, true);
            
            let evetSayisi = await db.get(`anket_evet_${msgId}`) || 0;
            let hayirSayisi = await db.get(`anket_hayir_${msgId}`) || 0;

            if (interaction.customId === 'anket_evet') {
                evetSayisi++;
                await db.set(`anket_evet_${msgId}`, evetSayisi);
            } else {
                hayirSayisi++;
                await db.set(`anket_hayir_${msgId}`, hayirSayisi);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_evet').setLabel(`Evet (${evetSayisi})`).setStyle(ButtonStyle.Success).setEmoji('👍'),
                new ButtonBuilder().setCustomId('anket_hayir').setLabel(`Hayır (${hayirSayisi})`).setStyle(ButtonStyle.Danger).setEmoji('👎')
            );

            await interaction.update({ components: [row] });
        }

        // --- TICKET KAPATMA BUTONU ---
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: 'Bu destek talebi 5 saniye içinde kapatılıyor...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => null);
            }, 5000);
        }
    }

    // --- SEÇİM MENÜSÜ GÜVENLİ TICKET SİSTEMİ ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_secim') {
            const secilenKategori = interaction.values[0];
            
            await interaction.deferReply({ ephemeral: true });

            const kategoriIsimleri = {
                'cekilis_kazandim': '💟-cekiliş-',
                'drop_kazandim': '🎁-drop-',
                'hesap_satinal': '💲-satınalma-',
                'partnerlik': '🤝-partnerlik-',
                'yetkili_alim': '🔵-yetkili-alım-',
                'teknik_destek': '🔧-teknik-',
                'sikayet_oneri': '📝-şikayet-',
                'diger': '❓-destek-'
            };

            const kanalIsmi = `${kategoriIsimleri[secilenKategori] || 'bilet-'}${interaction.user.username}`;

            let parentId = TICKET_KATEGORI_ID;
            const targetCategory = interaction.guild.channels.cache.get(TICKET_KATEGORI_ID);
            if (!targetCategory || targetCategory.type !== ChannelType.GuildCategory) {
                parentId = null; 
            }

            try {
                const ticketKanali = await interaction.guild.channels.create({
                    name: kanalIsmi,
                    type: ChannelType.GuildText,
                    parent: parentId, 
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel], 
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], 
                        }
                    ],
                });

                try {
                    await ticketKanali.permissionOverwrites.edit(DESTEK_ROL_ID, {
                        ViewChannel: true,
                        SendMessages: true
                    });
                    await ticketKanali.permissionOverwrites.edit(YETKILI_ROL_ID, {
                        ViewChannel: true,
                        SendMessages: true
                    });
                } catch (roleError) {
                    console.log("Rol izinleri atanırken hata oluştu.");
                }

                const kapatRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_kapat')
                        .setLabel('Talebi Kapat')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

                const hosgeldinEmbed = new EmbedBuilder()
                    .setTitle(`🎟️ Destek Talebi Açıldı`)
                    .setDescription(`Merhaba ${interaction.user}, destek ekibimiz en kısa sürede sizinle ilgilenecektir.\n\nSorununuzu veya talebinizi detaylıca buraya yazabilirsiniz.`)
                    .setColor('#2F3136')
                    .setTimestamp();

                await ticketKanali.send({ content: `<@&${DESTEK_ROL_ID}> & <@&${YETKILI_ROL_ID}>`, embeds: [hosgeldinEmbed], components: [kapatRow] });
                await interaction.editReply({ content: `✅ Ticket kanalınız başarıyla oluşturuldu: ${ticketKanali}` });

            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Kanal oluşturulurken bir hata meydana geldi!' });
            }
        }
    }
});

// --- BOT GİRİŞ SATIRI ---
client.login(process.env.TOKEN);
