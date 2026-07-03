const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// Yetkili Rol ID'lerin
const IZINLI_ROLLER = ['1521129473863450664', '1521129242094473337', '1520486297527910420'];
// Hesap Alanlar Log Kanal ID
const LOG_KANAL_ID = '1520499241062109405';

// 1. Benzersiz Hesap Üretici Fonksiyon
async function rastgeleBenzersizHesap(kategori) {
    const domainler = ["@gmail.com", "@outlook.com", "@yandex.com", "@hotmail.com"];
    let hesapBulundu = false;
    let uretilenHesap = "";
    let denemeSayisi = 0;

    // Aynı hesap daha önce verilmiş mi diye kontrol eden döngü (Max 20 deneme)
    while (!hesapBulundu && denemeSayisi < 20) {
        const random = Math.floor(Math.random() * 999999);
        uretilenHesap = `${kategori.toLowerCase()}_${random}${domainler[Math.floor(Math.random() * domainler.length)]}:Pass${random + 5555}`;
        
        // Veritabanında bu hesap daha önce kaydedilmiş mi bakıyoruz
        const dahaOnceVerildiMi = await db.get(`verilen_hesap_${uretilenHesap}`);
        if (!dahaOnceVerildiMi) {
            hesapBulundu = true;
            // Hesabı veritabanına kaydediyoruz ki bir daha üretilmesin
            await db.set(`verilen_hesap_${uretilenHesap}`, true);
        }
        denemeSayisi++;
    }
    return uretilenHesap;
}

// 2. Menü Oluşturucu
async function sendFreeLogMenu(interaction) {
    // Rol Kontrolü
    const hasRole = interaction.member.roles.cache.some(r => IZINLI_ROLLER.includes(r.id));
    if (!hasRole) {
        return interaction.reply({ 
            content: '❌ Bu menüyü kullanmak için **Invite+, VIP veya Booster** rollerinden birine sahip olmalısın!', 
            ephemeral: true 
        });
    }

    // Durum (Custom Status) Kontrolü
    // Botun "GuildMembers" intent'i açık olmalı ve kullanıcının durumunu okuyabilmesi gerekir.
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const customStatus = member.presence?.activities?.find(a => a.type === 4); // Type 4 = CUSTOM_STATUS
    
    if (!customStatus || !customStatus.state || !customStatus.state.includes('.gg/dropzonetr')) {
        return interaction.reply({
            content: '❌ **Hata:** Free log çekebilmek için Discord profil durumuna (biyografine değil, durum kısmına) **.gg/dropzonetr** yazman gerekiyor!',
            ephemeral: true
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('free_log_menu')
            .setPlaceholder('Lütfen bir kategori seç...')
            .addOptions([
                { label: 'Steam (Stok: 421)', value: 'steam', emoji: '🎮' },
                { label: 'Valorant (Stok: 312)', value: 'valorant', emoji: '🔥' },
                { label: 'Zula (Stok: 154)', value: 'zula', emoji: '⚔️' },
                { label: 'Ez Global (Stok: 289)', value: 'ezglobal', emoji: '🧿' },
                { label: 'Minecraft (Stok: 367)', value: 'minecraft', emoji: '⛏️' },
                { label: 'Roblox (Stok: 124)', value: 'roblox', emoji: '🧱' },
                { label: 'Netflix (Stok: 450)', value: 'netflix', emoji: '📺' },
                { label: 'Disney+ (Stok: 298)', value: 'disney', emoji: '✨' },
                { label: 'Exxen (Stok: 210)', value: 'exxen', emoji: '💰' }
            ])
    );

    await interaction.reply({ 
        content: '⚫ **Black Market • Free Log Menüsü**\nİstediğin kategoriyi seç, hesabın anında DM kutuna düşsün!', 
        components: [row], 
        ephemeral: true 
    });
}

// 3. İşlem Yapıcı (DM gönderimi ve Kanal Logu)
async function handleFreeLog(interaction) {
    if (interaction.customId === 'free_log_menu') {
        const kategori = interaction.values[0];
        
        // Benzersiz hesap üretiliyor
        const hesap = await rastgeleBenzersizHesap(kategori);
        const stokMiktari = Math.floor(Math.random() * (500 - 100 + 1) + 100);

        try {
            // Kullanıcıya DM Gönderimi
            await interaction.user.send(`🎉 **Black Market - Free Log Teslimatı**\n\n**Kategori:** ${kategori.toUpperCase()}\n**Stok:** ${stokMiktari} Adet\n**Hesap:** \`${hesap}\`\n\n*İyi kullanımlar!*`);
            
            // Kullanıcı arayüzünü güncelleme
            await interaction.update({ 
                content: `✅ **${kategori.toUpperCase()}** kategorisinden bir hesap DM kutuna gönderildi!`, 
                components: [], 
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
                        { name: '🔐 Alınan Hesap', value: `\`\`\`${hesap}\`\`\``, inline: false }
                    )
                    .setColor('#00FFAA')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'Black Market • Free Log Sistemi' })
                    .setTimestamp();

                await logKanal.send({ embeds: [logEmbed] }).catch(err => console.error("Log kanalına mesaj atılamadı:", err));
            }

        } catch (e) {
            console.error(e);
            await interaction.followUp({ 
                content: '❌ DM kutun kapalı olduğu için hesabı gönderemedim! Lütfen DM ayarlarını açıp tekrar dene.', 
                ephemeral: true 
            });
        }
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
