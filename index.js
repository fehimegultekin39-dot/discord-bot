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
        .addStringOption(o => o.setName('gorunen').setDescription('Kanala yansıyacak ödül ismi').setRequired(true))
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('Fotoğraf yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Dosya yükleyin').setRequired(false)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
        
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Yıldız (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Ek not').setRequired(true)),
        
    new SlashCommandBuilder().setName('yetkilipuan').setDescription('Yetkili puanına bakar.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı')),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Kullanıcı').setRequired(true)),
    new SlashCommandBuilder().setName('legit').setDescription('Legit onayı oluşturur.').addAttachmentOption(o => o.setName('image').setDescription('Görsel').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)).addUserOption(o => o.setName('alan').setDescription('Alan kişi').setRequired(true)).addStringOption(o => o.setName('not_').setDescription('Not').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Gelişmiş çoktan seçmeli anket başlatır.')
        .addStringOption(o => o.setName('soru').setDescription('Anket sorusu').setRequired(true))
        .addStringOption(o => o.setName('secenek_a').setDescription('A Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_b').setDescription('B Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_c').setDescription('C Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_d').setDescription('D Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_e').setDescription('E Seçeneği').setRequired(false)),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Şık bir duyuru yapar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) 
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Başlık').setRequired(false))
        .addStringOption(o => o.setName('ping').setDescription('Ping').addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }, { name: 'Yok', value: 'none' }).setRequired(false))
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal').addChannelTypes(0).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Dipnot').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Tüm üyelere DM atar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel').setDescription('Görsel').setRequired(false))
].map(c => c.toJSON());

// ÇEKİLİŞ BİTİRME FONKSİYONU
async function cekilisBitir(channelId, messageId) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri || veri.bitti === true) return; 

    await db.set(`cekilis_${messageId}.bitti`, true);

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

    let reaction = guncelMesaj.reactions.cache.get('🎉');
    if (!reaction) {
        await guncelMesaj.fetch().catch(() => null);
        reaction = guncelMesaj.reactions.cache.get('🎉');
    }

    const baslatanUye = veri.baslatanId ? `<@${veri.baslatanId}>` : `@r2xzzs`;

    if (!reaction) {
        const iptalEmbed = new EmbedBuilder()
            .setTitle('❌ ÇEKİLİŞ İPTAL EDİLDİ')
            .setDescription(`**Ödül:** \`${veri.prize}\`\n\nReaksiyon bulunamadığı için çekiliş cancelled.`)
            .setColor('#f1c40f')
            .setFooter({ text: `Steal Dawn • Başlatan: ${veri.baslatanTag || 'Bilinmiyor'}` })
            .setTimestamp();
        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [] });
    }

    const kullanicilar = await reaction.users.fetch().catch(() => null);
    const katilimcilar = kullanicilar ? kullanicilar.filter(u => !u.bot) : null;

    if (!katilimcilar || katilimcilar.size === 0) {
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
        
        if (!veri || veri.bitti === true) continue;

        if (veri.bitisMs) {
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

// STATUS KONTROLÜ
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
        console.error(`⚠️ Rol verme/alma işleminde hata (${member.user.tag}):`, err.message);
    }
});

