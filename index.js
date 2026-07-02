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
    StringSelectMenuOptionBuilder,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder
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
const BOOSTER_ROL_ID = '1520486297527910420';
const VIP_ROL_ID = '1521129242094473337';
const INVITE_ROL_ID = '1521129473863450664';
function parseTurkceSure(sure) {
    return sure
        .toLowerCase()
        .trim()
        .replace(/saniye|sn/g, 's')
        .replace(/dakika|dk/g, 'm')
        .replace(/hafta/g, 'w')
        .replace(/saat/g, 'h')
        .replace(/gun|gün/g, 'd');
}
function generateFakeLogs(type) {
    const platforms = ["STEAM", "VALORANT", "EXXEN", "ANZIUM", "ZULA", "MINECRAFT", "NETFLIX", "SPOTIFY", "UPLAY", "ORIGIN", "EPIC"];
    const status = ["ACTIVE", "PREMIUM", "OWNED", "VERIFIED"];
    const stockCount = type === 'booster_log' ? 85 : (type === 'vip_log' ? 50 : (type === 'invite_log' ? 30 : 10));
    const totalGiris = Math.floor(Math.random() * (stockCount * 5)) + 120;

    let content = `=== BLACK MARKET - ${type.toUpperCase().replace('_LOG', '')} ÖZEL HAVUZ ===\n`;
    content += `Toplam Tespit Edilen Giriş: ${totalGiris}\n`;
    content += `Tarih: ${new Date().toLocaleString()}\n\n`;

    for (let i = 0; i < stockCount; i++) {
        const plat = platforms[Math.floor(Math.random() * platforms.length)];
        const stat = status[Math.floor(Math.random() * status.length)];
        const user = `user_${Math.random().toString(36).substring(7)}@${plat.toLowerCase()}.com`;
        const pass = Math.random().toString(36).substring(2, 10);
        content += `[${plat}] ${user}:${pass} | [STATUS: ${stat}] | Hash: ${Math.random().toString(16).substring(2)}\n`;
    }
    return content;
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
        .setDescription('Karışık oyun/platform hesaplı otomatik büyük drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi (Örn: 66x Karışık Premium Hesap Mega Paket)').setRequired(true)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
    new SlashCommandBuilder().setName('log-panel').setDescription('Black Market log panelini gönderir.'),
    
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili kişi').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Değerlendirme yıldızı (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Eklemek istediğiniz not veya yorum').setRequired(true)),
        
    new SlashCommandBuilder().setName('yetkilipuan').setDescription('Yetkilinin vouch ve legit puanlarına bakar.').addUserOption(o => o.setName('kullanici').setDescription('Bakmak istediğiniz kişi')),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyi banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
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
        .setFooter({ text: `Black Market • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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
    await kanal.send(`🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⚫`);
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
                .setTitle('🛒 **Black Market - Log Sistemi**')
                .setDescription('Aşağıdaki butonlardan istediğiniz log türünü seçin.\n\nSeçtiğiniz paketlerin stok detayları alt menüde listelenecek ve dosya direkt DM kutunuza iletilecektir.')
                .setColor('#000000')
                .setFooter({ text: 'Black Market • Log Management System' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('booster_log').setLabel('Booster Log').setStyle(ButtonStyle.Secondary).setEmoji('🚀'),
                new ButtonBuilder().setCustomId('vip_log').setLabel('VIP Log').setStyle(ButtonStyle.Secondary).setEmoji('💎'),
                new ButtonBuilder().setCustomId('invite_log').setLabel('Invite Log').setStyle(ButtonStyle.Secondary).setEmoji('📨'),
                new ButtonBuilder().setCustomId('free_log').setLabel('Free Log').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

     // --- TICKET PANEL KOMUTU ---
if (interaction.commandName === 'ticketpanel') {
    // 1. Önce "düşünüyor" durumunu, kullanıcının sadece kendisinin göreceği (ephemeral) şekilde kabul et
    await interaction.deferReply({ ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ticket_secim')
            .setPlaceholder('Seçim yap')
            .addOptions([
                { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '⚫', description: 'Kazandığınız çekiliş ödülünü talep etmek için burayı kullanın.' },
                { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁', description: 'Yayın veya etkinliklerden kazandığınız dropları teslim alın.' },
                { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲', description: 'Güvenli hesap satın alma, fiyat ve stok bilgisi almak için.' },
                { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝', description: 'Ortaklık, reklam ya da sponsorluk görüşmeleri yapmak için.' },
                { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '⚪', description: 'Ekibimize katılmak ve yetkili olmak istiyorsanız başvurun.' },
                { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧', description: 'Yaşadığınız problemlerle ilgili teknik destek talebi oluşturun.' },
                { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝', description: 'Sunucu içi şikayetlerinizi veya önerilerinizi bize iletin.' },
                { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.' }
            ])
    );

    const embed = new EmbedBuilder()
        .setTitle('⚫ Black Market — Destek Merkezi')
        .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
        .setColor('#000000')
        .setFooter({ text: 'Black Market • @r2xzzs' });

    // 2. reply yerine editReply kullanarak yanıtı gönder
    await interaction.editReply({ embeds: [embed], components: [row] });
}

            const embed = new EmbedBuilder()
                .setTitle('⚫ Black Market — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#000000')
                .setFooter({ text: 'Black Market • @r2xzzs' });

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
            
            const mevcutVouch = await db.get(`vouch_${yetkili.id}`);
            if (mevcutVouch === null || mevcutVouch === undefined) {
                await db.set(`vouch_${yetkili.id}`, 0);
            }

            await db.add(`vouch_${yetkili.id}`, 1);
            const toplam = await db.get(`vouch_${yetkili.id}`);
            const yildizlar = '⭐'.repeat(yildizSayisi);
            
            const embed = new EmbedBuilder()
                .setTitle('⚫ Yeni Vouch Onayı')
                .setDescription(`${yetkili} yetkilisine başarılı bir işlem için vouch bırakıldı!`)
                .addFields(
                    { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                    { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: yildizlar, inline: true },
                    { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#000000')
                .setFooter({ text: `Vouch Ekleyen: ${interaction.user.username}` })
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
                .setColor('#000000')
                .addFields(
                    { name: '⚫ Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                );
            
            await interaction.reply({ embeds: [embed] });
        }

   // Drop komutu - Minimalist ve Hataları Giderilmiş
if (interaction.commandName === 'drop') {
    // 1. ADIM: Yanıtı ertele (Uygulama yanıt vermedi hatasını %100 çözer)
    await interaction.deferReply({ ephemeral: false }); 

    const icerik = interaction.options.getString('yazi') || "Ödül içeriği yüklenemedi.";
    const dosya = interaction.options.getAttachment('foto');

    // Siyah minimalist tasarım
    const embed = {
        color: 0x000000, 
        title: '⚫ BLACK MARKET | DROP',
        description: `${icerik}`,
        image: dosya ? { url: dosya.url } : null,
        footer: { text: 'Black Market • Butona bas ve ödülü al' }
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('al_drop')
            .setLabel('Ödülü Al')
            .setStyle(ButtonStyle.Secondary)
    );

    // 2. ADIM: Ertelediğin yanıtı düzenle
    await interaction.editReply({ embeds: [embed], components: [row] });
}
    // 3. Görseli mesajla birlikte gönder
    await interaction.reply({ embeds: [baslangicEmbed], components: [row], files: [file] });
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
                .setTitle('🎉 BLACK MARKET ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#000000')
                .setFooter({ text: `Black Market • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
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
                .setColor('#000000')
                .setFooter({ text: `Black Market Legits • Onaylayan: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }

        // --- ANKET KOMUTU ---
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_evet').setLabel('Evet (0)').setStyle(ButtonStyle.Secondary).setEmoji('👍'),
                new ButtonBuilder().setCustomId('anket_hayir').setLabel('Hayır (0)').setStyle(ButtonStyle.Secondary).setEmoji('👎')
            );

            const embed = new EmbedBuilder()
                .setTitle('📊 Black Market — Yeni Anket')
                .setDescription(`**Soru:**\n> ${soru}\n\n*Lütfen aşağıda bulunan butonları kullanarak oyunuzu belirtin!*`)
                .setColor('#000000')
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

    if (interaction.isButton()) {
        
        // --- LOG SİSTEMİ BUTON ETKİLEŞİMLERİ (YENİ STOK VE KALİTE KADEMELERİ) ---
        if (interaction.customId === 'booster_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('🚀 Booster Paketleri (En Yüksek Kalite • Stoklar Tam)')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Nitro Booster Log').setDescription('Stokta: 342 adet mevcut (Anlık Güncellendi)').setValue('booster_nitro').setEmoji('🚀'),
                    new StringSelectMenuOptionBuilder().setLabel('Valorant Booster VIP Süper Paket').setDescription('Stokta: 215 adet mevcut (Anlık Güncellendi)').setValue('booster_val').setEmoji('🔫'),
                    new StringSelectMenuOptionBuilder().setLabel('Exxen Premium 4K Log Pool').setDescription('Stokta: 188 adet mevcut (Anlık Güncellendi)').setValue('booster_exxen').setEmoji('🎬')
                );
            await interaction.reply({ content: '⚫ **Black Market — Booster Özel Hattı**\n> Sunucuya katkı sağlayanlara özel en yüksek doluluk oranına sahip havuz.', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'vip_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('💎 VIP Paketleri (Yüksek Kalite • Stoklar İyi)')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('VIP Premium Key Gen').setDescription('Stokta: 145 adet mevcut').setValue('vip_key').setEmoji('💎'),
                    new StringSelectMenuOptionBuilder().setLabel('Anzium Özel Hit Listesi').setDescription('Stokta: 112 adet mevcut').setValue('vip_anzium').setEmoji('💥'),
                    new StringSelectMenuOptionBuilder().setLabel('Zula Altın Garantili VIP Log').setDescription('Stokta: 134 adet mevcut').setValue('vip_zula').setEmoji('👑')
                );
            await interaction.reply({ content: '⚫ **Black Market — VIP Havuzu**\n> VIP üyeler için ayrılmış, hit oranı yüksek premium veri havuzu.', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'invite_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('📨 Invite Paketleri (Orta Kalite • Sınırlı Stok)')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('5 Invite: Gain Premium Paketi').setDescription('Stokta: 48 adet kaldı').setValue('invite_gain').setEmoji('📺'),
                    new StringSelectMenuOptionBuilder().setLabel('10 Invite: Valorant Random Havuzu').setDescription('Stokta: 32 adet kaldı').setValue('invite_val_mega').setEmoji('🎯')
                );
            await interaction.reply({ content: '⚫ **Black Market — Invite Ödülleri**\n> Davet karşılığı kazanılan orta kalitedeki güncel listeler.', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'free_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('🎁 Free Paketler (Düşük Kalite • Stok Tükenmek Üzere!)')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Steam Account Public List').setDescription('Stokta: Sadece 12 adet kaldı!').setValue('free_steam').setEmoji('🎮'),
                    new StringSelectMenuOptionBuilder().setLabel('Minecraft Premium Public Pool').setDescription('Stokta: Sadece 7 adet kaldı!').setValue('free_minecraft').setEmoji('⛏️'),
                    new StringSelectMenuOptionBuilder().setLabel('Zula Hesap Havuzu (Public)').setDescription('Stokta: Sadece 14 adet kaldı!').setValue('free_zula').setEmoji('⚔️')
                );

            await interaction.reply({
                content: '⚫ **Black Market — Ücretsiz Herkese Açık Havuz**\n> ⚠️ **Uyarı:** Yoğunluk nedeniyle free stokları tükenmek üzeredir ve hesapların kalitesi düşüktür.',
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
            return;
        }

        // --- DROP BUTONU ---
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const veri = await db.get(`drop_data_${dropId}`);
            
            if (!veri) return interaction.reply({ content: 'Bu drop sistemde bulunamadı!', ephemeral: true });
            if (veri.bitti) return interaction.reply({ content: 'Maalesef, bu ödül başka biri tarafından çoktan kapıldı!', ephemeral: true });

            await db.set(`drop_data_${dropId}.bitti`, true);
            
            const platformlar = ["Steam", "Exxen", "Anzium", "Zula", "Valorant", "Minecraft_Premium", "Gain"];
            let hesapIcerigi = "=== BLACK MARKET - 66x PREMIUM MIX HESAP LISTESI ===\n\n";

            for (let i = 1; i <= 66; i++) {
                const rastgelePlatform = platformlar[Math.floor(Math.random() * platformlar.length)];
                const rastgeleID = Math.floor(1000 + Math.random() * 9000); 
                const rastgeleSifreNum = Math.floor(20000 + Math.random() * 80000);
                hesapIcerigi += `[${rastgelePlatform.toUpperCase()}] giris_id_${rastgeleID}@blackmarket.com:Pass${rastgeleSifreNum} - Active\n`;
            }

            const txtDosyasi = new AttachmentBuilder(Buffer.from(hesapIcerigi, 'utf-8'), { name: 'blackmarket_mega_mix_66x.txt' });

            try {
                await interaction.user.send({
                    content: `🎉 Tebrikler! **${veri.gorunen}** dropunu kazandın!\n\n🎁 Toplam 66 adet karışık hesap listesi ekteki **.txt** dosyasına yüklenmiştir.`,
                    files: [txtDosyasi]
                });
            } catch (err) {
                return interaction.reply({ content: 'Ödülü kazandın fakat DM kutun kapalı olduğu için .txt listesini gönderemedim!', ephemeral: true });
            }

            const embed = interaction.message.embeds[0];
            const guncellenmisEmbed = EmbedBuilder.from(embed)
                .setDescription(`**Ödül:** \`${veri.gorunen}\`\n\n🎉 **Bu mega drop ${interaction.user} tarafından kapıldı! 66 adet karışık oyun/platform hesabı (.txt) DM kutusuna teslim edildi.**`)
                .setColor('#000000');
            
            await interaction.update({ embeds: [guncellenmisEmbed], components: [] });
            await interaction.channel.send(`🎉 Hız fırtınası! ${interaction.user}, butona ilk basan kişi olarak **${veri.gorunen}** karışık mega paketini kaptı!`);
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
                new ButtonBuilder().setCustomId('anket_evet').setLabel(`Evet (${evetSayisi})`).setStyle(ButtonStyle.Secondary).setEmoji('👍'),
                new ButtonBuilder().setCustomId('anket_hayir').setLabel(`Hayır (${hayirSayisi})`).setStyle(ButtonStyle.Secondary).setEmoji('👎')
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

    // --- SEÇİM MENÜSÜ ETKİLEŞİMLERİ (YALAN/ALGORİTMİK KALİTE AYARI) ---
    if (interaction.isStringSelectMenu()) {
        
        if (interaction.customId === 'free_log_secim') {
            const secim = interaction.values[0];
            let listContent = "";
            let fileName = "";
            let contentLabel = "";

            // Olasılık testleri için rastgele sayı (0-100 arası)
            const sans = Math.floor(Math.random() * 100);

            // Paket türüne göre kalite ve durum belirleme fonksiyonu
            const comboUret = (baslik, kalite) => {
                let text = `=== ${baslik} ===\n`;
                text += `= Filtre/Tur: ${kalite.toUpperCase()} PACK\n`;
                text += `= Durum: Veritabanından Aktarıldı\n=================================\n\n`;

                const isimler = ["berk", "emir", "r2xzzs", "snazy", "kaon", "apex", "vortex", "shadow", "ghost", "dark", "alpha", "legend", "tr", "pro", "king", "lord"];
                const domainler = ["gmail.com", "hotmail.com", "outlook.com", "mail.ru"];

                for (let i = 0; i < 20; i++) {
                    const rIsim = isimler[Math.floor(Math.random() * isimler.length)];
                    const rSayi = Math.floor(Math.random() * 8999) + 1000;
                    const mail = `${rIsim}${rSayi}@${domainler[Math.floor(Math.random() * domainler.length)]}`;
                    const pass = Math.random().toString(36).substring(2, 11);

                    if (kalite === "booster") {
                        // En iyi paket: Tamamen dolu süsü veriyoruz
                        text += `${mail}:${pass} -> [STATUS: ACTIVE] | Skins: Premium/Skinli | Level: ${Math.floor(Math.random()*80+20)}\n`;
                    } else if (kalite === "vip") {
                        // VIP Paket: Çoğu dolu, bazıları belirsiz
                        if (Math.random() > 0.2) {
                            text += `${mail}:${pass} -> [STATUS: ACTIVE] | Level: ${Math.floor(Math.random()*40+1)}\n`;
                        } else {
                            text += `${mail}:${pass} -> [STATUS: UNCHECKED]\n`;
                        }
                    } else if (kalite === "invite") {
                        // Invite Paketi: Yarı yarıya boş veya unranked süsü
                        if (Math.random() > 0.5) {
                            text += `${mail}:${pass} -> [STATUS: ACTIVE] | Unranked\n`;
                        } else {
                            text += `${mail}:${pass} -> [STATUS: INVALID / BAD PASSWORD]\n`;
                        }
                    } else {
                        // Free Paket: Çoğu patlak veya boş
                        text += `${mail}:${pass} -> [STATUS: INVALID OR EMPTY ACCOUNT]\n`;
                    }
                }
                return text;
            };

            // KATEGORİ 1: FREE LOGS (Dolma ihtimali en düşük, %85 stok hatası)
            if (secim.startsWith('free_')) {
                if (sans < 85) {
                    return interaction.update({
                        content: '❌ **Sistem Hatası (ERR_STOCK_DEPLETED):** Seçtiğiniz Free paketin son stoğu sizden saliseler önce başka bir üye tarafından çekildi! Lütfen diğer kategorileri veya Booster/VIP ayrıcalıklarını deneyin.',
                        components: []
                    });
                }
                
                if (secim === 'free_steam') { fileName = "free_steam_public.txt"; contentLabel = "Steam Account"; }
                if (secim === 'free_minecraft') { fileName = "free_minecraft_public.txt"; contentLabel = "Minecraft Premium"; }
                if (secim === 'free_zula') { fileName = "free_zula_pool.txt"; contentLabel = "Zula Hesap Havuzu"; }
                listContent = comboUret("BLACK MARKET PUBLIC FREE POOL", "free");
            }

            // KATEGORİ 2: INVITE LOGS (Orta kalite, %50 ihtimalle stok hatası)
            else if (secim.startsWith('invite_')) {
                if (sans < 50) {
                    return interaction.update({
                        content: '❌ **Davet Havuzu Hatası:** Bu kategoriye ait günlük indirme limitine ulaşıldı veya anlık stok kalmadı. Lütfen birkaç saat sonra tekrar deneyin veya VIP/Booster rollerine geçiş yapın.',
                        components: []
                    });
                }

                if (secim === 'invite_gain') { fileName = "invite_gain_premium.txt"; contentLabel = "5 Invite: Gain Premium"; }
                if (secim === 'invite_val_mega') { fileName = "invite_valorant_random.txt"; contentLabel = "10 Invite: Valorant Random"; }
                listContent = comboUret("BLACK MARKET INVITE REWARDS", "invite");
            }

            // KATEGORİ 3: VIP LOGS (Yüksek kalite, %15 ihtimalle meşguliyet hatası)
            else if (secim.startsWith('vip_')) {
                if (sans < 15) { 
                    return interaction.update({
                        content: '⚠️ **Veritabanı Senkronizasyon Hatası:** VIP veri yolu şu an çok yoğun. Lütfen 1 dakika sonra butona tekrar tıklayıp deneyin.',
                        components: []
                    });
                }

                if (secim === 'vip_key') { 
                    fileName = "vip_premium_keys.txt"; contentLabel = "VIP Premium Key";
                    listContent = "=== BLACK MARKET VIP PREMIUM KEYS ===\n";
                    for(let i=1; i<=10; i++) listContent += `KEY-BM-VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}\n`;
                } else {
                    if (secim === 'vip_anzium') { fileName = "vip_anzium_private.txt"; contentLabel = "Anzium Özel Paket"; }
                    if (secim === 'vip_zula') { fileName = "vip_zula_gold.txt"; contentLabel = "Zula Altın Log"; }
                    listContent = comboUret("BLACK MARKET VIP PRIVATE LINE", "vip");
                }
            }

            // KATEGORİ 4: BOOSTER LOGS (En iyisi, asla hata vermez)
            else if (secim.startsWith('booster_')) {
                if (secim === 'booster_nitro') {
                    fileName = "booster_nitro_links.txt";
                    contentLabel = "Nitro Booster Log";
                    listContent = "=== BLACK MARKET BOOSTER NITRO LINKS ===\n= Durum: %100 VALID\n\n";
                    for(let i=1; i<=5; i++) listContent += `https://discord.gift/${Math.random().toString(36).substring(2, 18).toUpperCase()}\n`;
                } else {
                    if (secim === 'booster_val') { fileName = "booster_valorant_vip.txt"; contentLabel = "Valorant Booster Hesap"; }
                    if (secim === 'booster_exxen') { fileName = "booster_exxen_4k.txt"; contentLabel = "Exxen Premium Log"; }
                    listContent = comboUret("BLACK MARKET BOOSTER SPECIAL POOL", "booster");
                }
            }

            // Gönderim Kısmı
            const txtAttachment = new AttachmentBuilder(Buffer.from(listContent, 'utf-8'), { name: fileName });

            try {
                await interaction.user.send({
                    content: `🎁 **Black Market** sisteminden talep ettiğiniz **${contentLabel}** başarıyla hazırlandı ve teslim edildi!`,
                    files: [txtAttachment]
                });

                const logKanal = await client.channels.fetch(LOG_KANAL_ID).catch(() => null);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📊 PANEL LOG İŞLEMİ')
                        .setDescription(`**İçerik:** ${contentLabel}\n**Alan Kullanıcı:** ${interaction.user}\n**Durum:** Başarılı (DM Teslim edildi)`)
                        .setColor('#000000')
                        .setTimestamp();
                    await logKanal.send({ embeds: [logEmbed] });
                }

                await interaction.update({
                    content: '✅ İstediğiniz paket şifreli ana sunucudan çekildi ve **DM kutunuza .txt dosyası olarak** gönderildi!',
                    components: []
                });

            } catch (err) {
                await interaction.update({
                    content: '❌ **Hata:** Listeniz oluşturuldu fakat DM kutunuz kapalı olduğu için gönderim başarısız oldu.',
                    components: []
                });
            }
            return;
        }

        // --- TICKET SİSTEMİ SEÇİM MENÜSÜ ---
        if (interaction.customId === 'ticket_secim') {
            const secilenKategori = interaction.values[0];
            await interaction.deferReply({ ephemeral: true });

            const kategoriIsimleri = {
                'cekilis_kazandim': '⚫-cekiliş-',
                'drop_kazandim': '🎁-drop-',
                'hesap_satinal': '💲-satınalma-',
                'partnerlik': '🤝-partnerlik-',
                'yetkili_alim': '⚪-yetkili-alım-',
                'teknik_destek': '🔧-teknik-destek-',
                'sikayet_oneri': '📝-şikayet-öneri-',
                'diger': '❓-diğer-'
            };

            const kIsmi = kategoriIsimleri[secilenKategori] || 'ticket-';
            const temizKullaniciAdi = interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const kanalAdi = `${kIsmi}${temizKullaniciAdi || 'user'}`;

            const varOlanKanal = interaction.guild.channels.cache.find(c => c.name === kanalAdi);
            if (varOlanKanal) {
                return interaction.editReply({ content: `❌ Zaten açık bir destek talebiniz bulunuyor: ${varOlanKanal}` });
            }

            const ticketKanali = await interaction.guild.channels.create({
                name: kanalAdi,
                type: ChannelType.GuildText,
                parent: TICKET_KATEGORI_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: DESTEK_ROL_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const kapatRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎫 Destek Talebi Oluşturuldu')
                .setDescription(`Merhaba ${interaction.user}, destek ekibimiz en kısa sürede sizinle ilgilenecektir.\nSorununuzu veya talebinizi buraya detaylıca yazabilirsiniz.`)
                .setColor('#000000')
                .setFooter({ text: 'Black Market • Ticket System' });

            await ticketKanali.send({ content: `<@&${DESTEK_ROL_ID}> | ${interaction.user}`, embeds: [baslangicEmbed], components: [kapatRow] });
            await interaction.editReply({ content: `✅ Destek talebiniz başarıyla oluşturuldu: ${ticketKanali}` });
        }
    }
});
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const logRoles = { 'booster_log': BOOSTER_ROL_ID, 'vip_log': VIP_ROL_ID, 'invite_log': INVITE_ROL_ID };
        
        // Yetki kontrolü
        if (logRoles[interaction.customId] && !interaction.member.roles.cache.has(logRoles[interaction.customId])) {
            return interaction.reply({ content: '❌ Bu loglara erişmek için gerekli role sahip değilsin!', ephemeral: true });
        }

        // Log gönderimi
        if (['booster_log', 'vip_log', 'invite_log', 'free_log'].includes(interaction.customId)) {
            if (interaction.customId === 'free_log' && Math.random() > 0.3) {
                return interaction.reply({ content: '⚠️ Şu an stoklar tamamen tükenmiş, tekrar dene!', ephemeral: true });
            }

            const logData = generateFakeLogs(interaction.customId);
            const attachment = new AttachmentBuilder(Buffer.from(logData), { name: `blackmarket_${interaction.customId}.txt` });
            
            try {
                await interaction.user.send({ content: `🎁 **Black Market Özel Paketin:**\nKategori: ${interaction.customId.replace('_log', '').toUpperCase()}`, files: [attachment] });
                await interaction.reply({ content: '✅ Loglar DM kutuna başarıyla gönderildi!', ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: '❌ DM kutun kapalı olduğu için dosyayı gönderemedim.', ephemeral: true });
            }
        }
    }
});
client.login(process.env.TOKEN);
