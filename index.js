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
    ChannelType
} = require('discord.js');

const fs = require('fs');

// --- C++ DERLEME HATALARINI BİTİREN YEREL JSON VERİTABANI ---
class SimpleDB {
    constructor(filename = './db.json') {
        this.path = filename;
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, JSON.stringify({}));
        }
    }
    
    read() {
        try {
            return JSON.parse(fs.readFileSync(this.path, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    
    write(data) {
        fs.writeFileSync(this.path, JSON.stringify(data, null, 4));
    }
    
    get(key) {
        const data = this.read();
        return data[key];
    }
    
    set(key, value) {
        const data = this.read();
        data[key] = value;
        this.write(data);
        return value;
    }
    
    add(key, value) {
        const current = this.get(key) || 0;
        return this.set(key, current + value);
    }
    
    delete(key) {
        const data = this.read();
        delete data[key];
        this.write(data);
    }

    async all() {
        const data = this.read();
        return Object.keys(data).map(id => ({ id, value: data[id] }));
    }
}

const db = new SimpleDB();
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

// TÜRKÇE SÜRE ÇEVİRİCİ (GELİŞTİRİLDİ)
function parseTurkceSureToMs(sureStr) {
    const str = sureStr.toLowerCase().trim();
    
    // Eğer direkt ms kütüphanesinin formatındaysa (örn: 10s, 15m)
    let parsed = ms(str);
    if (parsed) return parsed;

    // Türkçe ekler için regex eşleştirmeleri
    const saniyeMatch = str.match(/^(\d+)\s*(saniye|sn|s)$/);
    if (saniyeMatch) return parseInt(saniyeMatch[1]) * 1000;

    const dakikaMatch = str.match(/^(\d+)\s*(dakika|dk|m)$/);
    if (dakikaMatch) return parseInt(dakikaMatch[1]) * 60 * 1000;

    const saatMatch = str.match(/^(\d+)\s*(saat|h)$/);
    if (saatMatch) return parseInt(saatMatch[1]) * 60 * 60 * 1000;

    const gunMatch = str.match(/^(\d+)\s*(gun|gün|d)$/);
    if (gunMatch) return parseInt(gunMatch[1]) * 24 * 60 * 60 * 1000;

    return null;
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
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('PC veya Telefondan direkt fotoğraf yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Kazananın DMsine gönderilecek .txt uzantılı liste/dosya').setRequired(false)),
         
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (10sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
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
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(0).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Çizginin altında görünecek dipnot mesajı').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Sunucudaki üyelere DM üzerinden duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('DM olarak gönderilecek mesaj. (Satır atlamak için \\n kullanın)').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı (Varsayılan: DUYURU)').setRequired(false))
].map(c => c.toJSON());

// ÇEKİLİŞ BİTİRME FONKSİYONU
async function cekilisBitir(channelId, messageId) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri || veri.bitti === true) return; 

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

    await db.set(`cekilis_${messageId}`, { ...veri, bitti: true });

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

// ÇEKİLİŞ KONTROL DÖNGÜSÜ (3 SANİYEDE BİR KONTROL EDER)
async function cekilisleriKontrolEt() {
    try {
        const tumVeriler = await db.all();
        const aktifCekilisler = tumVeriler.filter(v => v.id.startsWith('cekilis_'));

        for (const cekilis of aktifCekilisler) {
            const msgId = cekilis.id.replace('cekilis_', '');
            const veri = cekilis.value;

            if (veri && !veri.bitti && veri.bitisMs) {
                if (Date.now() >= veri.bitisMs) {
                    await cekilisBitir(veri.channelId, msgId);
                }
            }
        }
    } catch (err) {
        console.error("Çekiliş kontrol döngüsünde hata:", err);
    }
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
    
    // Çekiliş döngüsü hassasiyeti 3 saniyeye düşürüldü
    setInterval(cekilisleriKontrolEt, 3000);

    // DROP ROL KONTROL SİSTEMİ
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
                console.error("Durum kontrolü sırasında hata oluştu:", err);
            }
        });
    }, 30000); 
});

