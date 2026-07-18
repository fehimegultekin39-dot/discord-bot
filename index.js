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
    AttachmentBuilder,
    ChannelType
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const express = require('express');
const ms = require('ms');

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000);

// 🛠️ SUNUCU VE ROL AYARLARI
const TICKET_KATEGORI_ID = '1520515365786882178'; // Ticket kanallarının açılacağı kategori ID
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
        .addStringOption(o => o.setName('teslim_edilecek_odul').setDescription('Kazananın DMsine gidecek gizli hesap/kod').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel_dosyasi').setDescription('Görsel yükleyin').setRequired(false))
        .addAttachmentOption(o => o.setName('txt_dosyasi').setDescription('Kazananın DMsine gönderilecek .txt dosyası').setRequired(false)),
        
    new SlashCommandBuilder().setName('cekilis').setDescription('Yeni çekiliş başlatır.').addStringOption(o => o.setName('sure').setDescription('Süre (30sn, 15dk, 2saat, 1g)').setRequired(true)).addIntegerOption(o => o.setName('kazanan_sayisi').setDescription('Kazanan sayısı').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true)),
    new SlashCommandBuilder().setName('ticketpanel').setDescription('Destek panelini gönderir.'),
        
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Kullanıcıya vouch verir.')
        .addStringOption(o => o.setName('odul').setDescription('Ödül adı').setRequired(true))
        .addUserOption(o => o.setName('veren').setDescription('Ödülü veren yetkili').setRequired(true))
        .addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true))
        .addIntegerOption(o => o.setName('yildiz').setDescription('Yıldız (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('not').setDescription('Not veya yorum').setRequired(true)),
        
    new SlashCommandBuilder().setName('yetkilipuan').setDescription('Yetkilinin vouch ve legit puanlarına bakar.').addUserOption(o => o.setName('kullanici').setDescription('Bakmak istediğiniz kişi')),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar.').addUserOption(o => o.setName('kisi').setDescription('Banlanacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Ban kaldırır.').addStringOption(o => o.setName('kisi_id').setDescription('Kişi ID').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıyı susturur.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)).addStringOption(o => o.setName('sure').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('Susturmayı kaldırır.').addUserOption(o => o.setName('kisi').setDescription('Susturulacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('legit').setDescription('Legit onayı oluşturur.').addAttachmentOption(o => o.setName('image').setDescription('Kanıt görseli').setRequired(true)).addStringOption(o => o.setName('odul').setDescription('Verilen ödül').setRequired(true)).addUserOption(o => o.setName('alan').setDescription('Ödülü alan kişi').setRequired(true)).addStringOption(o => o.setName('not_').setDescription('Ekstra not').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Gelişmiş çoktan seçmeli anket başlatır.')
        .addStringOption(o => o.setName('soru').setDescription('Anket sorusu nedir?').setRequired(true))
        .addStringOption(o => o.setName('secenek_a').setDescription('A Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_b').setDescription('B Seçeneği').setRequired(true))
        .addStringOption(o => o.setName('secenek_c').setDescription('C Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_d').setDescription('D Seçeneği').setRequired(false))
        .addStringOption(o => o.setName('secenek_e').setDescription('E Seçeneği').setRequired(false)),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Sunucuda şık bir duyuru yapar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) 
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni').setRequired(true))
        .addStringOption(o => o.setName('baslik').setDescription('Duyuru başlığı').setRequired(false))
        .addStringOption(o => o.setName('ping').setDescription('Etiketlenecek rol').addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }, { name: 'Etiket Yok', value: 'none' }).setRequired(false))
        .addChannelOption(o => o.setName('kanal').setDescription('Gönderilecek kanal').addChannelTypes(0).setRequired(false))
        .addStringOption(o => o.setName('alt_mesaj').setDescription('Çizginin altında görünecek dipnot').setRequired(false)),

    new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Sunucudaki tüm üyelere DM üzerinden şık bir duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(o => o.setName('mesaj').setDescription('Duyuru metni').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel').setDescription('Duyuruya eklenecek görsel').setRequired(false))
].map(c => c.toJSON());

