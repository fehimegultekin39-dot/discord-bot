require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder, MessageFlags, PermissionsBitField, AttachmentBuilder } = require('discord.js');
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
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod (Fotoğraf atacaksanız boş bırakın)').setRequired(false))
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
        .addStringOption(o => o.setName('secenek_e').setDescription('E Seçeneği (İsteğe bağlı)').setRequired(false))
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
            .setColor('#000000')
            .setFooter({ text: `Black Market • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
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
            .setURL(TICKET_KANAL_LINKI)
            .setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} **kazandı!** 🖤` });
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
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            
            if (!gizliOdul && !gorselDosyası) {
                return interaction.reply({ content: '❌ **Hata:** Ya `teslim_edilecek_odul` kısmına yazılı bilgi girmeli ya da `gorsel_dosyasi` kısmına bir ödül fotoğrafı yüklemelisiniz!', flags: MessageFlags.Ephemeral });
            }

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
                .setTitle('🎉 BLACK MARKET DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur ve ödül otomatik olarak DM kutusuna gönderilir!*`)
                .setColor('#000000')
                .setFooter({ text: `Black Market • Başlatan: @${interaction.user.username}` })
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
                        { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm konular ve sorularınız için bu kategoriyi seçin.' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('🖤 Black Market — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#000000')
                .setFooter({ text: 'Black Market • @r2xzzs' });

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
                .setTitle('🖤 Yeni Vouch Onayı')
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
                    text: `Vouch Ekleyen: ${interaction.user.username} • Black Market`, 
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
                    { name: '🖤 Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                )
                .setThumbnail(hedef.displayAvatarURL())
                .setFooter({ text: 'Black Market' });
            
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
                .setTitle('🎉 BLACK MARKET ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#000000')
                .setFooter({ text: `Black Market • Başlatan: @${interaction.user.username} • 🎉 emojisine tıklayın!` })
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

        // MODERASYON (DEFERREPLY EKLENDİ - UYGULAMA YANIT VERMEDİ HATASI ÇÖZÜLDÜ)
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', flags: MessageFlags.Ephemeral });
            
            await interaction.deferReply(); // Discord zaman aşımı hatasını önler

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
                .setFooter({ text: 'Black Market' });
            
            await interaction.reply({ embeds: [embed] });
        }

        // YENİ GELİŞMİŞ ÇOKTAN SEÇMELİ ANKET SİSTEMİ
        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();

            const secenekler = [];
            if (interaction.options.getString('secenek_a')) secenekler.push({ id: 'a', metin: interaction.options.getString('secenek_a'), emoji: '🇦' });
            if (interaction.options.getString('secenek_b')) secenekler.push({ id: 'b', metin: interaction.options.getString('secenek_b'), emoji: '🇧' });
            if (interaction.options.getString('secenek_c')) secenekler.push({ id: 'c', metin: interaction.options.getString('secenek_c'), emoji: '🇨' });
            if (interaction.options.getString('secenek_d')) secenekler.push({ id: 'd', metin: interaction.options.getString('secenek_d'), emoji: '🇩' });
            if (interaction.options.getString('secenek_e')) secenekler.push({ id: 'e', metin: interaction.options.getString('secenek_e'), emoji: '🇪' });

            // Veritabanı başlangıç kurulumu
            await db.set(`anket_${anketId}`, {
                soru: soru,
                sahip: interaction.user.username,
                secenekler: secenekler,
                oylar: {} // userId: secenekId şeklinde tutulacak
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
                .setTitle('📊 BLACK MARKET - GELİŞMİŞ ANKET')
                .setDescription(aciklama)
                .setColor('#000000')
                .setFooter({ text: `Anketi Başlatan: ${interaction.user.username} • Herkes 1 oy kullanabilir.` })
                .setTimestamp();

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
                    .setTitle('🎟️ Black Market — Destek Bileti')
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

    // BUTTONS
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu bilet kanalı 5 saniye içinde siliniyor...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }

        // GELİŞMİŞ ANKET OYLAMA MEKANİZMASI
        if (interaction.customId.startsWith('anket_oy_')) {
            const parcalar = interaction.customId.split('_');
            const anketId = parcalar[2];
            const secenekId = parcalar[3];

            const anketVeri = await db.get(`anket_${anketId}`);
            if (!anketVeri) return interaction.reply({ content: '❌ Bu anket veritabanında bulunamadı.', flags: MessageFlags.Ephemeral });

            const userId = interaction.user.id;
            
            // Eğer zaten aynı seçeneğe tıklamışsa oyunu geri çeksin
            if (anketVeri.oylar[userId] === secenekId) {
                delete anketVeri.oylar[userId];
                await interaction.reply({ content: '🔄 Oyunu başarıyla geri çektin.', flags: MessageFlags.Ephemeral });
            } else {
                // Oyunu ekle veya değiştir
                anketVeri.oylar[userId] = secenekId;
                await interaction.reply({ content: `✅ Oyun başarıyla kaydedildi!`, flags: MessageFlags.Ephemeral });
            }

            await db.set(`anket_${anketId}.oylar`, anketVeri.oylar);

            // İstatistik hesaplama
            const toplamOy = Object.keys(anketVeri.oylar).length;
            let yeniAciklama = `**Soru:** ${anketVeri.soru}\n\n`;

            anketVeri.secenekler.forEach(s => {
                const oylarSayisi = Object.values(anketVeri.oylar).filter(v => v === s.id).length;
                const yuzde = toplamOy > 0 ? Math.round((oylarSayisi / toplamOy) * 100) : 0;
                
                // İlerleme çubuğu (Visual Bar)
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

            try {
                const odulMetni = dropVeri.gizli ? `\`\`\`${dropVeri.gizli}\`\`\`` : `*Ödülünüz aşağıdaki görselde yer almaktadır!* ⬇️`;

                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Drop Ödülün Teslim Edildi!')
                    .setDescription(`Merhaba! Sunucudaki droptan başarıyla kaptığın ödül aşağıdadır:\n\n**Ödül İsmi:** \`${dropVeri.gorunen}\`\n**Teslim Edilen Bilgi:**\n${odulMetni}\n\n*Bizi tercih ettiğin için teşekkürler!*`)
                    .setColor('#000000')
                    .setFooter({ text: 'Black Market Otomatik Teslimat' })
                    .setTimestamp();

                if (dropVeri.gorsel) {
                    dmEmbed.setImage(dropVeri.gorsel);
                }

                await interaction.user.send({ embeds: [dmEmbed] });

                const kazananEmbed = new EmbedBuilder()
                    .setAuthor({ name: `Drop Başlatan: ${dropVeri.baslatan}`, iconURL: interaction.guild.iconURL() || interaction.user.defaultAvatarURL })
                    .setTitle('🎉 DROP KAZANILDI! 🖤')
                    .setDescription(`🏆 ${interaction.user}\n**ödülü kaptı!**`)
                    .setColor('#000000')
                    .addFields(
                        { name: '🎁 Ödül', value: `\`${dropVeri.gorunen}\``, inline: true }, 
                        { name: '👤 Kazanan', value: `${interaction.user}`, inline: true },
                        { name: '📩 Teslimat', value: 'Ödül otomatik olarak **DM kutusuna gönderildi!** ✅', inline: false }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setFooter({ text: 'Black Market • @r2xzzs' })
                    .setTimestamp();

                await interaction.update({ embeds: [kazananEmbed], components: [] });
                await interaction.followUp({ content: `✅ **Tebrikler!** Ödülün DM kutuna başarıyla gönderildi!`, flags: MessageFlags.Ephemeral });

            } catch (dmHata) {
                console.error("DM gönderilemedi, TXT Dosya sistemine geçiliyor:", dmHata);
                
                if (dropVeri.gizli) {
                    const txtIcerik = `=========================================\nBLACK MARKET DROP OTOMATIK TESLIMAT DOSYASI\n=========================================\n\nKAZANAN KULLANICI: ${interaction.user.username} (${interaction.user.id})\nDROP ODULU: ${dropVeri.gorunen}\n\n-----------------------------------------\nTESLIM EDILEN HESAP / KOD BILGILERI:\n-----------------------------------------\n\n${dropVeri.gizli}\n\n=========================================\nDosya Guvenli Bir Sekilde Olusturuldu.`;
                    const txtBuffer = Buffer.from(txtIcerik, 'utf-8');
                    const txtDosya = new AttachmentBuilder(txtBuffer, { name: `blackmarket_drop_${dropId}.txt` });

                    const txtHataEmbed = new EmbedBuilder()
                        .setAuthor({ name: `Drop Başlatan: ${dropVeri.baslatan}`, iconURL: interaction.guild.iconURL() || interaction.user.defaultAvatarURL })
                        .setTitle('🎉 DROP KAZANILDI! (DM KAPALI) 🖤')
                        .setDescription(`🏆 ${interaction.user} **ödülü kaptı!**\n\n⚠️ **Dikkat:** Kazanan kişinin DM kutusu kapalı olduğu için ödül bilgileri aşağıdaki **TXT dosyası** olarak kanala yüklenmiştir!`)
                        .setColor('#000000')
                        .addFields(
                            { name: '🎁 Ödül', value: `\`${dropVeri.gorunen}\``, inline: true }, 
                            { name: '👤 Kazanan', value: `${interaction.user}`, inline: true }
                        )
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setFooter({ text: 'Black Market Yedek Teslimat Sistemi' })
                        .setTimestamp();

                    await interaction.update({ embeds: [txtHataEmbed], components: [] });
                    await interaction.channel.send({ content: `🔔 ${interaction.user} Ödül dosyanız aşağıdadır:`, files: [txtDosya] });
                } else {
                    const gorselHataEmbed = new EmbedBuilder()
                        .setAuthor({ name: `Drop Başlatan: ${dropVeri.baslatan}`, iconURL: interaction.guild.iconURL() || interaction.user.defaultAvatarURL })
                        .setTitle('🎉 DROP KAZANILDI! (DM KAPALI) 🖤')
                        .setDescription(`🏆 ${interaction.user} **ödülü kaptı!**\n\n⚠️ Kazanan kişinin DM kutusu kapalı olduğu için ödül görseli doğrudan aşağıya bırakılmıştır.`)
                        .setColor('#000000')
                        .addFields(
                            { name: '🎁 Ödül', value: `\`${dropVeri.gorunen}\``, inline: true }, 
                            { name: '👤 Kazanan', value: `${interaction.user}`, inline: true }
                        )
                        .setImage(dropVeri.gorsel)
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setFooter({ text: 'Black Market' })
                        .setTimestamp();

                    await interaction.update({ embeds: [gorselHataEmbed], components: [] });
                }
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
                        .setURL(TICKET_KANAL_LINKI)
                        .setEmoji('🎟️')
                );

                await targetMessage.edit({ embeds: [yeniEmbed], components: [ticketRow] });
                await interaction.reply({ content: `🎉 Çekiliş başarıyla yeniden çekildi!`, flags: MessageFlags.Ephemeral });
                await interaction.channel.send({ content: `🔄 **Reroll!** Yeni kazanan(lar): ${kazananMention} 🖤` });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Çekiliş yeniden çekilirken teknik bir sorun oluştu.', flags: MessageFlags.Ephemeral });
            }
        }
    }
});

client.login(process.env.TOKEN);
