const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// Menüyü kanala kurabilecek kurucu rolü
const KOMUTU_KULLANACAK_ROLLER = ['1520474155210768424']; 

// Rol tanımlamaları ve ID'leri
const ROLLER = {
    BOOSTER: '1520486297527910420',
    VIP: '1521129242094473337',
    INVITE: '1521129473863450664'
};

// Hesap Alanlar Log Kanal ID
const LOG_KANAL_ID = '1520499241062109405';

// 1. Benzersiz Hesap Üretici Fonksiyon
async function rastgeleBenzersizHesap(kategori) {
    const domainler = ["@gmail.com", "@outlook.com", "@yandex.com", "@hotmail.com"];
    let hesapBulundu = false;
    let uretilenHesap = "";
    let denemeSayisi = 0;

    while (!hesapBulundu && denemeSayisi < 20) {
        const random = Math.floor(Math.random() * 999999);
        uretilenHesap = `${kategori.toLowerCase()}_${random}${domainler[Math.floor(Math.random() * domainler.length)]}:Pass${random + 5555}`;
        
        const dahaOnceVerildiMi = await db.get(`verilen_hesap_${uretilenHesap}`);
        if (!dahaOnceVerildiMi) {
            hesapBulundu = true;
            await db.set(`verilen_hesap_${uretilenHesap}`, true);
        }
        denemeSayisi++;
    }
    return uretilenHesap;
}

// 2. Butonlu Arayüz Oluşturucu (Kurulum Komutu)
async function sendFreeLogMenu(interaction) {
    const canSetup = interaction.member.roles.cache.some(r => KOMUTU_KULLANACAK_ROLLER.includes(r.id));
    if (!canSetup) {
        return interaction.reply({ 
            content: '❌ Bu menü kurulum komutunu sadece gerekli yetkiye sahip kişiler kullanabilir!', 
            ephemeral: true 
        });
    }

    // Şık ve uzunlama durması için geniş bir Embed hazırlıyoruz
    const embed = new EmbedBuilder()
        .setTitle('⚫ Black Market • Free Log Sistemi')
        .setDescription('Sahip olduğun role uygun şans butonuna tıkla, sistemden üretilen benzersiz hesabın anında DM kutuna gönderilsin!')
        .addFields(
            { name: '🚀 Booster Şansı', value: '`Stok: 954` | `Çıkma Şansı: %99` 🔥', inline: false },
            { name: '💎 VIP Şansı', value: '`Stok: 512` | `Çıkma Şansı: %75` ✨', inline: false },
            { name: '🎟️ Invite+ Şansı', value: '`Stok: 142` | `Çıkma Şansı: %40` 📉', inline: false }
        )
        .setColor('#000000') // Minimalist siyah arka plan rengi
        .setFooter({ text: 'Black Market • Durumunda .gg/dropzonetr bulunmalıdır.' })
        .setTimestamp();

    // Büyük ve şık butonlar oluşturuyoruz
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_booster_sansi')
            .setLabel('🚀 Booster Şansı (En Yüksek)')
            .setStyle(ButtonStyle.Success), // Yeşil buton
        new ButtonBuilder()
            .setCustomId('btn_vip_sansi')
            .setLabel('💎 VIP Şansı (Orta)')
            .setStyle(ButtonStyle.Primary), // Mavi buton
        new ButtonBuilder()
            .setCustomId('btn_invite_sansi')
            .setLabel('🎟️ Invite+ Şansı (En Düşük)')
            .setStyle(ButtonStyle.Secondary) // Gri buton
    );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row] 
    });
}

// 3. Buton İşlemlerini Yöneten Kısım
async function handleFreeLog(interaction) {
    // Sadece bizim butonlarımıza tıklandığında çalış
    if (interaction.isButton() && interaction.customId.startsWith('btn_')) {
        
        // Hata vermemesi için hemen deferReply atıyoruz
        await interaction.deferReply({ ephemeral: true });

        const butonId = interaction.customId;
        const userRoles = interaction.member.roles.cache;
        
        let gerekliRolID = "";
        let aktifRolIsmi = "";
        let minStok = 0;
        let maxStok = 0;

        if (butonId === 'btn_booster_sansi') {
            gerekliRolID = ROLLER.BOOSTER;
            aktifRolIsmi = "Booster";
            minStok = 700;
            maxStok = 999;
        } else if (butonId === 'btn_vip_sansi') {
            gerekliRolID = ROLLER.VIP;
            aktifRolIsmi = "VIP";
            minStok = 400;
            maxStok = 699;
        } else if (butonId === 'btn_invite_sansi') {
            gerekliRolID = ROLLER.INVITE;
            aktifRolIsmi = "Invite+";
            minStok = 100;
            maxStok = 399;
        }

        // Rol Kontrolü
        if (!userRoles.has(gerekliRolID)) {
            return interaction.editReply({ 
                content: `❌ Tıkladığın **${aktifRolIsmi}** özel butonunu kullanabilmek için sunucuda o role sahip olmalısın!`
            });
        }

        // Durum Kontrolü
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const customStatus = member.presence?.activities?.find(a => a.type === 4);
        
        if (!customStatus || !customStatus.state || !customStatus.state.includes('.gg/dropzonetr')) {
            return interaction.editReply({
                content: '❌ **Hata:** Free log çekebilmek için Discord profil durumuna **.gg/dropzonetr** yazman gerekiyor!'
            });
        }

        const kategoriler = ['steam', 'valorant', 'minecraft', 'roblox', 'netflix', 'disney'];
        const rastgeleKategori = kategoriler[Math.floor(Math.random() * kategoriler.length)];
        
        const hesap = await rastgeleBenzersizHesap(rastgeleKategori);
        const stokMiktari = Math.floor(Math.random() * (maxStok - minStok + 1) + minStok);

        try {
            // DM Gönderimi
            await interaction.user.send(`🎉 **Black Market - Free Log Teslimatı**\n\n**Kategori:** ${rastgeleKategori.toUpperCase()}\n**Mevcut Rol Şansınız:** \`${aktifRolIsmi}\` 🚀\n**Kalan Kategori Stoğu:** ${stokMiktari} Adet\n**Hesap:** \`${hesap}\`\n\n*İyi kullanımlar!*`);
            
            // Kullanıcıya gizli bildirim
            await interaction.editReply({ 
                content: `✅ **${rastgeleKategori.toUpperCase()}** kategorisinden bir hesap **${aktifRolIsmi}** şansıyla üretilerek DM kutuna başarıyla gönderildi!`
            });

            // HESAP ALANLAR KANALINA LOG GÖNDERME
            const logKanal = await interaction.guild.channels.fetch(LOG_KANAL_ID).catch(() => null);
            if (logKanal) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 Free Log Çekildi!')
                    .setDescription(`Bir kullanıcı sistemden buton kullanarak hesap teslim aldı.`)
                    .addFields(
                        { name: '👤 Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                        { name: '🎮 Kategori', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
                        { name: '⚡ Kullanılan Buton Şansı', value: `\`${aktifRolIsmi}\``, inline: true },
                        { name: '🔐 Alınan Hesap', value: `\`\`\`${hesap}\`\`\``, inline: false }
                    )
                    .setColor('#000000')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'Black Market • Free Log Sistemi' })
                    .setTimestamp();

                await logKanal.send({ embeds: [logEmbed] }).catch(err => console.error("Log kanalına mesaj atılamadı:", err));
            }

        } catch (e) {
            await interaction.editReply({ 
                content: '❌ DM kutun kapalı olduğu için hesabı gönderemedim! Lütfen DM ayarlarını açıp tekrar dene.'
            });
        }
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