// 🏆 ÇEKİLİŞ BİTİRME SİSTEMİ (MANTIK HATALARI ARTIK TAMAMEN DÜZELTİLDİ)
async function cekilisBitir(channelId, messageId) {
    const veri = await db.get(`cekilis_${messageId}`);
    if (!veri || veri.bitti === true) return; 

    await db.set(`cekilis_${messageId}.bitti`, true);

    const kanal = await client.channels.fetch(channelId).catch(() => null);
    if (!kanal) return;

    const guncelMesaj = await kanal.messages.fetch(messageId).catch(() => null);
    if (!guncelMesaj) return;

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
            new ButtonBuilder().setCustomId(`cekilis_reroll_${messageId}`).setLabel('🔄 Yeniden Çek').setStyle(ButtonStyle.Secondary)
        );

        return guncelMesaj.edit({ embeds: [iptalEmbed], components: [rerollRow] }).catch(() => null);
    }

    const istenenKazananSayisi = Math.min(veri.count, katilimcilar.size);
    const secilenler = katilimcilar.random(istenenKazananSayisi);
    const kazananlarDizisi = Array.isArray(secilenler) ? secilenler : [secilenler];
    
    const kazananMention = kazananlarDizisi.map(u => `<@${u.id}>`).join(', ');
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
        new ButtonBuilder().setCustomId(`cekilis_reroll_${messageId}`).setLabel('🔄 Yeniden Çek').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setLabel('Ödülü Almak İçin Ticket Aç').setStyle(ButtonStyle.Link).setURL(TICKET_KANAL_LINKI).setEmoji('🎟️')
    );

    await guncelMesaj.edit({ embeds: [sonEmbed], components: [ticketRow] }).catch(() => null);
    await kanal.send({ content: `🎉 **Tebrikler!** ${kazananMention} **kazandı!** ⚡` }).catch(() => null);
}

// BOT READY OLDUĞUNDA
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

    // 🔄 DİNAMİK ARKA PLAN ÇEKİLİŞ TARAYICISI (Her 15 saniyede bir kontrol eder)
    setInterval(async () => {
        try {
            const tumVeriler = await db.all();
            const aktifCekilisler = tumVeriler.filter(v => v.id.startsWith('cekilis_'));

            for (const cekilis of aktifCekilisler) {
                const msgId = cekilis.id.replace('cekilis_', '');
                const veri = cekilis.value;
                
                if (veri && veri.bitti === false && veri.bitisMs) {
                    if (veri.bitisMs <= Date.now()) {
                        await cekilisBitir(veri.channelId, msgId);
                    }
                }
            }
        } catch (e) {
            console.error("Çekiliş kontrol döngüsünde hata:", e);
        }
    }, 15000);
});

// 🔄 DURUM (CUSTOM STATUS) KONTROL SİSTEMİ
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member || !newPresence.guild) return;
    
    const member = newPresence.member;
    if (member.user.bot) return;

    try {
        const customActivity = newPresence.activities.find(act => act.type === 4); 
        const statusText = customActivity && customActivity.state ? customActivity.state.toLowerCase() : "";

        const hasTargetText = statusText.includes('.gg/stealdawn') || statusText.includes('stealdawn');
        const hasRole = member.roles.cache.has(DROP_ROL_ID);

        if (hasTargetText && !hasRole) {
            await member.roles.add(DROP_ROL_ID);
        } 
        else if (!hasTargetText && hasRole) {
            await member.roles.remove(DROP_ROL_ID);
        }
    } catch (err) {
        console.error(`⚠️ Rol işleminde hata:`, err.message);
    }
});

