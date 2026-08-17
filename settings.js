require('dotenv').config();

const settings = {
  packname: 'Knight Bot',
  author: '‎',
  botName: "Knight Bot",
  botOwner: 'Professor', // Your name
  ownerNumber: process.env.OWNER_NUMBER || '919876543210', // Country code + number, without + or spaces
  giphyApiKey: process.env.GIPHY_API_KEY || '',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.7",
  updateZipUrl: "https://github.com/mruniquehacker/Knightbot-MD/archive/refs/heads/main.zip",
};

module.exports = settings;
