const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// Yetkili/Admin Rol ID'si (Buraya stok ekleyebilecek rolün ID'sini yazabilirsin)
const ADMIN_ROLE_ID = "YETKILI_ROL_ID_BURAYA"; 

/**
 * Kullanıcıların göreceği ana Free Log Menüsünü kanala gönderir.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 */
async function sendFreeLogMenu(interaction) {
    // Kategorileri ve mevcut anlık stok durumlarını çekmek için hazırlık
    const kategoriler = [
        { label: 'Discord Token Log', value: 'log_discord', emoji: '🔵', desc: 'Güncel Discord token ve hesap logları.' },
        { label: 'Steam Account Log', value: 'log_steam', emoji: '💨', desc: 'Steam hesap, oyun ve envanter logları.' },
        { label: 'Valorant & Riot Log', value: 'log_valorant', emoji: '🔴', desc: 'Valorant/Riot Games güncel ranked logları.' },
        { label: 'Netflix & Premium Log', value: 'log_premium', emoji: '🍿', desc: 'Netflix, Spotify ve Premium platform logları.' },
        { label: 'Crypto & Wallet Log', value: 'log_crypto', emoji: '🪙', desc: 'Kripto cüzdan, metamask ve borsa logları.' }
    ];

    const menuOptions = [];

    for (const kat of kategoriler) {
        // Her kategorinin veritabanındaki stok dizisini alıyoruz
        const stoklar = await db.get(`stok_${kat.value}`) || [];
        const stokSayisi = stoklar.length;

        menuOptions.push({
            label: kat.label,
            value: kat.value,
            emoji: kat.emoji,
            description: `${kat.desc} (Stok: ${stokSayisi})`
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('free_log_menu')
            .setPlaceholder('Almak istediğiniz Free Log kategorisini seçin')
            .addOptions(menuOptions)
    );

    const embed = new EmbedBuilder()
        .setTitle('🛒 Black Market — Ücretsiz Log Paneli')
        .setDescription('Aşağıdaki menüyü kullanarak anlık güncellenen sistem loglarından tamamen ücretsiz bir şekilde yararlanabilirsiniz.\n\n⚡ **Sistem Nasıl Çalışır?**\nKategoriyi seçtikten sonra sizin için özel bir buton üretilir. Butona ilk tıklayan kişi stoktaki güncel logu kapar ve log otomatik olarak sistemden silinir!')
        .setColor('#1e1f22')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'Black Market • Hızlı ve Otomatik Teslimat', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
}

/**
 * Menü seçimlerini, log çekme işlemlerini ve admin stok yönetimini işler.
 * @param {import('discord.js').Interaction} interaction 
 */
async function handleFreeLog(interaction) {
    
    // ==========================================
    // 1. DURUM: AÇILIR MENÜDEN KATEGORİ SEÇİLMESİ
    // ==========================================
    if (interaction.isStringSelectMenu() && interaction.customId === 'free_log_menu') {
        const secilenKategori = interaction.values[0];
        const stoklar = await db.get(`stok_${secilenKategori}`) || [];
        
        // Seçilen seçeneğin ismini bulma
        const option = interaction.component.options.find(o => o.value === secilenKategori);
        const kategoriIsmi = option ? option.label : 'Bilinmeyen Kategori';

        if (stoklar.length === 0) {
            return interaction.reply({ 
                content: `❌ Üzgünüm, **${kategoriIsmi}** kategorisinde şu an hiç stok bulunmuyor! Lütfen daha sonra tekrar kontrol edin veya adminlerin yüklemesini bekleyin.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Güvenlik ve çakışmaları önlemek için benzersiz bir işlem ID'si
        const islemId = Math.random().toString(36).substring(2, 9);
        
        // Geçici oturumu DB'ye kaydediyoruz
        await db.set(`oturum_${islemId}`, {
            kategori: secilenKategori,
            kategoriIsmi: kategoriIsmi,
            olusturan: interaction.user.id
        });

        const hazirEmbed = new EmbedBuilder()
            .setTitle(`📂 ${kategoriIsmi} Kategorisi Hazır`)
            .setDescription(`Seçtiğiniz kategori için başarıyla bir dağıtım oturumu oluşturuldu.\n\n🔒 **Log verisini kapmak ve doğrudan DM kutunuza almak için aşağıdaki butona tıklayın!**\n*(İlk tıklayan kazanır)*`)
            .setColor('#5865f2')
            .addFields({ name: 'Mevcut Toplam Stok', value: `\`${stoklar.length} Adet\``, inline: true })
            .setFooter({ text: 'Bu buton tek kullanımlıktır.' });

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`btn_log_kap_${islemId}`)
                .setLabel('Logu Kap (DM Gönder)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚡')
        );

        // Mesajı butonlu hale getiriyoruz
        await interaction.update({ embeds: [hazirEmbed], components: [btnRow] });
    }

    // ==========================================
    // 2. DURUM: "LOGU KAP" BUTONUNA TIKLANMASI
    // ==========================================
    else if (interaction.isButton() && interaction.customId.startsWith('btn_log_kap_')) {
        const islemId = interaction.customId.replace('btn_log_kap_', '');
        const oturum = await db.get(`oturum_${islemId}`);

        if (!oturum) {
            return interaction.reply({ content: '❌ Bu işlemin süresi dolmuş veya geçersiz.', flags: MessageFlags.Ephemeral });
        }

        // Kilit mekanizması: Aynı anda basılmaları engellemek için oturumu hemen siliyoruz
        await db.delete(`oturum_${islemId}`);

        // Stok dizisini çekiyoruz
        let stoklar = await db.get(`stok_${oturum.kategori}`) || [];

        if (stoklar.length === 0) {
            return interaction.reply({ content: '❌ Tüh! Başka bir kullanıcı sizden saliseler önce davranıp son logu kaptı.', flags: MessageFlags.Ephemeral });
        }

        // Dizinin ilk elemanını (en eski eklenen logu) kuyruktan çıkartıyoruz (FIFO mantığı)
        const teslimEdilenLog = stoklar.shift();
        
        // Kalan stoku güncelliyoruz
        await db.set(`stok_${oturum.kategori}`, stoklar);

        try {
            // Kullanıcıya DM yoluyla logu iletiyoruz
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 Log Başarıyla Kaptın!')
                .setDescription(`**Kategori:** \`${oturum.kategoriIsmi}\`\n\n**Log Bilgileri:**\n\`\`\`text\n${teslimEdilenLog}\n\`\`\``)
                .setColor('#57f287')
                .setFooter({ text: 'Black Market • İyi kullanımlar!' })
                .setTimestamp();

            await interaction.user.send({ embeds: [dmEmbed] });

            // Kanaldaki herkese açık mesajı güncelliyoruz
            const bittiEmbed = new EmbedBuilder()
                .setTitle('✅ STOKTAN BİR LOG KAPILDI!')
                .setDescription(`🏆 ${interaction.user} kullanıcısı **${oturum.kategoriIsmi}** kategorisinden bir log kaptı!\n\n📩 Log verisi güvenli bir şekilde kullanıcının **DM kutusuna gönderildi.**\n\n📉 Kalan Kategori Stoğu: \`${stoklar.length}\``)
                .setColor('#232428')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await interaction.update({ embeds: [bittiEmbed], components: [] });

        } catch (error) {
            // Eğer kullanıcının DM'i kapalıysa log ziyan olmasın diye stoka geri ekliyoruz
            stoklar.unshift(teslimEdilenLog);
            await db.set(`stok_${oturum.kategori}`, stoklar);

            // Oturumu da tekrar aktif ediyoruz ki başkası alabilsin veya kullanıcı DM açıp tekrar denesin
            await db.set(`oturum_${islemId}`, oturum);

            return interaction.reply({ 
                content: '❌ **Hata:** Discord DM (Özel Mesaj) kutunuz kapalı olduğu için bot size logu teslim edemedi! Lütfen gizlilik ayarlarınızdan DM kutunuzu açıp butona tekrar basmayı deneyin.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
}

/**
 * Gelişmiş Özellik: Adminlerin komutla sisteme kolayca toplu log eklemesini sağlayan yardımcı fonksiyon.
 * Kullanımı (Örn: Slash komutunda): freelogModul.addLogStock(interaction, 'log_discord', 'yeni_token_verisi')
 */
async function addLogStock(interaction, kategoriId, logIcerik) {
    // Admin yetki kontrolü
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için gerekli yetkiniz bulunmuyor.', flags: MessageFlags.Ephemeral });
    }

    if (!logIcerik) {
        return interaction.reply({ content: '❌ Eklemek için geçerli bir log içeriği yazmalısınız.', flags: MessageFlags.Ephemeral });
    }

    // Mevcut stoku alıp üzerine pushluyoruz
    const mevcutStok = await db.get(`stok_${kategoriId}`) || [];
    mevcutStok.push(logIcerik);
    await db.set(`stok_${kategoriId}`, mevcutStok);

    return interaction.reply({ 
        content: `✅ Log verisi başarıyla **\`${kategoriId}\`** kategorisi stoklarına eklendi! (Güncel Stok: \`${mevcutStok.length}\`)`, 
        flags: MessageFlags.Ephemeral 
    });
}

module.exports = {
    sendFreeLogMenu,
    handleFreeLog,
    addLogStock
};
