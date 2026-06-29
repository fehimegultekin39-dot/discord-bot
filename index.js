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

        // --- DROP KOMUTU ---
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
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 BLACK MARKET DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur ve 66 Adet Karışık Premium Hesap içeren TXT listesi anında DM kutusuna gönderilir!*`)
                .setColor('#000000')
                .setFooter({ text: `Black Market • Başlatan: @${interaction.user.username}` })
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
    }

    if (interaction.isButton()) {
        
        // --- LOG SİSTEMİ BUTON ETKİLEŞİMLERİ (ADETLİ YENİ SİSTEMLER) ---
        if (interaction.customId === 'booster_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('Almak istediğiniz Booster içeriğini seçin...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Nitro Booster Log')
                        .setDescription('Stokta: 3233 tane mevcut')
                        .setValue('booster_nitro')
                        .setEmoji('🚀'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Booster Özel Hesap')
                        .setDescription('Stokta: 1120 tane mevcut')
                        .setValue('booster_account')
                        .setEmoji('🎮')
                );
            await interaction.reply({ content: '⚫ **Black Market Booster Log** listesi:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'vip_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('Almak istediğiniz VIP içeriğini seçin...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('VIP Premium Key')
                        .setDescription('Stokta: 1450 tane mevcut')
                        .setValue('vip_key')
                        .setEmoji('💎'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('VIP Özel Metin Belgesi')
                        .setDescription('Stokta: 850 tane mevcut')
                        .setValue('vip_txt')
                        .setEmoji('📝')
                );
            await interaction.reply({ content: '⚫ **Black Market VIP Log** listesi:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'invite_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('Almak istediğiniz Invite içeriğini seçin...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('5 Invite Ödülü Log')
                        .setDescription('Stokta: 2100 tane mevcut')
                        .setValue('invite_5')
                        .setEmoji('📨'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('10 Invite Ödülü Log')
                        .setDescription('Stokta: 1320 tane mevcut')
                        .setValue('invite_10')
                        .setEmoji('➕')
                );
            await interaction.reply({ content: '⚫ **Black Market Invite Log** listesi:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        if (interaction.customId === 'free_log') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('free_log_secim')
                .setPlaceholder('Almak istediğiniz içeriği seçin...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Steam Account')
                        .setDescription('Stokta: 39832 tane mevcut')
                        .setValue('free_steam')
                        .setEmoji('🎮'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Minecraft Premium')
                        .setDescription('Stokta: 2213 tane mevcut')
                        .setValue('free_minecraft')
                        .setEmoji('⛏️')
                );

            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.reply({
                content: '⚫ **Black Market Free Log** sisteminden hangi içeriği indirmek istersiniz?',
                components: [row],
                ephemeral: true
            });
            return;
        }

        // --- DROP BUTONU (KARIŞIK BÜYÜK HAVUZ LİSTESİ) ---
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const veri = await db.get(`drop_data_${dropId}`);
            
            if (!veri) return interaction.reply({ content: 'Bu drop sistemde bulunamadı!', ephemeral: true });
            if (veri.bitti) return interaction.reply({ content: 'Maalesef, bu ödül başka biri tarafından çoktan kapıldı!', ephemeral: true });

            await db.set(`drop_data_${dropId}.bitti`, true);
            
            const platformlar = ["Steam", "Exxen", "Anzium", "Zula", "Valorant", "Minecraft_Premium"];
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

    // --- SEÇİM MENÜSÜ ETKİLEŞİMLERİ ---
    if (interaction.isStringSelectMenu()) {
        
        // --- GERÇEKÇİ VE RASTGELE COMBO ÜRETEN PANEL LOGIC'I ---
        if (interaction.customId === 'free_log_secim') {
            const secim = interaction.values[0];
            let listContent = "";
            let fileName = "";
            let contentLabel = "";

            // Rastgele kelimeler ve uzantılar havuzu (Gerçekçi görünüm için)
            const isimler = ["berk", "emir", "r2xzzs", "snazy", "kaon", "apex", "vortex", "shadow", "ghost", "dark", "alpha", "legend", "tr", "pro", "king", "lord", "matrix", "hacker"];
            const domainler = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "mail.ru", "yandex.com"];
            const ozelSifreler = ["123456789", "bjk1903", "gs1905", "fb1907", "kralsensin", "sifre123", "password", "deneme12", "mustafa", "ahmet", "mehmet", "anadolu"];

            // 15 satırlık tamamen karışık combo üreten yardımcı fonksiyon
            const randomComboUret = (baslik) => {
                let text = `=== ${baslik} ===\n`;
                for (let i = 0; i < 15; i++) {
                    const rIsim1 = isimler[Math.floor(Math.random() * isimler.length)];
                    const rIsim2 = isimler[Math.floor(Math.random() * isimler.length)];
                    const rDomain = domainler[Math.floor(Math.random() * domainler.length)];
                    const rSayi = Math.floor(Math.random() * 8999) + 1000;
                    
                    const user = Math.random() > 0.5 ? `${rIsim1}${rSayi}@${rDomain}` : `${rIsim1}_${rIsim2}${Math.floor(Math.random()*99)}`;
                    
                    let pass = "";
                    if (Math.random() > 0.5) {
                        pass = `${ozelSifreler[Math.floor(Math.random() * ozelSifreler.length)]}${Math.floor(Math.random()*99)}`;
                    } else {
                        pass = Math.random().toString(36).substring(2, 10);
                    }
                    text += `${user}:${pass}\n`;
                }
                return text;
            };

            // Seçilen değere göre dosya adı ve içeriği tetikleniyor
            if (secim === 'free_steam') {
                fileName = "blackmarket_free_steam_39832.txt";
                contentLabel = "Steam Account";
                listContent = randomComboUret("BLACK MARKET FREE STEAM");
            } else if (secim === 'free_minecraft') {
                fileName = "blackmarket_free_minecraft_2213.txt";
                contentLabel = "Minecraft Premium";
                listContent = randomComboUret("BLACK MARKET FREE MINECRAFT PREMIUM");
            } else if (secim === 'booster_nitro') {
                fileName = "blackmarket_booster_nitro_3233.txt";
                contentLabel = "Nitro Booster Log";
                listContent = "=== BLACK MARKET BOOSTER NITRO LOGS ===\n";
                for(let i=1; i<=15; i++) {
                    listContent += `https://discord.gift/${Math.random().toString(36).substring(2, 18).toUpperCase()}\n`;
                }
            } else if (secim === 'booster_account') {
                fileName = "blackmarket_booster_acc_1120.txt";
                contentLabel = "Booster Özel Hesap";
                listContent = randomComboUret("BLACK MARKET BOOSTER SPECIAL ACCOUNT");
            } else if (secim === 'vip_key') {
                fileName = "blackmarket_vip_keys_1450.txt";
                contentLabel = "VIP Premium Key";
                listContent = "=== BLACK MARKET VIP PREMIUM KEYS ===\n";
                for(let i=1; i<=15; i++) {
                    listContent += `KEY-BM-VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(Math.random()*9000+1000)}\n`;
                }
            } else if (secim === 'vip_txt') {
                fileName = "blackmarket_vip_special_850.txt";
                contentLabel = "VIP Özel Metin Belgesi";
                listContent = "=== BLACK MARKET VIP SPECIAL METHOD ===\nMethod: Private Discord Custom Bypass Auth...\nBypass Token: " + Math.random().toString(36).substring(2, 15);
            } else if (secim === 'invite_5') {
                fileName = "blackmarket_invite5_2100.txt";
                contentLabel = "5 Invite Ödülü Log";
                listContent = randomComboUret("BLACK MARKET 5 INVITE REWARD");
            } else if (secim === 'invite_10') {
                fileName = "blackmarket_invite10_1320.txt";
                contentLabel = "10 Invite Ödülü Log";
                listContent = randomComboUret("BLACK MARKET 10 INVITE REWARD");
            }

            const txtAttachment = new AttachmentBuilder(Buffer.from(listContent, 'utf-8'), { name: fileName });

            try {
                await interaction.user.send({
                    content: `🎁 **Black Market** sisteminden talep ettiğiniz **${contentLabel}** listeniz başarıyla iletildi!`,
                    files: [txtAttachment]
                });

                // Log kanalına bildirim gidiyor
                const logKanal = await client.channels.fetch(LOG_KANAL_ID).catch(() => null);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📊 PANEL LOG İŞLEMİ')
                        .setDescription(`**İçerik:** ${contentLabel}\n**Alan Kullanıcı:** ${interaction.user}\n**Tarih:** <t:${Math.floor(Date.now()/1000)}:F>`)
                        .setColor('#000000')
                        .setFooter({ text: 'Black Market • System Tracker' });
                    await logKanal.send({ embeds: [logEmbed] });
                }

                await interaction.update({
                    content: '✅ İstediğiniz paket **DM kutunuza .txt dosyası olarak** gönderildi!',
                    components: []
                });

            } catch (err) {
                await interaction.update({
                    content: '❌ **Hata:** DM kutunuz kapalı olduğu için listeyi gönderemedim.',
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
                    { id: DESTEKNormally I can help with things like this, but I don't seem to have access to that content. You can try again or ask me for something else.
