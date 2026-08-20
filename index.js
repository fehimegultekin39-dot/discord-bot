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
const express = require('express');
const ms = require('ms');

// --- 7/24 EXPRESS SUNUCU ---
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif ve Çalışıyor!'));
app.listen(3000, () => console.log('Express sunucusu 3000 portunda başlatıldı.'));

// --- Kapsamlı JSON Veritabanı Sınıfı ---
class AdvancedJSONDatabase {
    constructor(filename = './db.json') {
        this.path = filename;
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, JSON.stringify({}));
        }
    }
    
    _read() {
        try {
            return JSON.parse(fs.readFileSync(this.path, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    
    _write(data) {
        fs.writeFileSync(this.path, JSON.stringify(data, null, 4));
    }
    
    get(key) {
        const data = this._read();
        return data[key];
    }
    
    set(key, value) {
        const data = this._read();
        data[key] = value;
        this._write(data);
        return value;
    }
    
    add(key, value) {
        const current = this.get(key) || 0;
        return this.set(key, current + value);
    }
    
    delete(key) {
        const data = this._read();
        delete data[key];
        this._write(data);
    }

    allSync() {
        const data = this._read();
        return Object.keys(data).map(id => ({ id, value: data[id] }));
    }
}

const db = new AdvancedJSONDatabase();

// --- AYARLAR VE SABİTLER ---
const DESTEK_ROL_ID = '1520515365786882178';
const YETKILI_ROL_ID = '1520515365786882178';
const DROP_ROL_ID = '1526170253506379847'; 
const TICKET_KANAL_LINKI = 'https://discord.com/channels/1520473034694066361/1520530500022960198';

// Türkçe Süre Çevirici Fonksiyonu
function parseTurkceSureToMs(sureStr) {
    if (!sureStr) return null;
    const str = sureStr.toLowerCase().trim();
    
    let parsed = ms(str);
    if (parsed) return parsed;

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

// --- SLASH KOMUT TANIMLAMALARI ---
const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Ödüllü otomatik drop başlatır.')
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('Görsel yükle').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Dosya yükle').setRequired(false)),
        
    new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Yeni çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (10sn, 15dk, 2saat)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),

    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
        
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Yıldız (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Not').setRequired(true)),
        
    new SlashCommandBuilder().setName('yetkilipuan').setDescription('Yetkili puanına bakar.').addUserOption(o => o.setName('kullanici').setDescription('Kişi')),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Kullanıcının banını kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Kullanıcının susturmasını kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('legit')
        .setDescription('Legit onayı gönderir.')
        .addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true))
        .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Alan kişi').setRequired(true))
        .addStringOption(o => o.setName('not_').setDescription('Not').setRequired(false)),

    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Detaylı anket başlatır.')
        .addStringOption(o => o.setName('soru').setDescription('Soru').setRequired(true))
        .addStringOption(o => o.setName('secenek_a').setDescription('A seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_b').setDescription('B seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_c').setDescription('C seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_d').setDescription('D seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_e').setDescription('E seçeneği').setRequired(false)),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Kanal üzerinden duyuru yapar.')
        .addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Başlık').setRequired(false))
        .addStringOption(o => o.setName('ping').setDescription('Bildirim türü').addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }, { name: 'Yok', value: 'none' }).setRequired(false))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Alt bilgi metni').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Tüm sunucu üyelerine özelden (DM) duyuru atar.')
        .addStringOption(o => o.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Özel başlık').setRequired(false))
].map(c => c.toJSON());