// ETKİLEŞİM YÖNETİMİ
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        // DUYURU
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

        // DM DUYURU
        if (interaction.commandName === 'dmduyuru') {
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

            if (gorsel) dmEmbed.setImage(gorsel.url);

            const members = await interaction.guild.members.fetch();
            let basarili = 0, basarisiz = 0;

            await interaction.editReply({ content: `⏳ DM Duyuru işlemi başlatıldı...` });

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
                content: `✅ **DM Duyuru Tamamlandı!**\n\n🟢 Başarıyla Ulaşan: **${basarili}**\n🔴 DM Kapalı: **${basarisiz}**` 
            });
        }

        // DROP
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
            
            if (!gizliOdul && !gorselDosyası && !txtDosyasi) {
                return interaction.reply({ content: '❌ Ödül detayı girmelisiniz!', flags: MessageFlags.Ephemeral });
            }

            const dropId = Date.now();
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
                    .setCustomId(`drop_${dropId}`)
                    .setLabel('ÖDÜLÜ KAP!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*`)
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
                        { label: 'Çekiliş Kazandım', value: 'cekilis_kazandim', emoji: '🔮' },
                        { label: 'Drop Kazandım', value: 'drop_kazandim', emoji: '🎁' },
                        { label: 'Hesap Satın Alıcam', value: 'hesap_satinal', emoji: '💲' },
                        { label: 'Teknik Destek', value: 'teknik_destek', emoji: '🔧' }
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle('⚡ Destek Merkezi')
                .setDescription('Aşağıdan kategori seçin.')
                .setColor('#f1c40f');

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
            
            const embed = new EmbedBuilder()
                .setTitle('⚡ Yeni Vouch Onayı')
                .addFields(
                    { name: '🎁 Ödül', value: odul, inline: true }, 
                    { name: '👤 Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Yıldız', value: '⭐'.repeat(yildizSayisi), inline: true },
                    { name: '🔢 Toplam Vouch', value: `\`${toplam}\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#f1c40f');
            
            await interaction.reply({ embeds: [embed] });
        }

        // YETKİLİ PUAN
        if (interaction.commandName === 'yetkilipuan') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const vSayi = await db.get(`vouch_${hedef.id}`) || 0;
            const lSayi = await db.get(`legit_${hedef.id}`) || 0;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${hedef.username} İstatistikleri`)
                .setColor('#f1c40f')
                .addFields(
                    { name: '⚡ Vouch', value: `\`${vSayi}\``, inline: true }, 
                    { name: '✅ Legit', value: `\`${lSayi}\``, inline: true }
                );
            
            await interaction.reply({ embeds: [embed] });
        }

        // ÇEKİLİŞ
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
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n⏳ **Bitiş:** <t:${bitis}:R>`)
                .setColor('#f1c40f')
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
                await interaction.editReply(`✅ ${m.user.tag} banlandı.`); 
            }
            if (interaction.commandName === 'unban') { 
                const id = interaction.options.getString('kisi_id');
                await interaction.guild.members.unban(id); 
                await interaction.editReply(`✅ \`${id}\` banı kaldırıldı.`); 
            }
            if (interaction.commandName === 'mute') { 
                const m = interaction.options.getMember('kisi'); 
                const sureInput = interaction.options.getString('sure');
                let msDur = ms(parseTurkceSure(sureInput));
                if (!msDur) return interaction.editReply('❌ Geçersiz süre.');
                
                await m.timeout(msDur, 'Mute Komutu'); 
                await interaction.editReply(`✅ ${m} mutelendi.`); 
            }
            if (interaction.commandName === 'unmute') { 
                const m = interaction.options.getMember('kisi'); 
                await m.timeout(null); 
                await interaction.editReply(`✅ ${m} mutesi kaldırıldı.`); 
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
                    { name: '🔢 Toplam', value: `${toplam}`, inline: true }
                )
                .setImage(interaction.options.getAttachment('image').url);
            
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

            secenekler.forEach(sec => {
                aciklama += `${sec.emoji} **${sec.metin}** — \`0 Oy (%0)\`\n`;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`anket_${anketId}_${sec.id}`)
                        .setLabel(sec.metin)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(sec.emoji)
                );
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 ANKET')
                .setDescription(aciklama)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Toplam Oy: 0` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // BUTON ETKİLEŞİMLERİ (Anket ve Reroll)
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('anket_')) {
            const parts = interaction.customId.split('_');
            const anketId = parts[1];
            const secenekId = parts[2];

            const anket = await db.get(`anket_${anketId}`);
            if (!anket) return interaction.reply({ content: '❌ Anket bulunamadı.', flags: MessageFlags.Ephemeral });

            anket.oylar[interaction.user.id] = secenekId;
            await db.set(`anket_${anketId}`, anket);

            const toplamOy = Object.keys(anket.oylar).length;
            let yeniAciklama = `**Soru:** ${anket.soru}\n\n`;

            anket.secenekler.forEach(sec => {
                const oySayisi = Object.values(anket.oylar).filter(v => v === sec.id).length;
                const yuzde = toplamOy > 0 ? ((oySayisi / toplamOy) * 100).toFixed(0) : 0;
                yeniAciklama += `${sec.emoji} **${sec.metin}** — \`${oySayisi} Oy (%${yuzde})\`\n`;
            });

            const guncelEmbed = new EmbedBuilder()
                .setTitle('📊 ANKET')
                .setDescription(yeniAciklama)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Toplam Oy: ${toplamOy}` })
                .setTimestamp();

            await interaction.message.edit({ embeds: [guncelEmbed] });
            return interaction.reply({ content: '✅ Oyunuz kaydedildi!', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ Bu butonu sadece yetkililer kullanabilir.', flags: MessageFlags.Ephemeral });
            }
            const messageId = interaction.customId.replace('cekilis_reroll_', '');
            await db.delete(`cekilis_${messageId}.bitti`);
            await cekilisBitir(interaction.channel.id, messageId);
            return interaction.reply({ content: '🔄 Çekiliş yeniden çekildi!', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(process.env.TOKEN);
