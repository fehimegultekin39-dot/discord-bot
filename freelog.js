const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// ==================== AYARLAR TABLOSU ====================
// Menüyü kanala kurmaya yetkili Kurucu/Yönetici Rol ID'si
const KOMUTU_KULLANACAK_ROLLER = ['1520474155210768424']; 

// Rol tanımlamaları ve ID'leri
const ROLLER = {
    BOOSTER: '1520486297527910420',
    VIP: '1521129242094473337',
    INVITE: '1521129473863450664'
};

// Hesap Alanlar Log Kanal ID
const LOG_KANAL_ID = '1520499241062109405';

// Şart koşulan durum kelimesi
const ZORUNLU_DURUM = '.gg/dropzonetr';

// Günlük limit sınırı (1 kullanıcının 24 saatte alabileceği maks hesap)
const GUNLUK_LIMIT = 1; 
// =========================================================

/**
 * Karışık, gerçekçi benzersiz hesap üretici fonksiyon.
 * Havuz mantığıyla veritabanı kontrolü gerçekleştirir.
 */
async function rastgeleBenzersizHesap(kategori) {
    const domainler = ["@gmail.com", "@outlook.com", "@yandex.com", "@hotmail.com"];
    const karakterler = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    let hesapBulundu = false;
    let uretilenHesap = "";
    let denemeSayisi = 0;

    while (!hesapBulundu && denemeSayisi < 50) {
        const rastgeleSayi = Math.floor(Math.random() * 899999) + 100000;
        const secilenDomain = domainler[Math.floor(Math.random() * domainler.length)];
        
        let sifreEki = "";
        for (let i = 0; i < 6; i++) {
            sifreEki += karakterler.charAt(Math.floor(Math.random() * karakterler.length));
        }

        uretilenHesap = `${kategori.toLowerCase()}_user${rastgeleSayi}${secilenDomain}:Bm${sifreEki}`;
        
        const dahaOnceVerildiMi = await db.get(`verilen_hesap_${uretilenHesap}`);
        if (!dahaOnceVerildiMi) {
            hesapBulundu = true;
            await db.set(`verilen_hesap_${uretilenHesap}`, true);
        }
        denemeSayisi++;
    }
    return uretilenHesap;
}

/**
 * Menüyü yetkili kanala gönderen ana embed kurulumu
 */
async function sendFreeLogMenu(interaction) {
    const canSetup = interaction.member.roles.cache.some(r => KOMUTU_KULLANACAK_ROLLER.includes(r.id));
    if (!canSetup) {
        return interaction.reply({ 
            content: '❌ Bu menü kurulum komutunu sadece gerekli yetkiye sahip kişiler kullanabilir!', 
            ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('⚫ Black Market • Free Log Sistemi')
        .setDescription(`Aşağıdaki buton vasıtasıyla profil durum şartını yerine getiren tüm üyelerimiz ücretsiz hesap havuzundan yararlanabilir.\n\n**⚠️ Zorunlu Şart:**\nProfil durumunuzda (Custom Status) mutlak suretle \`${ZORUNLU_DURUM}\` yazılı olmalıdır!`)
        .addFields(
            { name: '🚀 Booster Ayrıcalığı', value: '`Stok Miktarı: 954` | `Çıkma Şansı: %99` 🔥', inline: false },
            { name: '💎 VIP Ayrıcalığı', value: '`Stok Miktarı: 512` | `Çıkma Şansı: %75` ✨', inline: false },
            { name: '🎟️ Invite+ Ayrıcalığı', value: '`Stok Miktarı: 142` | `Çıkma Şansı: %40` 📉', inline: false }
        )
        .setColor('#000000')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'Black Market • Sistem rollerinizi otomatik analiz eder.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_free_log_cek')
            .setLabel('🎁 Free Log Çek')
            .setStyle(ButtonStyle.Success) // Geniş yeşil buton
    );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row] 
    });
}

/**
 * Buton tetiklendiğinde çalışan, rol hiyerarşisi analiz motoru.
 */
