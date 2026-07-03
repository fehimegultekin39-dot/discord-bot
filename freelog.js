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
            .setPlaceholder('Sahip olduğun role uygun şansı seç...')
            .addOptions([
                { 
                    label: 'Booster Şansı (En Yüksek)', 
                    value: 'booster_sansi', 
                    description: 'Stok: 954 Adet | Çıkma Şansı: %99 🔥',
                    emoji: '🚀' 
                },
                { 
                    label: 'VIP Şansı (Orta)', 
                    value: 'vip_sansi', 
                    description: 'Stok: 512 Adet | Çıkma Şansı: %75 ✨',
                    emoji: '💎' 
                },
                { 
                    label: 'Invite+ Şansı (En Düşük)', 
                    value: 'invite_sansi', 
                    description: 'Stok: 142 Adet | Çıkma Şansı: %40 📉',
                    emoji: '🎟️' 
                }
            ])
    );

    await interaction.reply({ 
        content: '⚫ **Black Market • Free Log Menüsü**\nSahip olduğun role uygun şans seçeneğine tıkla, benzersiz hesabın anında DM kutuna düşsün!', 
        components: [row]
    });
}

// 3. İşlem Yapıcı (Zaman aşımı hatası giderildi)
async function handleFreeLog(interaction) {
    if (interaction.customId === 'free_log_menu') {
        
        // Discord'a "işlem yapıyorum, bekle" diyoruz (3 saniyelik sınırı 15 dakikaya çıkartır)
        await interaction.deferReply({ ephemeral: true });

        const secilenDeger = interaction.values[0];
        const userRoles = interaction.member.roles.cache;
        
        let gerekliRolID = "";
        let aktifRolIsmi = "";
        let minStok = 0;
        let maxStok = 0;

        if (secilenDeger === 'booster_sansi') {
            gerekliRolID = ROLLER.BOOSTER;
            aktifRolIsmi = "Booster";
            minStok = 700;
            maxStok = 999;
        } else if (secilenDeger === 'vip_sansi') {
            gerekliRolID = ROLLER.VIP;
            aktifRolIsmi = "VIP";
            minStok = 400;
            maxStok = 699;
        } else if (secilenDeger === 'invite_sansi') {
            gerekliRolID = ROLLER.INVITE;
            aktifRolIsmi = "Invite+";
            minStok = 100;
            maxStok = 399;
        }

        // Rol Kontrolü
        if (!userRoles.has(gerekliRolID)) {
            return interaction.editReply({ 
                content: `❌ Seçtiğin **${aktifRolIsmi}** şansını kullanabilmek için o role sahip olmalısın!`
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
            
            // Gizli Onay (deferReply kullandığımız için editReply yapıyoruz)
            await interaction.editReply({ 
                content: `✅ **${rastgeleKategori.toUpperCase()}** kategorisinden bir hesap **${aktifRolIsmi}** özel şansı ile DM kutuna gönderildi!`
            });

            // HESAP ALANLAR KANALINA LOG GÖNDERME
            const logKanal = await interaction.guild.channels.fetch(LOG_KANAL_ID).catch(() => null);
            if (logKanal) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 Free Log Çekildi!')
                    .setDescription(`Bir kullanıcı sistemden ücretsiz hesap teslim aldı.`)
                    .addFields(
                        { name: '👤 Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                        { name: '🎮 Kategori', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
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
            await interaction.editReply({ 
                content: '❌ DM kutun kapalı olduğu için hesabı gönderemedim! Lütfen DM ayarlarını açıp tekrar dene.'
            });
        }
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
