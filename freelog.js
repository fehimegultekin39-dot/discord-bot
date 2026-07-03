const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
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

// 2. Menü Oluşturucu
async function sendFreeLogMenu(interaction) {
    const canSetup = interaction.member.roles.cache.some(r => KOMUTU_KULLANACAK_ROLLER.includes(r.id));
    if (!canSetup) {
        return interaction.reply({ 
            content: '❌ Bu menü kurulum komutunu sadece gerekli yetkiye sahip kişiler kullanabilir!', 
            ephemeral: true 
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('free_log_menu')
            .setPlaceholder('Lütfen bir kategori seç...')
            .addOptions([
                { label: 'Steam', value: 'steam', emoji: '🎮' },
                { label: 'Valorant', value: 'valorant', emoji: '🔥' },
                { label: 'Zula', value: 'zula', emoji: '⚔️' },
                { label: 'Ez Global', value: 'ezglobal', emoji: '🧿' },
                { label: 'Minecraft', value: 'minecraft', emoji: '⛏️' },
                { label: 'Roblox', value: 'roblox', emoji: '🧱' },
                { label: 'Netflix', value: 'netflix', emoji: '📺' },
                { label: 'Disney+', value: 'disney', emoji: '✨' },
                { label: 'Exxen', value: 'exxen', emoji: '💰' }
            ])
    );

    await interaction.reply({ 
        content: '⚫ **Black Market • Free Log Menüsü**\nİstediğin kategoriyi seç, hesabın anında DM kutuna düşsün!', 
        components: [row]
    });
}

// 3. İşlem Yapıcı (Rol hiyerarşisine göre yalandan şans/stok hesabı)
async function handleFreeLog(interaction) {
    if (interaction.customId === 'free_log_menu') {
        const userRoles = interaction.member.roles.cache;
        
        // Kullanıcının sahip olduğu en yüksek rolü belirliyoruz
        let aktifRolIsmi = "";
        let minStok = 0;
        let maxStok = 0;

        if (userRoles.has(ROLLER.BOOSTER)) {
            aktifRolIsmi = "Booster";
            minStok = 700; // En yüksek şans/stok
            maxStok = 999;
        } else if (userRoles.has(ROLLER.VIP)) {
            aktifRolIsmi = "VIP";
            minStok = 400; // Orta şans/stok
            maxStok = 699;
        } else if (userRoles.has(ROLLER.INVITE)) {
            aktifRolIsmi = "Invite+";
            minStok = 100; // En düşük şans/stok
            maxStok = 399;
        } else {
            // Hiçbiri yoksa hata ver
            return interaction.reply({ 
                content: '❌ Bu menüyü kullanmak için **Invite+, VIP veya Booster** rollerinden birine sahip olmalısın!', 
                ephemeral: true 
            });
        }

        // Durum Kontrolü
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const customStatus = member.presence?.activities?.find(a => a.type === 4);
        
        if (!customStatus || !customStatus.state || !customStatus.state.includes('.gg/dropzonetr')) {
            return interaction.reply({
                content: '❌ **Hata:** Free log çekebilmek için Discord profil durumuna **.gg/dropzonetr** yazman gerekiyor!',
                ephemeral: true
            });
        }

        const kategori = interaction.values[0];
        const hesap = await rastgeleBenzersizHesap(kategori);
        
        // Sahip olduğu role göre yalandan random stok miktarı
        const stokMiktari = Math.floor(Math.random() * (maxStok - minStok + 1) + minStok);

        try {
            // DM Gönderimi
            await interaction.user.send(`🎉 **Black Market - Free Log Teslimatı**\n\n**Kategori:** ${kategori.toUpperCase()}\n**Mevcut Rol Şansınız:** \`${aktifRolIsmi}\` 🚀\n**Kalan Kategori Stoğu:** ${stokMiktari} Adet\n**Hesap:** \`${hesap}\`\n\n*İyi kullanımlar!*`);
            
            // Gizli Onay
            await interaction.reply({ 
                content: `✅ **${kategori.toUpperCase()}** kategorisinden bir hesap **${aktifRolIsmi}** özel şansı ile DM kutuna gönderildi!`, 
                ephemeral: true 
            });

            // HESAP ALANLAR KANALINA LOG GÖNDERME
            const logKanal = await interaction.guild.channels.fetch(LOG_KANAL_ID).catch(() => null);
            if (logKanal) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 Free Log Çekildi!')
                    .setDescription(`Bir kullanıcı sistemden ücretsiz hesap teslim aldı.`)
                    .addFields(
                        { name: '👤 Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                        { name: '🎮 Kategori', value: `\`${kategori.toUpperCase()}\``, inline: true },
                        { name: '⚡ Kullanılan Rol Şansı', value: `\`${aktifRolIsmi}\``, inline: true },
                        { name: '🔐 Alınan Hesap', value: `\`\`\`${hesap}\`\`\``, inline: false }
                    )
                    .setColor('#00FFAA')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'Black Market • Free Log Sistemi' })
                    .setTimestamp();

                await logKanal.send({ embeds: [logEmbed] }).catch(err => console.error("Log kanalına mesaj atılamadı:", err));
            }

        } catch (e) {
            await interaction.reply({ 
                content: '❌ DM kutun kapalı olduğu için hesabı gönderemedim! Lütfen DM ayarlarını açıp tekrar dene.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