// --- ÇEKİLİŞ BİTİRME MOTORU ---
async function cekilisBitir(channelId, messageId) {
    const veri = db.get(`cekilis_${messageId}`);
    if (!veri || veri.bitti === true) return; 

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

    veri.bitti = true;
    db.set(`cekilis_${messageId}`, veri);

    const reaction = guncelMesaj.reactions.cache.get('🎉');
    if (!reaction) return;

    await reaction.users.fetch();
    const katilimcilar = reaction.users.cache.filter(u => !u.bot);
    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@r2xzzs`;

    if (katilimcilar.size === 0) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nYeterli katılımcı olmadığından çekiliş iptal edilmiştir.`)
            .setColor('#f1c40f')
            .setFooter({ text: `Steal Dawn • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
            .setTimestamp();
        
        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [] });
    }

    const kazananlar = katilimcilar.random(Math.min(veri.count, katilimcilar.size));
    const kazananMention = Array.isArray(kazananlar) ? kazananlar.map(u => u.toString()).join(', ') : kazananlar.toString();
    const bitisTimestamp = Math.floor(veri.bitisMs / 1000);

    const sonEmbed = new EmbedBuilder()
        .setTitle('🏆 ÇEKİLİŞ SONA ERDİ!')
        .setDescription(`**Ödül:** \`${veri.prize}\``)
        .addFields(
            { name: '👑 Kazanan(lar)', value: `> ${kazananMention}`, inline: true }, 
            { name: '🎟 Toplam Katılımcı', value: `\`${katilimcilar.size} kişi\``, inline: true },
            { name: '👤 Başlatan Yetkili', value: `> ${baslatanUye}`, inline: false },
            { name: '📅 Zaman Bilgisi', value: `*Başlangıç:* <t:${veri.simdi}:F>\n*Bitiş:* <t:${bitisTimestamp}:F>`, inline: false }
        )
        .setColor('#f1c40f')
        .setFooter({ text: `Steal Dawn • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
        .setTimestamp();

    const ticketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Ödülü Almak İçin Ticket Aç')
            .setStyle(ButtonStyle.Link)
            .setURL(TICKET_KANAL_LINKI)
            .setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] });
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} çekilişi **kazandı!** ⚡` });
}

// Çekiliş Periyodik Kontrolü
function cekilisleriKontrolEt() {
    try {
        const tumVeriler = db.allSync();
        const aktifCekilisler = tumVeriler.filter(v => v.id.startsWith('cekilis_'));

        for (const cekilis of aktifCekilisler) {
            const msgId = cekilis.id.replace('cekilis_', '');
            const veri = cekilis.value;

            if (veri && !veri.bitti && veri.bitisMs) {
                if (Date.now() >= veri.bitisMs) {
                    cekilisBitir(veri.channelId, msgId);
                }
            }
        }
    } catch (err) {
        console.error("Çekiliş döngü hatası:", err);
    }
}

