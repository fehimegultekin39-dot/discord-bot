const client = require('./index.js'); // Ana dosyadan client'ı çekiyoruz
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Kusurlu, inandırıcı son basamaklara sahip rastgele büyük rakamlar üreten algoritma
function gercekciSayiUret(min, max, sonBasamaklar = [3, 4, 6, 7, 8]) {
    let sayi = Math.floor(Math.random() * (max - min + 1)) + min;
    const son = sonBasamaklar[Math.floor(Math.random() * sonBasamaklar.length)];
    return Math.floor(sayi / 10) * 10 + son; 
}

// Bot her çalıştığında kusursuz derecede inandırıcı rastgele devasa havuz sayıları yüklenir
const panelVerileri = {
    free: {
        craftrise: gercekciSayiUret(5500, 7500),
        disney: gercekciSayiUret(180000, 220000),
        exxen: gercekciSayiUret(9000, 11000),
        netflix: gercekciSayiUret(58000, 65000),
        steam: gercekciSayiUret(25000, 31000),
        valorant: gercekciSayiUret(9500, 12000),
        itemsatis: gercekciSayiUret(2800, 3500)
    },
    premium: {
        craftrise: gercekciSayiUret(15000, 18000),
        disney: gercekciSayiUret(390000, 420000),
        exxen: gercekciSayiUret(19000, 22000),
        netflix: gercekciSayiUret(115000, 130000),
        steam: gercekciSayiUret(55000, 62000),
        valorant: gercekciSayiUret(105000, 115000),
        itemsatis: gercekciSayiUret(5500, 6800)
    },
    booster: {
        craftrise: gercekciSayiUret(31000, 35000),
        disney: gercekciSayiUret(800000, 830000),
        exxen: gercekciSayiUret(29000, 32000),
        netflix: gercekciSayiUret(175000, 190000),
        steam: gercekciSayiUret(85000, 92000),
        valorant: gercekciSayiUret(320000, 340000),
        itemsatis: gercekciSayiUret(14000, 16000)
    }
};

// Paneli sunucuya basmak için chat komutu (!log-panel)
client.on('messageCreate', async (message) => {
    if (message.content === '!log-panel') {
        if (!message.member.permissions.has('Administrator')) return;

        const embed = new EmbedBuilder()
            .setColor('#1e1f22') // Tam Discord arayüzü uyumlu koyu arka plan tonu
            .setTitle('Nexus — Generator Panel')
            .setDescription('Aşağıdan generator tipini seç, ardından kategori butonuna bas.\nHesap doğrudan **DM kutuna** gönderilir. 📬\n\n' +
                '🆓 **Free** — Herkes kullanabilir\n' +
                '💎 **Premium** — Premium veya Booster rolü gerekir\n' +
                '🚀 **Booster** — Booster rolü gerekir\n\n' +
                '--------------------------------------------------')
            .addFields(
                { 
                    name: '🆓 Free (7 kategori)', 
                    value: `• **CRAFTRISE** —\n${panelVerileri.free.craftrise} hesap\n• **DISNEY+** —\n${panelVerileri.free.disney} hesap\n• **EXXEN** —\n${panelVerileri.free.exxen} hesap\n• **NETFLIX** —\n${panelVerileri.free.netflix} hesap\n• **STEAM** —\n${panelVerileri.free.steam} hesap\n• **VALORANT** —\n${panelVerileri.free.valorant} hesap\n• **İTEMSATIŞ** —\n${panelVerileri.free.itemsatis} hesap`, 
                    inline: true 
                },
                { 
                    name: '💎 Premium (7 kategori)', 
                    value: `• **CRAFTRISE** —\n${panelVerileri.premium.craftrise} hesap\n• **DISNEY+** —\n${panelVerileri.premium.disney} hesap\n• **EXXEN** —\n${panelVerileri.premium.exxen} hesap\n• **NETFLIX** —\n${panelVerileri.premium.netflix} hesap\n• **STEAM** —\n${panelVerileri.premium.steam} hesap\n• **VALORANT** —\n${panelVerileri.premium.valorant} hesap\n• **İTEMSATIŞ** —\n${panelVerileri.premium.itemsatis} hesap`, 
                    inline: true 
                },
                { 
                    name: '🚀 Booster (7 kategori)', 
                    value: `• **CRAFTRISE** —\n${panelVerileri.booster.craftrise} hesap\n• **DISNEY+** —\n${panelVerileri.booster.disney} hesap\n• **EXXEN** —\n${panelVerileri.booster.exxen} hesap\n• **NETFLIX** —\n${panelVerileri.booster.netflix} hesap\n• **STEAM** —\n${panelVerileri.booster.steam} hesap\n• **VALORANT** —\n${panelVerileri.booster.valorant} hesap\n• **İTEMSATIŞ** —\n${panelVerileri.booster.itemsatis} hesap`, 
                    inline: true 
                }
            )
            .setFooter({ text: `🔒 Nexus Generator System • Bugün saat 13:07` });

        // Gönderdiğin resimdeki buton düzeni (Mavi, Yeşil, Kırmızı)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nexus_gen_free')
                .setLabel('Free Generator')
                .setEmoji('🆓')
                .setStyle(ButtonStyle.Primary), 
            new ButtonBuilder()
                .setCustomId('nexus_gen_premium')
                .setLabel('Premium Generator')
                .setEmoji('💎')
                .setStyle(ButtonStyle.Success), 
            new ButtonBuilder()
                .setCustomId('nexus_gen_booster')
                .setLabel('Booster Generator')
                .setEmoji('🚀')
                .setStyle(ButtonStyle.Danger) 
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// Buton Etkileşim Kontrolleri
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'nexus_gen_free') {
        await interaction.reply({ content: '🆓 **Free kategorileri başarıyla yüklendi!** DM kutunuz kapalıysa hesap iletilemez.', flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId === 'nexus_gen_premium') {
        await interaction.reply({ content: '❌ **Erişim Engellendi:** Bu generator tipini kullanabilmek için sunucumuzda **Premium** veya **Booster** rolüne sahip olmalısınız!', flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId === 'nexus_gen_booster') {
        await interaction.reply({ content: '❌ **Erişim Engellendi:** Bu kategoriye yalnızca sunucumuza takviye yapmış olan **Booster** üyelerimiz erişebilir.', flags: MessageFlags.Ephemeral });
    }
});