async function handleFreeLog(interaction) {
    // Sadece hedef buton algılandığında çalış
    if (!interaction.isButton() || interaction.customId !== 'btn_free_log_cek') return;
    
    // Uygulama yanıt vermedi hatasını EN BAŞTA önlemek adına askıya alıyoruz
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const userId = interaction.user.id;
    
    // Sunucudan üyenin en güncel verilerini presence (durum) dahil çekiyoruz
    const member = await interaction.guild.members.fetch({ user: userId, withPresences: true }).catch(() => null);
    if (!member) {
        return interaction.editReply({ content: '❌ Sunucu içi üye bilgilerinize ulaşılamadı. Lütfen tekrar deneyin.' });
    }

    const userRoles = member.roles.cache;
    let aktifRolIsmi = "";
    let minStok = 0;
    let maxStok = 0;

    // 1. Otomatik Rol Analizi (Hiyerarşik Kontrol)
    if (userRoles.has(ROLLER.BOOSTER)) {
        aktifRolIsmi = "Booster";
        minStok = 700;
        maxStok = 954;
    } else if (userRoles.has(ROLLER.VIP)) {
        aktifRolIsmi = "VIP";
        minStok = 300;
        maxStok = 512;
    } else if (userRoles.has(ROLLER.INVITE)) {
        aktifRolIsmi = "Invite+";
        minStok = 50;
        maxStok = 142;
    } else {
        return interaction.editReply({ 
            content: '❌ **Yetki Yetersiz:** Free log çekebilmek için sunucumuzda **Invite+, VIP veya Booster** rollerinden en az birine sahip olmanız gerekmektedir!' 
        });
    }

    // 2. Cooldown / Günlük Sınır Kontrolü
    if (GUNLUK_LIMIT > 0) {
        const bugun = new Date().toISOString().slice(0, 10);
        const kullanimSayisi = await db.get(`cooldown_${userId}_${bugun}`) || 0;
        
        if (kullanimSayisi >= GUNLUK_LIMIT) {
            return interaction.editReply({
                content: `❌ **Günlük Sınır:** Bu sistemden 24 saat içerisinde sadece **${GUNLUK_LIMIT}** kez hesap çekebilirsiniz. Lütfen yarın tekrar deneyin!`
            });
        }
    }

    // 3. Özel Profil Durumu (Custom Status) Doğrulaması
    const customStatus = member.presence?.activities?.find(a => a.type === 4);
    if (!customStatus || !customStatus.state || !customStatus.state.includes(ZORUNLU_DURUM)) {
        return interaction.editReply({
            content: `❌ **Durum Şartı Sağlanmadı:** Free log alabilmek için profil durumunuza (Custom Status) \`${ZORUNLU_DURUM}\` yazmalısınız!`
        });
    }

    // 4. Hesap Seçim ve Stok Simülasyon Aşaması
    const kategoriler = ['steam', 'valorant', 'minecraft', 'roblox', 'netflix', 'disney'];
    const rastgeleKategori = kategoriler[Math.floor(Math.random() * kategoriler.length)];
    
    const hesap = await rastgeleBenzersizHesap(rastgeleKategori);
    const anlikStok = Math.floor(Math.random() * (maxStok - minStok + 1) + minStok);

    try {
        // 5. Kullanıcıya Gizli DM İletimi
        const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 Black Market • Free Log Teslimatı')
            .setDescription(`Sistem üzerindeki mevcut haklarınız doğrulanarak hesabınız başarıyla üretilmiştir.`)
            .addFields(
                { name: '🎮 Ürün Kategorisi', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
                { name: '⚡ Algılanan Rolünüz', value: `\`${aktifRolIsmi}\``, inline: true },
                { name: '📦 Kalan Kategori Stoğu', value: `\`${anlikStok} Adet\``, inline: true },
                { name: '🔐 Hesap Bilgileri (Eposta:Şifre)', value: `\`\`\`${hesap}\`\`\``, inline: false }
            )
            .setColor('#00FFAA')
            .setFooter({ text: 'Black Market • İyi kullanımlar diler!' })
            .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] });

        // İşlem başarılıysa veritabanı limit sayacını artırıyoruz
        if (GUNLUK_LIMIT > 0) {
            const bugun = new Date().toISOString().slice(0, 10);
            await db.add(`cooldown_${userId}_${bugun}`, 1);
        }

        // Kanaldaki etkileşime son başarılı yanıtı ver
        await interaction.editReply({ 
            content: `✅ **Başarılı:** **${rastgeleKategori.toUpperCase()}** kategorisindeki hesabınız **${aktifRolIsmi}** şans oranıyla üretilerek DM kutunuza ulaştırıldı!` 
        });

        // 6. Yetkili Raporlama (Log) Kanal Gönderimi
        const logKanal = await interaction.guild.channels.fetch(LOG_KANAL_ID).catch(() => null);
        if (logKanal) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📥 Free Log Teslim Edildi')
                .addFields(
                    { name: '👤 Alan Kullanıcı', value: `${interaction.user} (\`${userId}\`)`, inline: true },
                    { name: '🎮 Teslim Kategorisi', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
                    { name: '⚡ Okunan Rol Şansı', value: `\`${aktifRolIsmi}\``, inline: true },
                    { name: '🔐 Gönderilen Hesap Verisi', value: `\`\`\`${hesap}\`\`\``, inline: false }
                )
                .setColor('#000000')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Black Market • Log Sistemi' })
                .setTimestamp();

            await logKanal.send({ embeds: [logEmbed] }).catch(() => {});
        }

    } catch (e) {
        // DM Kapalıysa yakalanacak hata bloğu
        await interaction.editReply({ 
            content: '❌ **DM Kapalı:** Hesabınız hazırlandı fakat özel mesaj kutunuz kapalı olduğu için bota erişim izni verilmedi. Lütfen gizlilik ayarlarınızdan DM kutunuzu açıp tekrar deneyiniz.' 
        });
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
