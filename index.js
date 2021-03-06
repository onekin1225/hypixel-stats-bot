const mineflayer = require('mineflayer')
const hypixel = require('hypixel-api-nodejs');
const getJSON = require('get-json')
require('dotenv').config()
const blacklisted = [
  "skoorpi"
]
//const express = require('express')
//const app = express()
//const port = 3000

/*app.get('/', (req, res) => {
  res.send({message:"App has kept alive",code:1,success:true})
})

app.listen(port, () => {
  console.log(`Keep Alive app listening`)
})

setInterval(() => {
  getJSON("https://diligent-highfalutin-rayon.glitch.me", (error, response) => {
    if(error) console.log(error);
  })
}, 200000)*/

runBot();

function runBot() {

  let partyQue = [];
  let gettingMembers = false;
  let partyMembers = [];
  let alreadyChecked = false;

  let bot = mineflayer.createBot({
    host: "mc.hypixel.net",   // optional
    port: 25565,         // optional
    username: process.env.EMAIL,
    password: process.env.PASSWORD,
    auth: 'mojang' // optional; by default uses mojang, if using a microsoft account, set to 'microsoft'
  });

  bot.on("error", (error) => {
    console.log(error);
  });

  // auto reconnect feature
  bot.on('end', (packet) => {
    runBot();
  })

  bot.on('disconnect', (packet) => {
    runBot();
  })

  bot.on('kick_disconnect', (packet) => {
    runBot();
  })

  console.log("Connected!");

  setTimeout(() => {
    bot._client.write("chat", {message:"/limbo"});
  }, 5000);

  bot.on('message', function (messageJson) {
      let message;
      if(messageJson.json.text) message = messageJson.json.text;
      else message = "";
      if(messageJson.json.extra != undefined){
        messageJson.json.extra.forEach(val => {
          message += val.text;
        })
      }
    console.log(message);
    if(messageJson.json.text == "From "){
      message = message.replace("From ", "");
      let sender;
      if(message.split(":")[0].split(" ").length == 2){
        sender = message.split(":")[0].split(" ")[1];
      //} else if(message.split(":")[0].split(" ").length == 3){
      //  
      } else {
        sender = message.split(":")[0]
      }
      
      let cmd = message.split(":")[1];
      let args = cmd.split(" ");
      args.shift();
      
      if(args.length == 0) return sendMessage(sender, "Specify a command (message the bot 'help' for a list of commands)")
      
      if(args[0].toLowerCase() == "help"){
        sendMessage(sender, "List of commands: <gamemode> [player], about");
      } else if(args[0].toLowerCase() == "about" || args[0].toLowerCase() == "author"){
        sendMessage(sender, "Made by cqptain, Repo - https://github.com/captaincrazybro/hypixel-stats-bot");
      } else {
        getStats(sender, args);
      }
      
    } else if(message.includes("has invited you to join")){
      if(message.includes(":")) return;
      let player = message.split("\n")[1].split(" ")[0];
      if(blacklisted.includes(player.toLowerCase())) return;
      if(player.includes("[")) player = message.split("\n")[1].split(" ")[1];
      partyQue.push(player);
      if(partyQue.length == 1){
        startParty();
      }
    } else if((message.startsWith("Party Leader") || message.startsWith("Party Moderator") || message.startsWith("Party Member")) && gettingMembers){
      if(!message.includes(":")) return;
      let players = message.split(":")[1].split(" ");
      players.shift();
      players = players.join(" ");
      players = players.split(" ● ");
      players.forEach(player => {
        if(player == "") return;
        if(player.includes(" ●")) player.replace(" ●", "");
        if(player.includes("[")) player = player.split(" ")[1];
        else player = player.split(" ")[0];
        if(player != "statsbot") partyMembers.push(player);
      })
      if(!alreadyChecked){
        alreadyChecked = true;
        setTimeout(() => {
          /*getJSON("https://api.mojang.com/users/profiles/minecraft/" + partyMembers[0], (error, response) => {
            if(error) console.log(error);
            else {
              getJSON(`https://api.hypixel.net/status?key=${process.env.APIKEY}&uuid=${response.id}`, (error, status) => {
                if(error) console.log(error);
                else {
                if(status.session.gametype != undefined && (status.session.gametype == "BEDWARS")){*/
          let success = false;
          partyMembers.forEach((val, i) => {
            getJSON('https://api.mojang.com/users/profiles/minecraft/' + val, (error, response) => {
              if(error) {
                console.log(error);
                nextParty();
              } else {
                getJSON(`https://api.hypixel.net/status?key=${process.env.APIKEY}&uuid=${response.id}`, (error, status) => {
                  if(error) {
                    console.log(error);
                    nextParty();
                  } else {
                    //console.log(status);
                    hypixel.getPlayerByUuid(process.env.APIKEY, response.id).then(obj => {
                      let gamemode = capitalize(status.session.gameType)
                      if(gamemode == "Skywars") gamemode = "SkyWars";
                      if(obj.player == null || obj.player.stats == null){
                        bot._client.write("chat", {message:"/pchat The bot encountered a temporary problem, please try again"})
                        nextParty();
                        return;
                      }
                      let stats = obj.player.stats[gamemode];
                      setTimeout(() => {
                      switch(gamemode){
                          case("Bedwars"):{
                            bot._client.write("chat", {message:`/pchat ${val}'s ${gamemode} Stats - Level: ${obj.player.achievements.bedwars_level}, WS: ${stats.winstreak}, Finals: ${stats.final_kills_bedwars}, FKDR: ${Number.parseFloat(stats.final_kills_bedwars/stats.final_deaths_bedwars).toFixed(2)}, Wins: ${stats.wins_bedwars}, Beds: ${stats.beds_broken_bedwars}`})
                            break;
                          }
                          case("SkyWars"):{
                            bot._client.write("chat", {message:`/pchat ${val}'s ${gamemode} Stats - Level: ${obj.player.achievements.skywars_you_re_a_star}, WS: ${stats.winstreak}, Wins: ${stats.wins}, Kills: ${stats.kills}, WLR: ${Number.parseFloat(stats.wins/stats.losses).toFixed(2)}, KDR: ${Number.parseFloat(stats.kills/stats.deaths).toFixed(2)}`});
                            break;
                          }
                          case("Duels"):{
                            bot._client.write("chat", {message:`/pchat ${val}'s ${gamemode} Stats - WS: ${stats.current_winstreak}, Wins: ${stats.wins}, Kills: ${stats.kills}, WLR: ${Number.parseFloat(stats.wins/stats.losses).toFixed(2)}, KDR: ${Number.parseFloat(stats.kills/stats.deaths).toFixed(2)}`})
                            break;
                          }
                        default:{
                          bot._client.write("chat", {message:"/pchat Unfortunately, the " + gamemode + " gamemode is not yet supported"})
                          break;
                        }
                      }
                        if(i == (partyMembers.length - 1)){
                          nextParty();
                        }
                      }, i * 1000);
                    })
                  }
                })
              }
            })
          });
          if(success) bot._client.write("chat", {message:"/pchat #InfluxOP"});
                /*} else {
                  bot._client.write("chat", {message:"Unfortunately, this gamemode is not yet support"})
                  alreadyChecked = false;
                  partyMembers = []
                  gettingMembers = false;
                  partyQue.shift()
                  bot._client.write("chat", {message:"/party leave"})
                }*/
              //}
              //})
            //}
          //})
        }, 2500)
      }
    }
  })

  function getStats(sender, args){
    let gamemode = capitalize(args[0]);
    
    if(gamemode == "Skywars") gamemode = "SkyWars";
    
    let player;
    
    if(args.length == 1) player = sender;
    else player = args[1];
    
    //console.log('https://api.mojang.com/users/profiles/minecraft/' + player);
    
    /*getJSON('https://api.mojang.com/users/profiles/minecraft/' + player, (error, response) => {
      if(error) {
        console.log(error);
        nextParty();
      } else {
        console.log(response);*/
        hypixel.getPlayerByName(process.env.APIKEY, player).then(obj => {
          //console.log(obj);
          if(!obj.success) {
            console.log("invalid player");
            return sendMessage(sender, "Invalid player - " + player + " is not a valid player");
          }
          if(obj.player == null || obj.player.stats == null) {
            console.log("temporary");
            return sendMessage(sender, "The bot encountered a temporary problem while fetching " + player + ", please try again");
          }
          let stats = obj.player.stats[gamemode];
          //console.log(stats);
          if(stats == undefined) {
            console.log("gamemode invalid")
            return sendMessage(sender, "Invalid gamemode while fetching " + player);
          }
          player = obj.player.playername;
          switch(gamemode){
            case("Duels"):{
              console.log("duels");
              sendMessage(sender, `${player}'s ${gamemode} stats - WS: ${stats.current_winstreak}, Best WS: ${stats.best_overall_winstreak}, Wins: ${stats.wins}, Losses: ${stats.losses}, Kills: ${stats.kills}, Deaths: ${stats.deaths}, WLR: ${Number.parseFloat(stats.wins/stats.losses).toFixed(2)}, KDR: ${Number.parseFloat(stats.kills/stats.deaths).toFixed(2)} #InfluxOP`);
              break;
            }
            case("Bedwars"):{
              console.log("bedwars");
              sendMessage(sender, `${player}'s ${gamemode} stats - Level: ${obj.player.achievements.bedwars_level}, XP: ${stats.Experience}, WS: ${stats.winstreak}, Finals Kills: ${stats.final_kills_bedwars}, Final Deaths: ${stats.final_deaths_bedwars}, Kills: ${stats.kills_bedwars}, Deaths: ${stats.deaths_bedwars}, Wins: ${stats.wins_bedwars}, Losses: ${stats.losses_bedwars}, Beds: ${stats.beds_broken_bedwars}` +
                        `, FKDR: ${Number.parseFloat(stats.final_kills_bedwars/stats.final_deaths_bedwars).toFixed(2)}, WLR: ${Number.parseFloat(stats.wins_bedwars/stats.losses_bedwars).toFixed(2)} #InfluxOP`)
              break;
            }
            case("SkyWars"):{
              console.log("skywars");
              sendMessage(sender, `${player}'s ${gamemode} stats - Level: ${obj.player.achievements.skywars_you_re_a_star}, XP: ${stats.skywars_experience}, ` +
              `Wins: ${stats.wins}, Losses: ${stats.losses}, ` +
              `Kills: ${stats.kills}, Deaths: ${stats.deaths}, ` +
              `WLR: ${Number.parseFloat(stats.wins/stats.losses).toFixed(2)}, KDR: ${Number.parseFloat(stats.kills/stats.deaths).toFixed(2)} #InfluxOP`)
              break;
            }
            default:{
              console.log("default");
              success = false;
              sendMessage(sender, `Unfortunately, stats for this gamemode are not yet supported`)
              break;
            }
          }
        })
      /*}
    })*/
    
  }

  function sendMessage(username, message){
    //console.log(`To ${username}: ${message}`)
    bot._client.write("chat", {message:`/msg ${username} ${message}`});
  }

  function capitalize(string){
    string = string.toLowerCase();
    string = string.charAt(0).toUpperCase() + string.slice(1)
    return string;
  }

  setTimeout(() => {
    bot._client.write("chat", {message:"/p leave"});
  }, 2000);

  function startParty(){
    bot._client.write("chat", {message:"/party accept " + partyQue[0]});
    gettingMembers = true;
    setTimeout(() => {
      bot._client.write("chat", {message:"/party list"})
    }, 500);
  }

  function nextParty(){
    alreadyChecked = false;
    partyMembers = []
    gettingMembers = false;
    partyQue.shift()
    setTimeout(() => {
      bot._client.write("chat", {message: "/pchat #InfluxOP"})
    }, 1000);
    setTimeout(() => {
      bot._client.write("chat", {message:"/party leave"})
    }, 2000);
    if(partyQue.length != 0) startParty();
  }

}