// ETKİLEŞİM YÖNETİMİ
client.on('interactionCreate', async interaction => {
    // 1. SELECT MENU (TICKET AÇMA) YÖNETİMİ
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_secim') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const kategori = interaction.values[0];
        const guild = interaction.guild;
        
        const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        try {
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                    },
                    {
                        id: DESTEK_ROL_ID,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                    },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('⚡ Steal Dawn Destek Talebi')
                .setDescription(`Merhaba ${interaction.user}, yetkililerimiz kısa süre içinde sizinle ilgilenecektir.`)
                .addFields({ name: 'Kategori', value: `\`${kategori}\``, inline: true })
                .setColor('#f1c40f')
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_kapat')
                    .setLabel('Talebi Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({
                content: `<@&${DESTEK_ROL_ID}> | ${interaction.user}`,
                embeds: [embed],
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Destek talebiniz başarıyla oluşturuldu: ${ticketChannel}` });
        } catch (err) {
            console.error("Ticket oluşturulurken hata:", err);
            await interaction.editReply({ content: '❌ Destek kanalı oluşturulurken bir hata oluştu!' });
        }
    }

    // 2. BUTON YÖNETİMİ
    if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Destek talebi kapatılıyor, kanal birazdan silinecek...', flags: MessageFlags.Ephemeral });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 3000);
            return;
        }

        if (interaction.customId.startsWith('drop_')) {
            await interaction.deferUpdate();

            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = await db.get(`drop_data_${dropId}`);

            if (!dropVeri || dropVeri.bitti) {
                return interaction.followUp({ content: '❌ Bu drop ödülü daha önce kapıldı veya geçerliliğini yitirdi!', flags: MessageFlags.Ephemeral });
            }

            const uye = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            if (!uye || !uye.roles.cache.has(DROP_ROL_ID)) {
                return interaction.followUp({ content: '❌ Bu ödülü kapabilmek için durumunda **.gg/stealdawn** taşımalısın!', flags: MessageFlags.Ephemeral });
            }

            dropVeri.bitti = true;
            await db.set(`drop_data_${dropId}`, dropVeri);

            const bitenEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP (KAPILDI)')
                .setDescription(`**Ödül:** \`${dropVeri.gorunen}\`\n\n🏆 **Ödülü Kapın Kişi:** ${interaction.user}`)
                .setColor('#e74c3c')
                .setFooter({ text: `Steal Dawn • Kazanan: @${interaction.user.username}` })
                .setTimestamp();

            const pasifRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`drop_bitti_${dropId}`).setLabel('ÖDÜL KAPILDI').setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('🔒')
            );

            await interaction.message.edit({ embeds: [bitenEmbed], components: [pasifRow] });

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Steal Dawn Drop Ödülün!')
                    .setDescription(`Tebrikler! **${dropVeri.gorunen}** dropunu kaptın.`)
                    .setColor('#f1c40f')
                    .setTimestamp();

                if (dropVeri.gizli) {
                    dmEmbed.addFields({ name: '🔑 Gizli Bilgi / Kod', value: `\`\`\`${dropVeri.gizli}\`\`\`` });
                }

                let dosyalar = [];
                if (dropVeri.gorsel) dosyalar.push(dropVeri.gorsel);
                if (dropVeri.txt) dosyalar.push({ attachment: dropVeri.txt, name: dropVeri.txtIsim || 'odul.txt' });

                await interaction.user.send({ embeds: [dmEmbed], files: dosyalar.length > 0 ? dosyalar : undefined });
                await interaction.followUp({ content: `✅ Tebrikler ${interaction.user}! Ödül başarıyla **DM (Özel Mesaj)** kutuna gönderildi.`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                await interaction.followUp({ content: `✅ Ödülü kaptın ancak **DM kutun kapalı olduğu için** sana özel mesaj gönderemedim. Lütfen yetkililerle iletişime geç!`, flags: MessageFlags.Ephemeral });
            }
            return;
        }
    }

    if (interaction.isChatInputCommand()) {
        
        // DM DUYURU
        if (interaction.commandName === 'dmduyuru') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const mesaj = interaction.options.getString('mesaj');
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';
            const duzgunMesaj = mesaj.replace(/\\n/g, '\n');

            const dmEmbed = new EmbedBuilder()
                .setTitle(`📢 ${baslikMetni.toUpperCase()} 📢`)
                .setDescription(duzgunMesaj)
                .setColor('#f1c40f')
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL({ dynamic: true }) });

            const üyeler = await interaction.guild.members.fetch().catch(() => null);
            if (!üyeler) return interaction.editReply('❌ Sunucu üyeleri çekilemedi.');

            let basarili = 0;
            let basarisiz = 0;
            await interaction.editReply(`🔄 DM Duyurusu gönderilmeye başlandı. Lütfen bekleyin...`);

            for (const [id, member] of üyeler) {
                if (member.user.bot) continue;
                try {
                    await member.send({ embeds: [dmEmbed] });
                    basarili++;
                } catch {
                    basarisiz++;
                }
                await new Promise(r => setTimeout(r, 200));
            }

            await interaction.followUp({ content: `✅ DM Duyurusu tamamlandı!\n\n📤 **Başarılı:** ${basarili}\n🚫 **Başarısız (DM Kapalı):** ${basarisiz}`, flags: MessageFlags.Ephemeral });
        }

        // KANAL DUYURU
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
                .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL({ dynamic: true }) });

            try {
                let icerikMesaj = '';
                if (pingTipi === 'everyone') icerikMesaj = '@everyone';
                if (pingTipi === 'here') icerikMesaj = '@here';

                await kanal.send({ content: icerikMesaj ? icerikMesaj : undefined, embeds: [duyuruEmbed] });
                await interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi!`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                await interaction.reply({ content: '❌ Duyuru gönderilemedi. Yetkilerimi kontrol edin.', flags: MessageFlags.Ephemeral });
            }
        }
         
        // DROP
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyasi = interaction.options.getAttachment('gorsel_dosyasi');
            const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
             
            if (!gizliOdul && !gorselDosyasi && !txtDosyasi) {
                return interaction.reply({ content: '❌ **Hata:** Ya `teslim_edilecek_odul` kısmına bilgi, ya görsel ya da txt dosyası eklemelisiniz!', flags: MessageFlags.Ephemeral });
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
                new ButtonBuilder().setCustomId(`drop_${dropId}`).setLabel('ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success).setEmoji('🏆')
            );
             
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*\n⚠️ **Not:** Bu drop ödülünü sadece durumunda \`.gg/stealdawn\` taşıyanlar kapabilir!`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Başlatan: @${interaction.user.username}` })
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
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '🔮', description: 'Kazandığınız çekiliş ödülünü talep edin.' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁', description: 'Etkinliklerden kazandığınız dropları teslim alın.' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲', description: 'Güvenli hesap satın alma ve fiyat bilgisi.' },
                        { label: 'Partnerlik & İşbirliği', value: 'partnerlik', emoji: '🤝', description: 'Ortaklık ve reklam görüşmeleri.' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🤖', description: 'Ekibimize katılmak için başvurun.' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧', description: 'Yaşadığınız teknik problemler için destek.' },
                        { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝', description: 'Şikayetlerinizi ve önerilerinizi iletin.' },
                        { label: 'Diğer', value: 'diger', emoji: '❓', description: 'Diğer tüm sorularınız.' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('⚡ Steal Dawn — Destek Merkezi')
                .setDescription('Merhaba! Size nasıl yardımcı olabiliriz?\n\n⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#f1c40f')
                .setFooter({ text: 'Steal Dawn • @r2xzzs' });

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
            if (!guildMember.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: '❌ Sadece yetkililere vouch atılabilir.', flags: MessageFlags.Ephemeral });
             
            await db.add(`vouch_${yetkili.id}`, 1);
            const toplam = await db.get(`vouch_${yetkili.id}`);
            const yildizlar = '⭐'.repeat(yildizSayisi);
             
            const embed = new EmbedBuilder()
                .setTitle('⚡ Yeni Vouch Onayı')
                .setDescription(`${yetkili} yetkilisine başarılı bir işlem için vouch bırakıldı!`)
                .addFields(
                    { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                    { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: yildizlar, inline: true },
                    { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#f1c40f')
                .setFooter({ text: `Vouch Ekleyen: ${interaction.user.username} • Steal Dawn`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
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
                .setColor('#f1c40f')
                .addFields(
                    { name: '⚡ Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, 
                    { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true }
                )
                .setThumbnail(hedef.displayAvatarURL())
                .setFooter({ text: 'Steal Dawn' });
             
            await interaction.reply({ embeds: [embed] });
        }

        // ÇEKİLİŞ
        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply(); 
            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
             
            const msDur = parseTurkceSureToMs(durInput);
            
            if (!msDur || isNaN(msDur)) {
                return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek: 10sn, 15dk, 2saat, 1gün)' });
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
                let msDur = parseTurkceSureToMs(interaction.options.getString('sure'));
                if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı!' });
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

        // LEGIT
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

        // ANKET
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
                    new ButtonBuilder().setCustomId(`anket_oy_${anketId}_${s.id}`).setLabel(s.metin.substring(0, 17)).setStyle(ButtonStyle.Secondary).setEmoji(s.emoji)
                );
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 STEAL DAWN - GELİŞMİŞ ANKET')
                .setDescription(aciklama)
                .setColor('#f1c40f')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }
});

client.login(process.env.TOKEN);
