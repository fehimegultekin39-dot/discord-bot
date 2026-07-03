const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// ==================== AYARLAR KIRMIZI ALAN ====================
// Menüyü sunucuda kurmaya yetkili Kurucu/Yönetici Rol ID'si
const KOMUTU_KULLANACAK_ROLLER = ['1520474155210768424']; 

// Sunucundaki Rol ID'leri (Otomatik Tespit Edilecek)
const ROLLER = {
    BOOSTER: '1520486297527910420',
    VIP: '1521129242094473337',
    INVITE: '1521129473863450664'
};

// Hesapların loglanacağı kanalın ID'si
const LOG_KANAL_ID = '1520499241062109405';

// Şart koşulan özel durum (Biyografi / Custom Status)
const ZORUNLU_DURUM = '.gg/dropzonetr';

// Günlük sınır (Aynı kullanıcı 24 saatte en fazla kaç kez çekebilir? 0 = Sınırsız)
const GUNLUK_LIMIT = 1; 
// ==============================================================

/**
 * Benzersiz ve Karışık Gerçekçi Hesap Üretici Fonksiyon
 * Veritabanında daha önce aynı hesabın verilip verilmediğini kontrol eder.
 */
async function rastgeleBenzersizHesap(kategori) {
    const domainler = ["@gmail.com", "@outlook.com", "@yandex.com", "@hotmail.com"];
    // Gerçekçi şifre kombinasyonları için karakter havuzu
    const karakterler = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    let hesapBulundu = false;
    let uretilenHesap = "";
    let denemeSayisi = 0;

    // Maksimum 50 denemede benzersiz hesap bulmaya çalışır
    while (!hesapBulundu && denemeSayisi < 50) {
        const rastgeleSayi = Math.floor(Math.random() * 899999) + 100000;
        const secilenDomain = domainler[Math.floor(Math.random() * domainler.length)];
        
        // Rastgele 6 haneli şifre eki üretme
        let sifreEki = "";
        for (let i = 0; i < 6; i++) {
            sifreEki += karakterler.charAt(Math.floor(Math.random() * karakterler.length));
        }

        // Çıktı Örneği: valorant_user482@gmail.com:Bm4x9K
        uretilenHesap = `${kategori.toLowerCase()}_user${rastgeleSayi}${secilenDomain}:Bm${sifreEki}`;
        
        // Veritabanı kontrolü
        const dahaOnceVerildiMi = await db.get(`verilen_hesap_${uretilenHesap}`);
        if (!dahaOnceVerildiMi) {
            hesapBulundu = true;
            // Bu hesabı sisteme verilmiş olarak kaydet
            await db.set(`verilen_hesap_${uretilenHesap}`, true);
        }
        denemeSayisi++;
    }
    return uretilenHesap;
}

/**
 * /freelog komutu çalıştırıldığında arayüzü kanala gönderir.
 * Tam boy, geniş ve şık Embed tasarımı.
 */
async function sendFreeLogMenu(interaction) {
    // Yetki Kontrolü
    const canSetup = interaction.member.roles.cache.some(r => KOMUTU_KULLANACAK_ROLLER.includes(r.id));
    if (!canSetup) {
        return interaction.reply({ 
            content: '❌ Bu menü kurulum komutunu sadece yetkili yönetim kadrosu kullanabilir!', 
            ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('⚫ Black Market • Free Log Sistemi')
        .setDescription(`Aşağıdaki **🎁 Free Log Çek** butonuna tıklayarak sistem havuzundan adınıza tanımlanacak benzersiz hesabınızı anında teslim alabilirsiniz.\n\n**⚠️ Zorunlu Şart:**\nProfil durumunuzda (Custom Status) mutlak suretle \`${ZORUNLU_DURUM}\` yazılı olmalıdır! Aksi takdirde sistem doğrulama sağlamaz.`)
        .addFields(
            { name: '🚀 Booster Ayrıcalığı', value: '`Kalan Stok: 954 Adet` | `Çıkma Şansı: %99` 🔥\n*En yüksek kalitede premium hesaplar tanımlanır.*', inline: false },
            { name: '💎 VIP Ayrıcalığı', value: '`Kalan Stok: 512 Adet` | `Çıkma Şansı: %75` ✨\n*Yüksek kalitede dolu hesaplar tanımlanır.*', inline: false },
            { name: '🎟️ Invite+ Ayrıcalığı', value: '`Kalan Stok: 142 Adet` | `Çıkma Şansı: %40` 📉\n*Standart havuzdan random hesaplar tanımlanır.*', inline: false }
        )
        .setColor('#000000') // Black Market Siyah Teması
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'Black Market • Sistem rollerinizi otomatik analiz eder.', iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    // Geniş ve uzunlamasına buton yapısı
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_free_log_cek')
            .setLabel('🎁 Free Log Çek')
            .setStyle(ButtonStyle.Success) // Büyük Yeşil Buton
    );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row] 
    });
}

/**
 * Butona tıklandığında çalışan ana yönetim motoru.
 * Zaman aşımı korumalı, rol algılamalı ve loglama entegreli.
 */
