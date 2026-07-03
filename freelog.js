const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Yetkili Rol ID'lerin
const IZINLI_ROLLER = ['1521129473863450664', '1521129242094473337', '1520486297527910420'];

// 1. Hesap Üretici Fonksiyon
function rastgeleHesap(kategori) {
    const domainler = ["@gmail.com", "@outlook.com", "@yandex.com", "@hotmail.com"];
    const random = Math.floor(Math.random() * 999999);
    return `${kategori.toLowerCase()}_${random}${domainler[Math.floor(Math.random() * domainler.length)]}:Pass${random + 5555}`;
}

// 2. Menü Oluşturucu
async function sendFreeLogMenu(interaction) {
    // Rol Kontrolünü menü açılırken yapıyoruz ki yetkisiz kimse menüyü göremesin
    const hasRole = interaction.member.roles.cache.some(r => IZINLI_ROLLER.includes(r.id));
    if (!hasRole) {
        return interaction.reply({ 
            content: '❌ Bu menüyü kullanmak için **Invite+, VIP veya Booster** rollerinden birine sahip olmalısın!', 
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

// 3. İşlem Yapıcı (DM gönderimi)
async function handleFreeLog(interaction) {
    if (interaction.customId === 'free_log_menu') {
        const kategori = interaction.values[0];
        const hesap = rastgeleHesap(kategori);
        const stokMiktari = Math.floor(Math.random() * (500 - 100 + 1) + 100);

        try {
            await interaction.user.send(`🎉 **Black Market - Free Log Teslimatı**\n\n**Kategori:** ${kategori.toUpperCase()}\n**Stok:** ${stokMiktari} Adet\n**Hesap:** \`${hesap}\`\n\n*İyi kullanımlar!*`);
            
            // Burayı interaction.update yaptık ki Discord 'ikinci kez cevap veriyorsun' diye çökmesin
            await interaction.update({ 
                content: `✅ **${kategori.toUpperCase()}** kategorisinden **${stokMiktari}** stok arasından bir hesap DM kutuna gönderildi!`, 
                components: [], // Menüyü ekrandan kaldırır
                ephemeral: true 
            });
        } catch (e) {
            await interaction.followUp({ 
                content: '❌ DM kutun kapalı olduğu için hesabı gönderemedim!', 
                ephemeral: true 
            });
        }
    }
}

module.exports = { handleFreeLog, sendFreeLogMenu };