// ETKİLEŞİM YÖNETİMİ (BUTONLAR, SELECT MENULER VE SLASH KOMUTLARI BURADA)
client.on('interactionCreate', async interaction => {
    
    // ⬇️ BUTON VE SELECT MENU ETKİLEŞİMLERİ (ESKİ KODDAKİ TÜM MANTIKLAR BURADA)
    if (interaction.isButton()) {
        
        // 1. DROP BUTONU TETİKLEYİCİSİ
        if (interaction.customId.startsWith('drop_')) {
            const dropId = interaction.customId.replace('drop_', '');
            const dropVeri = await db.get(`drop_data_${dropId}`);

            if (!dropVeri) return interaction.reply({ content: '❌ Bu drop verisi bulunamadı.', flags: MessageFlags.Ephemeral });
            if (dropVeri.bitti) return interaction.reply({ content: '❌ Bu drop zaten başkası tarafından kapılmış!', flags: MessageFlags.Ephemeral });

            // Durum kontrolü (.gg/stealdawn şartı)
            const presence = interaction.member.presence;
            const customActivity = presence?.activities.find(act => act.type === 4);
            const statusText = customActivity && customActivity.state ? customActivity.state.toLowerCase() : "";
            const hasTargetText = statusText.includes('.gg/stealdawn') || statusText.includes('stealdawn');

            if (!hasTargetText) {
                return interaction.reply({ content: '⚠️ **Ödülü Kapamazsın!** Durumunda (Custom Status) `.gg/stealdawn` veya `stealdawn` yazılı olmalıdır!', flags: MessageFlags.Ephemeral });
            }

            // Drop'u bitir
            await db.set(`drop_data_${dropId}.bitti`, true);

            // Kanal mesajını güncelle
            const bitisEmbed = new EmbedBuilder()
                .setTitle('🏆 DROP KAPILDI!')
                .setDescription(`**Kapılan Ödül:** \`${dropVeri.gorunen}\`\n**Kazanan Şanslı:** ${interaction.user}\n\nÖdül kazananın DM kutusuna bot tarafından gönderildi!`)
                .setColor('#2ecc71')
                .setFooter({ text: 'Steal Dawn Drop Sistemi' })
                .setTimestamp();

            await interaction.update({ embeds: [bitisEmbed], components: [] });

            // Kazanana DM Gönderimi
            try {
                let dmIcerik = { content: `🎉 Tebrikler! Sunucudaki droptan **${dropVeri.gorunen}** kazandınız!\n\n` };
                if (dropVeri.gizli) dmIcerik.content += `🔑 **Ödül Bilgisi / Kod:** \`${dropVeri.gizli}\``;
                
                let filesArray = [];
                if (dropVeri.gorsel) filesArray.push(new AttachmentBuilder(dropVeri.gorsel));
                if (dropVeri.txt) filesArray.push(new AttachmentBuilder(dropVeri.txt, { name: dropVeri.txtIsim || 'odul.txt' }));
                
                if (filesArray.length > 0) dmIcerik.files = filesArray;

                await interaction.user.send(dmIcerik);
            } catch (err) {
                await interaction.channel.send({ content: `⚠️ ${interaction.user}, DM kutun kapalı olduğu için ödülün iletilemedi! Lütfen yetkililere ulaş.` });
            }
            return;
        }

        // 2. ÇEKİLİŞ REROLL BUTONU TETİKLEYİCİSİ
        if (interaction.customId.startsWith('cekilis_reroll_')) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) {
                return interaction.reply({ content: '❌ Bu butonu sadece yetkililer kullanabilir.', flags: MessageFlags.Ephemeral });
            }
            
            const origMsgId = interaction.customId.replace('cekilis_reroll_', '');
            const veri = await db.get(`cekilis_${origMsgId}`);
            
            if (!veri) return interaction.reply({ content: '❌ Çekiliş verisi bulunamadı.', flags: MessageFlags.Ephemeral });

            const guncelMesaj = await interaction.channel.messages.fetch(origMsgId).catch(() => null);
            if (!guncelMesaj) return interaction.reply({ content: '❌ Orijinal çekiliş mesajı bulunamadı.', flags: MessageFlags.Ephemeral });

            const reaction = guncelMesaj.reactions.cache.get('🎉');
            if (!reaction) return interaction.reply({ content: '❌ Reaksiyon bulunamadı.', flags: MessageFlags.Ephemeral });

            await reaction.users.fetch();
            const katilimcilar = reaction.users.cache.filter(u => !u.bot);

            if (katilimcilar.size === 0) return interaction.reply({ content: '❌ Katılımcı olmadığı için reroll yapılamaz.', flags: MessageFlags.Ephemeral });

            const istenenKazananSayisi = Math.min(veri.count, katilimcilar.size);
            const secilenler = katilimcilar.random(istenenKazananSayisi);
            const kazananlarDizisi = Array.isArray(secilenler) ? secilenler : [secilenler];
            const kazananMention = kazananlarDizisi.map(u => `<@${u.id}>`).join(', ');

            await interaction.reply({ content: `🔄 Çekiliş yeniden çekildi!\n🎉 YENİ KAZANAN(LAR): ${kazananMention}` });
            return;
        }

        // 3. ANKET OYLAMA BUTONLARI TETİKLEYİCİSİ
        if (interaction.customId.startsWith('anket_oy_')) {
            const parcalar = interaction.customId.split('_');
            const anketId = parcalar[2];
            const secenekId = parcalar[3];

            const anketVeri = await db.get(`anket_${anketId}`);
            if (!anketVeri) return interaction.reply({ content: '❌ Anket bulunamadı.', flags: MessageFlags.Ephemeral });

            const userVotes = anketVeri.oylar || {};
            userVotes[interaction.user.id] = secenekId; // Kullanıcının oyunu kaydet/güncelle
            await db.set(`anket_${anketId}.oylar`, userVotes);

            // Toplam oyları hesapla ve embedi güncelle
            const toplamOy = Object.keys(userVotes).length;
            const sayilar = {};
            anketVeri.secenekler.forEach(s => sayilar[s.id] = 0);
            Object.values(userVotes).forEach(v => { if(sayilar[v] !== undefined) sayilar[v]++; });

            let yeniAciklama = `**Soru:** ${anketVeri.soru}\n\n`;
            anketVeri.secenekler.forEach(s => {
                const oySayisi = sayilar[s.id];
                const yuzde = toplamOy > 0 ? Math.round((oySayisi / toplamOy) * 100) : 0;
                yeniAciklama += `${s.emoji} **${s.metin}** — \`%${yuzde}\` (${oySayisi} Oy)\n`;
            });

            const eskiEmbed = interaction.message.embeds[0];
            const yeniEmbed = EmbedBuilder.from(eskiEmbed).setDescription(yeniAciklama);

            await interaction.update({ embeds: [yeniEmbed] });
            return;
        }

        // 4. TICKET KAPATMA BUTONU
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: '🔒 Bu ticket 5 saniye içinde kapatılıyor...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => null);
            }, 5000);
            return;
        }
    }

    // TICKET SEÇİM MENÜSÜ TETİKLEYİCİSİ
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_secim') {
            const secilenKategori = interaction.values[0];
            
            // Kullanıcıya özel kanal açma
            const ticketKanal = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_KATEGORI_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: DESTEK_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('✨ Destek Talebi Açıldı')
                .setDescription(`Merhaba ${interaction.user}, talebiniz **${secilenKategori.replace('_', ' ')}** kategorisinde başarıyla oluşturuldu.\nEn kısa sürede yetkililer sizinle ilgilenecektir.`)
                .setColor('#f1c40f')
                .setTimestamp();

            const kapatRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Ticketı Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketKanal.send({ content: `${interaction.user} & <@&${DESTEK_ROL_ID}>`, embeds: [ticketEmbed], components: [kapatRow] });
            return interaction.reply({ content: `✅ Ticket kanalınız açıldı: ${ticketKanal}`, flags: MessageFlags.Ephemeral });
        }
    }

    if (!interaction.isChatInputCommand()) return;

    // ⬇️ SLASH KOMUTLARI İŞLEME ALANI
    try {
        // DUYURU KOMUTU
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

            let icerikMesaj = '';
            if (pingTipi === 'everyone') icerikMesaj = '@everyone';
            if (pingTipi === 'here') icerikMesaj = '@here';

            await kanal.send({ content: icerikMesaj ? icerikMesaj : undefined, embeds: [duyuruEmbed] });
            return await interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi!`, flags: MessageFlags.Ephemeral });
        }

        // DM DUYURU SİSTEMİ
        if (interaction.commandName === 'dmduyuru') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const mesajMetni = interaction.options.getString('mesaj').replace(/\\n/g, '\n');
            const gorsel = interaction.options.getAttachment('gorsel');

            const dmEmbed = new EmbedBuilder()
                .setTitle(`📢 ${interaction.guild.name} • ÖNEMLİ DUYURU 📢`)
                .setDescription(mesajMetni)
                .setColor('#f1c40f')
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Yönetimi`, iconURL: interaction.guild.iconURL({ dynamic: true }) });

            if (gorsel) dmEmbed.setImage(gorsel.url);

            const members = await interaction.guild.members.fetch();
            let basarili = 0;
            let basarisiz = 0;

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
            return interaction.editReply({ content: `✅ **DM Duyuru Tamamlandı!**\n\n🟢 Ulaşan: **${basarili}**\n🔴 İletilemeyen: **${basarisiz}**` });
        }
        
        // DROP KOMUTU
        if (interaction.commandName === 'drop') {
            const gorunenOdul = interaction.options.getString('gorunen');
            const gizliOdul = interaction.options.getString('teslim_edilecek_odul');
            const gorselDosyası = interaction.options.getAttachment('gorsel_dosyasi');
            const txtDosyasi = interaction.options.getAttachment('txt_dosyasi');
            
            if (!gizliOdul && !gorselDosyası && !txtDosyasi) {
                return interaction.reply({ content: '❌ **Hata:** Gerekli alanları doldurun.', flags: MessageFlags.Ephemeral });
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
                new ButtonBuilder().setCustomId(`drop_${dropId}`).setLabel('ÖDÜLÜ KAP!').setStyle(ButtonStyle.Success).setEmoji('🏆')
            );
            
            const baslangicEmbed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN DROP!')
                .setDescription(`**Ödül:** \`${gorunenOdul}\`\n\n*Aşağıdaki butona ilk basan ödülün sahibi olur!*\n⚠️ **Not:** Bu drop ödülünü sadece durumunda \`.gg/stealdawn\` taşıyan üyeler kapabilir!`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • Başlatan: @${interaction.user.username}` })
                .setTimestamp();
            
            return await interaction.reply({ embeds: [baslangicEmbed], components: [row] });
        }

        // TICKET PANEL
        if (interaction.commandName === 'ticketpanel') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_secim')
                    .setPlaceholder('Seçim yap')
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
                .setDescription('⬇️ **Aşağıdan talebine uygun kategoriyi seçerek ticket açabilirsin.**')
                .setColor('#f1c40f')
                .setFooter({ text: 'Steal Dawn • @r2xzzs' });

            return await interaction.reply({ embeds: [embed], components: [row] });
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
                    { name: '🎁 Alınan Ödül', value: odul, inline: true }, 
                    { name: '👤 Ödülü Alan', value: `${alanUye}`, inline: true }, 
                    { name: '⭐ Değerlendirme', value: '⭐'.repeat(yildizSayisi), inline: true },
                    { name: '🔢 Yetkili Toplam Vouch', value: `\`${toplam} adet\``, inline: true },
                    { name: '📝 Not', value: ekNot, inline: false }
                )
                .setColor('#f1c40f')
                .setFooter({ text: `Vouch Ekleyen: ${interaction.user.username} • Steal Dawn` })
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        // YETKİLİ PUAN
        if (interaction.commandName === 'yetkilipuan') {
            const hedef = interaction.options.getUser('kullanici') || interaction.user;
            const vSayi = await db.get(`vouch_${hedef.id}`) || 0;
            const lSayi = await db.get(`legit_${hedef.id}`) || 0;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${hedef.username} - İstatistikleri`)
                .setColor('#f1c40f')
                .addFields({ name: '⚡ Vouch Puanı', value: `\`${vSayi}\` adet`, inline: true }, { name: '✅ Legit Puanı', value: `\`${lSayi}\` adet`, inline: true })
                .setThumbnail(hedef.displayAvatarURL())
                .setFooter({ text: 'Steal Dawn' });
            
            return await interaction.reply({ embeds: [embed] });
        }

        // ÇEKİLİŞ KOMUTU
        if (interaction.commandName === 'cekilis') {
            await interaction.deferReply(); 

            const durInput = interaction.options.getString('sure');
            const count = interaction.options.getInteger('kazanan_sayisi');
            const prize = interaction.options.getString('odul');
            
            let msDur = ms(parseTurkceSure(durInput));
            const MAX_TIMEOUT = 2147483647; 

            if (!msDur || isNaN(msDur) || msDur > MAX_TIMEOUT) {
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
            
            if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı!' });
            
            const simdi = Math.floor(Date.now() / 1000);
            const bitis = simdi + Math.floor(msDur / 1000);
            const bitisMs = Date.now() + msDur;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 STEAL DAWN ÇEKİLİŞ 🎉')
                .setDescription(`**Ödül:** \`${prize}\`\n**Kazanan Sayısı:** \`${count}\`\n**Başlatan:** ${interaction.user}\n\n📅 **Başlangıç:** <t:${simdi}:F>\n⏳ **Bitiş:** <t:${bitis}:R>`)
                .setColor('#f1c40f')
                .setFooter({ text: `Steal Dawn • 🎉 emojisine tıklayın!` })
                .setTimestamp();
            
            const mesaj = await interaction.editReply({ embeds: [embed] });
            await mesaj.react('🎉');
            
            return await db.set(`cekilis_${mesaj.id}`, {
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

        // ANKET KOMUTU VE BUTONLARIN OLUŞTURULMASI
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
                aciklama += `${s.emoji} **${s.metin}** — \`%0\` (0 Oy)\n`;
                row.addComponents(
                    new ButtonBuilder().setCustomId(`anket_oy_${anketId}_${s.id}`).setLabel(s.metin.substring(0,20)).setStyle(ButtonStyle.Primary).setEmoji(s.emoji)
                );
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 Steal Dawn - Gelişmiş Anket')
                .setDescription(aciklama)
                .setColor('#f1c40f')
                .setFooter({ text: `Anketi Başlatan: @${interaction.user.username}` })
                .setTimestamp();

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // MODERASYON KOMUTLARI
        if (['ban', 'unban', 'mute', 'unmute'].includes(interaction.commandName)) {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID)) return interaction.reply({ content: 'Yetkin yok!', flags: MessageFlags.Ephemeral });
            
            await interaction.deferReply(); 

            if (interaction.commandName === 'ban') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                await m.ban(); 
                return await interaction.editReply(`✅ Başarıyla banlandı.`); 
            }
            if (interaction.commandName === 'unban') { 
                const id = interaction.options.getString('kisi_id');
                await interaction.guild.members.unban(id); 
                return await interaction.editReply(`✅ Ban başarıyla kaldırıldı.`); 
            }
            
            if (interaction.commandName === 'mute') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                const sureInput = interaction.options.getString('sure');
                let msDur = ms(parseTurkceSure(sureInput));

                if (!msDur || isNaN(msDur)) {
                    const temizSure = sureInput.toLowerCase().trim();
                    if (temizSure.endsWith('saat') || temizSure.endsWith('h')) {
                        let saat = parseFloat(temizSure.replace(/saat|h/g, ''));
                        if (!isNaN(saat)) msDur = saat * 60 * 60 * 1000;
                    } 
                    else if (temizSure.endsWith('gun') || temizSure.endsWith('gün') || temizSure.endsWith('d')) {
                        let gun = parseFloat(temizSure.replace(/gun|gün|d/g, ''));
                        if (!isNaN(gun)) msDur = gun * 24 * 60 * 60 * 1000;
                    }
                }
                
                if (!msDur || isNaN(msDur)) return interaction.editReply({ content: '❌ Geçersiz süre formatı!' });
                
                await m.timeout(msDur, 'Mute Komutu'); 
                return await interaction.editReply(`✅ Başarıyla susturuldu.`); 
            }
            
            if (interaction.commandName === 'unmute') { 
                const m = interaction.options.getMember('kisi'); 
                if(!m) return interaction.editReply('❌ Kullanıcı bulunamadı.');
                await m.timeout(null); 
                return await interaction.editReply(`✅ Susturma kaldırıldı.`); 
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
                .addFields({ name: '👤 Alan', value: `${alan}`, inline: true }, { name: '🔢 Toplam Legit', value: `${toplam}`, inline: true })
                .setImage(interaction.options.getAttachment('image').url)
                .setFooter({ text: 'Steal Dawn' });
            
            return await interaction.reply({ embeds: [embed] });
        }

    } catch (error) {
        console.error("Hata:", error);
        if (interaction.deferred) {
            return await interaction.editReply({ content: '❌ Sistemsel bir hata oluştu!' }).catch(() => null);
        } else {
            return await interaction.reply({ content: '❌ Sistemsel bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch(() => null);
        }
    }
});

client.login(process.env.TOKEN);