async function handleFreeLog(interaction) {
    // Sadece hedef buton tetiklendiğinde devreye gir
    if (!interaction.isButton() || interaction.customId !== 'btn_free_log_cek') return;
    
    // Discord 3 saniye sınırını aşmamak için işlemi hemen askıya alıp zaman kazanıyoruz
    await interaction.deferReply({ ephemeral: true });

    const userRoles = interaction.member.roles.cache;
    const userId = interaction.user.id;
    
    let aktifRolIsmi = "";
    let minStok = 0;
    let maxStok = 0;

    // 1. Rol Hiyerarşisi Algılama (En yüksek rolden aşağıya doğru)
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
        // Gerekli rollerin hiçbiri yoksa işlemi kes
        return interaction.editReply({ 
            content: '❌ **Sistem Engeli:** Free log sisteminden yararlanabilmek için sunucumuzda **Invite+, VIP veya Booster** rollerinden en az birine sahip olmanız gerekmektedir!'
        });
    }

    // 2. Günlük Sınır (Cooldown) Kontrolü
    if (GUNLUK_LIMIT > 0) {
        const bugun = new Date().toISOString().slice(0, 10); // YYYY-MM-DD formatı
        const kullanimSayisi = await db.get(`cooldown_${userId}_${bugun}`) || 0;
        
        if (kullanimSayisi >= GUNLUK_LIMIT) {
            return interaction.editReply({
                content: `❌ **Limit Aşıldı:** Bu sistemden 24 saat içerisinde en fazla **${GUNLUK_LIMIT}** kez hesap çekebilirsiniz. Lütfen yarın tekrar deneyin!`
            });
        }
    }

    // 3. Profil Durumu (Custom Status) Doğrulaması
    // Üyenin presence verisini çekebilmek için guild'den güncel halini fetch ediyoruz
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) {
        return interaction.editReply({ content: '❌ Kullanıcı verileri doğrulanırken bir hata oluştu.' });
    }

    const customStatus = member.presence?.activities?.find(a => a.type === 4); // Type 4 = Custom Status
    
    if (!customStatus || !customStatus.state || !customStatus.state.includes(ZORUNLU_DURUM)) {
        return interaction.editReply({
            content: `❌ **Şart İhlali:** Profil durumunuzda (biyografi veya hakkında kısmı değil, aktif durum mesajınızda) \`${ZORUNLU_DURUM}\` ibaresi bulunamadı!\n\n*Not: Durumunuzu güncelledikten sonra Discord'un algılaması için birkaç saniye bekleyip butona tekrar basınız.*`
        });
    }

    // 4. Rastgele Kategori ve Hesap Seçimi
    const kategoriler = ['steam', 'valorant', 'minecraft', 'roblox', 'netflix', 'disney'];
    const rastgeleKategori = kategoriler[Math.floor(Math.random() * kategoriler.length)];
    
    const hesap = await rastgeleBenzersizHesap(rastgeleKategori);
    const anlikStok = Math.floor(Math.random() * (maxStok - minStok + 1) + minStok);

    try {
        // 5. Hesap Teslimatı (DM Gönderimi)
        const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 Black Market • Hesap Teslim Edildi')
            .setDescription(`Sistemdeki mevcut rol ayrıcalığınız algılanarak hesabınız başarıyla üretildi ve teslim edildi.`)
            .addFields(
                { name: '🎮 Ürün Kategorisi', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
                { name: '⚡ Algılanan Rolün', value: `\`${aktifRolIsmi}\``, inline: true },
                { name: '📦 Kalan Paket Stoğu', value: `\`${anlikStok} Adet\``, inline: true },
                { name: '🔐 Hesap Bilgileri (Eposta:Şifre)', value: `\`\`\`${hesap}\`\`\``, inline: false }
            )
            .setColor('#00FFAA')
            .setFooter({ text: 'Black Market • Güvenli Alışverişin Adresi' })
            .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] });
        
        // Günlük limiti güncelle (Eğer limit aktifse)
        if (GUNLUK_LIMIT > 0) {
            const bugun = new Date().toISOString().slice(0, 10);
            await db.add(`cooldown_${userId}_${bugun}`, 1);
        }

        // Kanaldaki kullanıcıya gizli/ephemeral bildirim
        await interaction.editReply({ 
            content: `✅ **İşlem Başarılı!** **${rastgeleKategori.toUpperCase()}** havuzundan seçilen benzersiz hesabınız, **${aktifRolIsmi}** şans faktörünüzle birlikte DM kutunuza başarıyla fırlatıldı! Lütfen kontrol edin.`
        });

        // 6. Yönetim Log Kanalına Detaylı Rapor Gönderme
        const logKanal = await interaction.guild.channels.fetch(LOG_KANAL_ID).catch(() => null);
        if (logKanal) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📥 Free Log Dağıtımı Yapıldı')
                .setDescription(`Bir kullanıcı şartları yerine getirerek sistemden ücretsiz hesap aldı.`)
                .addFields(
                    { name: '👤 Kullanıcı', value: `${interaction.user} (\`${userId}\`)`, inline: true },
                    { name: '🎮 Verilen Kategori', value: `\`${rastgeleKategori.toUpperCase()}\``, inline: true },
                    { name: '⚡ Algılanan Rol Durumu', value: `\`${aktifRolIsmi}\``, inline: true },
                    { name: '🔐 Teslim Edilen Hesap Bilgisi', value: `\`\`\`${hesap}\`\`\``, inline: false }
                )
                .setColor('#000000')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Black Market • Log Takip Sistemi' })
                .setTimestamp();

            await logKanal.send({ embeds: [logEmbed] }).catch(err => console.error("Log kanalına mesaj gönderilemedi:", err));
        }

    } catch (e) {
        // DM Kapalı Hatası Yönetimi
        await interaction.editReply({ 
            content: '❌ **Gönderim Başarısız:** Discord DM (Özel Mesaj) kutunuz kapalı olduğu için hesabı iletemedim! Lütfen sunucu gizlilik ayarlarından "Direkt Mesajlara İzin Ver" seçeneğini açıp butona tekrar basınız.'
        });
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