// --- CLIENT READY ---
client.once('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('Slash komutları başarıyla global olarak kaydedildi!');
    } catch (error) {
        console.error("Komut kaydetme hatası:", error);
    }
    
    console.log(`${c.user.tag} hesabı ile bot aktif edildi.`);
    
    // Zamanlayıcılar
    setInterval(cekilisleriKontrolEt, 1000);

    // Drop Durum (Status) Rol Kontrolü
    setInterval(async () => {
        client.guilds.cache.forEach(async (guild) => {
            try {
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
            } catch (err) {}
        });
    }, 30000); 
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    
    // 1. SELECT MENU YÖNETİMİ
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
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: DESTEK_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('⚡ Steal Dawn Destek Talebi')
                .setDescription(`Merhaba ${interaction.user}, destek ekibimiz en kısa sürede sizinle ilgilenecektir.`)
                .addFields({ name: 'Seçilen Kategori', value: `\`${kategori}\``, inline: true })
                .setColor('#f1c40f')
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `<@&${DESTEK_ROL_ID}> | ${interaction.user}`, embeds: [embed], components: [closeRow] });
            await interaction.editReply({ content: `✅ Destek talebi kanalınız başarıyla oluşturuldu: ${ticketChannel}` });
        } catch (err) {
            await interaction.editReply({ content: '❌ Destek kanalı oluşturulurken bir hata meydana geldi!' });
        }
        return;
    }

    // 2. BUTON YÖNETİMİ
    if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Destek talebi kapatılıyor, kanal siliniyor...', flags: MessageFlags.Ephemeral });
            setTimeout(async () => { await interaction.channel.delete().catch(() => null); }, 3000);
            return;
        }

        if (interaction.customId.startsWith('drop_')) {
            // Zaman aşımı hatasını (Unknown Interaction) önlemek için anında güncelleme onayı veriliyor:
            await interaction.deferUpdate().catch(() => {});

            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = db.get(`drop_data_${dropId}`);

            if (!dropVeri || dropVeri.bitti) {
                return interaction.followUp({ content: '❌ Üzgünüm, bu drop ödülü daha önce başka biri tarafından kapıldı!', flags: MessageFlags.Ephemeral }).catch(() => {});
            }

            const uye = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            if (!uye || !uye.roles.cache.has(DROP_ROL_ID)) {
                return interaction.followUp({ content: '❌ Bu ödülü alabilmek için profil durumunda **.gg/stealdawn** taşımalısın!', flags: MessageFlags.Ephemeral }).catch(() => {});
            }

            dropVeri.bitti = true;
            db.set(`drop_data_${dropId}`, dropVeri);

            const bitenEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP (KAPILDI)')
                .setDescription(`**Ödül:** \`${dropVeri.gorunen}\`\n\n🏆 **Ödülü Alan:** ${interaction.user}`)
                .setColor('#e74c3c')
                .setTimestamp();

            const pasifRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bitti').setLabel('ÖDÜL KAPILDI').setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('🔒')
            );

            await interaction.message.edit({ embeds: [bitenEmbed], components: [pasifRow] }).catch(() => {});

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Kazandığın Drop Ödülü!')
                    .setDescription(`Tebrikler! **${dropVeri.gorunen}** ödülünü başarıyla kaptın.`)
                    .setColor('#f1c40f');

                if (dropVeri.gizli) dmEmbed.addFields({ name: '🔑 Gizli Bilgi / Kod', value: `\`\`\`${dropVeri.gizli}\`\`\`` });

                let dosyalar = [];
                if (dropVeri.gorsel) dosyalar.push(dropVeri.gorsel);
                if (dropVeri.txt) dosyalar.push({ attachment: dropVeri.txt, name: dropVeri.txtIsim || 'odul.txt' });

                await interaction.user.send({ embeds: [dmEmbed], files: dosyalar.length > 0 ? dosyalar : undefined });
                await interaction.followUp({ content: `✅ Ödül bilgileri başarıyla **Özel Mesaj (DM)** kutunuza gönderildi!`, flags: MessageFlags.Ephemeral }).catch(() => {});
            } catch (err) {
                await interaction.followUp({ content: `✅ Ödülü kaptınız ancak **DM kutunuz kapalı olduğu için** özel mesaj gönderilemedi!`, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return;
        }
    }

    // 3. SLASH KOMUT YÖNETİMİ
    if (interaction.isChatInputCommand()) {
        
        if (interaction.commandName === 'dmduyuru') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const mesaj = interaction.options.getString('mesaj').replace(/\\n/g, '\n');
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';

            const dmEmbed = new EmbedBuilder()
                .setTitle(`📢 ${baslikMetni.toUpperCase()} 📢`)
                .setDescription(mesaj)
                .setColor('#f1c40f')
                .setTimestamp();

            const üyeler = await interaction.guild.members.fetch().catch(() => null);
            let basarili = 0, basarisiz = 0;
            await interaction.editReply(`🔄 Üyelere DM duyurusu gönderiliyor...`);

            for (const [id, member] of üyeler) {
                if (member.user.bot) continue;
                try {
                    await member.send({ embeds: [dmEmbed] });
                    basarili++;
                } catch {
                    basarisiz++;
                }
                await new Promise(r => setTimeout(r, 150));
            }
            await interaction.followUp({ content: `✅ İşlem tamamlandı! Başarılı: ${basarili}, Başarısız: ${basarisiz}`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.commandName === 'duyuru') {
            const mesaj = interaction.options.getString('mesaj').replace(/\\n/g, '\n');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;
            const baslikMetni = interaction.options.getString('baslik') || 'DUYURU';
            const pingTipi = interaction.options.getString('ping') || 'none';
            const altMesaj = interaction.options.getString('alt_mesaj');

            let tamMesaj = mesaj;
            if (altMesaj) tamMesaj += `\n\n--------------------\n🤝 **${altMesaj.replace(/\\n/g, '\n')}**`;

            const embed = new EmbedBuilder().setTitle(`📢 ${baslikMetni.toUpperCase()}`).setDescription(tamMesaj).setColor('#f1c40f').setTimestamp();
            let icerik = pingTipi === 'everyone' ? '@everyone' : pingTipi === 'here' ? '@here' : '';

            await kanal.send({ content: icerik || undefined, embeds: [embed] });
            await interaction.reply({ content: `✅ Duyuru başarıyla gönderildi!`, flags: MessageFlags.Ephemeral });
            return;
        }
        
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorsel = interaction.options.getAttachment('gorsel_dosyasi');
            const txt = interaction.options.getAttachment('txt_dosyasi');
            
            if (!gizliOdul && !gorsel && !txt) {
                return interaction.reply({ content: '❌ Gizli ödül metni, görsel veya txt dosyası seçeneklerinden en az birini eklemelisiniz!', flags: MessageFlags.Ephemeral });
            }

            const dropId = Date.now();
            db.set(`drop_data_${dropId}`, {
                gorunen: gorunenOdul,
                gizli: gizliOdul,
                gorsel: gorsel ? gorsel.url : null,
                txt: txt ? txt.url : null,
                txtIsim: txt ? txt.name : null,
                bitti: false
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`drop_${dropId}`).setLabel('ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success).setEmoji('🏆')
            );
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*\n⚠️ **Not:** Bu drop ödülünü sadece durumunda \`.gg/stealdawn\` taşıyanlar kapabilir!`)
                .setColor('#f1c40f')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], components: [row] });
            return;
        }

        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Destek kategorisi seçiniz')
                    .addOptions([
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '🔮' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲' },
                        { label: 'Partnerlik', value: 'partnerlik', emoji: '🤝' },
                        { label: 'Yetkili Alım', value: 'yetkili_alim', emoji: '🤖' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧' },
                        { label: 'Şikayet & Öneri', value: 'sikayet_oneri', emoji: '📝' },
                        { label: 'Diğer', value: 'diger', emoji: '❓' }
                    ])
            );
            const embed = new EmbedBuilder().setTitle('⚡ Steal Dawn Destek Merkezi').setDescription('İşleminize uygun bir kategori seçerek destek talebi (ticket) oluşturabilirsiniz.').setColor('#f1c40f');
            await interaction.reply({ embeds: [embed], components: [row] });
            return;
        }

        if (interaction.commandName === 'vouch') {
            const yetkili = interaction.options.getUser('veren');
            const alanUye = interaction.options.getUser('alan');
            const odul = interaction.options.getString('odul');
            const yildiz = interaction.options.getInteger('yildiz');
            const not_ = interaction.options.getString('not');
            
            db.add(`vouch_${yetkili.id}`, 1);
            const toplam = db.get(`vouch_${yetkili.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('⚡ Yeni Vouch Kaydı')
                .addFields(
                    { name: '🎁 Ödül', value: odul, inline: true }, 
                    { name: '👤 Alan Kişi', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: '⭐'.repeat(yildiz), inline: true },
                    { name: '📊 Yetkili Toplam Vouch', value: `\`${toplam}\``, inline: true },
                    { name: '📝 Not', value: not_, inline: false }
                )
                .setColor('#f1c40f')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (interaction.commandName === 'yetkilipuan') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const v = db.get(`vouch_${hedef.id}`) || 0;
            const l = db.get(`legit_${hedef.id}`) || 0;
            const embed = new EmbedBuilder()
                .setTitle(`📊 Yetkili Puan Durumu: ${hedef.username}`)
                .addFields({ name: 'Toplam Vouch', value: `\`${v}\``, inline: true }, { name: 'Toplam Legit', value: `\`${l}\``, inline: true })
                .setColor('#f1c40f')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply(); 
            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
            
            const msDur = parseTurkceSureToMs(durInput);
            if (!msDur || isNaN(msDur)) {
                return interaction.editReply({ content: '❌ Geçersiz süre formatı! (Örnek kullanım: 10sn, 15dk, 2saat)' });
            }
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R> (<t:${bitis}:F>)`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            const mesaj = await interaction.editReply({ embeds: [embed] });
            await mesaj.react('🎉');
            
            db.set(`cekilis_${mesaj.id}`, {
                channelId: interaction.channel.id,
                prize,
                count,
                simdi,
                bitisMs,
                bitti: false,
                baslatanId: interaction.user.id,
                baslatanTag: `@${interaction.user.username}`
            });
            return;
        }

        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            if (interaction.commandName === 'ban') {
                const m = interaction.options.getMember('kisi');
                await m.ban();
                await interaction.editReply('✅ Kullanıcı başarıyla banlandı.');
            }
            if (interaction.commandName === 'unban') {
                await interaction.guild.members.unban(interaction.options.getString('kisi_id'));
                await interaction.editReply('✅ Kullanıcının banı kaldırıldı.');
            }
            if (interaction.commandName === 'mute') {
                const m = interaction.options.getMember('kisi');
                const msDur = parseTurkceSureToMs(interaction.options.getString('sure'));
                await m.timeout(msDur, 'Steal Dawn Mute Sistemi');
                await interaction.editReply('✅ Kullanıcı başarıyla susturuldu.');
            }
            if (interaction.commandName === 'unmute') {
                const m = interaction.options.getMember('kisi');
                await m.timeout(null);
                await interaction.editReply('✅ Kullanıcının susturması kaldırıldı.');
            }
            return;
        }

        if (interaction.commandName === 'legit') {
            const alan = interaction.options.getUser('alan');
            db.add(`legit_${alan.id}`, 1);
            const toplam = db.get(`legit_${alan.id}`);
            const embed = new EmbedBuilder()
                .setTitle('✅ STEAL DAWN LEGIT ONAYI')
                .addFields({ name: '👤 Alan Kişi', value: `${alan}`, inline: true }, { name: '📊 Toplam Legit', value: `\`${toplam}\``, inline: true })
                .setImage(interaction.options.getAttachment('image').url)
                .setColor('#f1c40f')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (interaction.commandName === 'anket') {
            const soru = interaction.options.getString('soru');
            const anketId = Date.now();
            const secenekler = [];
            if (interaction.options.getString('secenek_a')) secenekler.push({ id: 'a', metin: interaction.options.getString('secenek_a'), emoji: '🇦' });
            if (interaction.options.getString('secenek_b')) secenekler.push({ id: 'b', metin: interaction.options.getString('secenek_b'), emoji: '🇧' });
            if (interaction.options.getString('secenek_c')) secenekler.push({ id: 'c', metin: interaction.options.getString('secenek_c'), emoji: '🇨' });
            if (interaction.options.getString('secenek_d')) secenekler.push({ id: 'd', metin: interaction.options.getString('secenek_d'), emoji: '🇩' });
            if (interaction.options.getString('secenek_e')) secenekler.push({ id: 'e', metin: interaction.options.getString('secenek_e'), emoji: '🇪' });

            db.set(`anket_${anketId}`, { soru, secenekler, oylar: {} });

            let aciklama = `**Soru:** ${soru}\n\n`;
            const row = new ActionRowBuilder();
            secenekler.forEach(s => {
                aciklama += `${s.emoji} ${s.metin}\n`;
                row.addComponents(new ButtonBuilder().setCustomId(`anket_oy_${anketId}_${s.id}`).setLabel(s.metin.substring(0, 15)).setStyle(ButtonStyle.Secondary).setEmoji(s.emoji));
            });

            const embed = new EmbedBuilder().setTitle('📊 Steal Dawn Anket').setDescription(aciklama).setColor('#f1c40f').setTimestamp();
            await interaction.reply({ embeds: [embed], components: [row] });
            return;
        }
    }
});

client.login(process.env.TOKEN);
