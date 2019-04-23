var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

const VALUES = require('./VALUES');
const Section = require('./coord/Section');
const User = require('./coord/User');

class Worker extends SCWorker {
  run() {

    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    process.scServer = this.scServer;

    process.usersInThisWorkersSections = {}; // list of all users that are being watched (because they exist in a section on this worker)

    process.oneDimensionSections = [];
    process.twoDimensionSections = [];

    if (environment === 'dev') {

    }

    app.use(serveStatic(path.resolve(__dirname, 'public')));
    /*
    app.get('/', (req, res) => {
      res.json({pid: process.pid});
    }); 
    */

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    console.log('   >> id: ' + this.id);

    // if id === 0, it is the leader worker... this can be used to coordinate other workers

    var count = 0;

    /*
      In here we handle our incoming realtime connections and listen for events.
    */

    // IMPORTANT - CHECKS USER
    scServer.addMiddleware(scServer.MIDDLEWARE_SUBSCRIBE,
      function (req, next) {

        var subRes = req.channel.substring(0,2);

        console.log(req.socket.username + " is subscribing to \"" + req.channel + "\"");

        switch(subRes) {
          case "cl": { // for server -> client messages
            if("cl_" + req.socket.username === req.channel) {
              console.log("allowing subscription request");
              next();
            } else {
              console.log("unauthorized subscribe request");
              next("unauthorized");
            }
          } break;

          case "au_": {  // authorized for testing
            next();
          } break;         
        }
      }
    );

    scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, (req, next) => {

        //console.log("publishing in...");

        var channelCode = req.channel.substring(0,2);
          switch(channelCode) {
            case "sv_": {
              //if("sv_" + req.socket.username === req.channel) {

                // todo: check the socket's user object for chars it owns

                next();
              //}    
            } break;

            default: {
              next();
            } break;
          }
      }
    );

    scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_OUT, (req, next) => {
        //todo: Check if this is triggered when a server publishes using exchange
        //console.log("publishing out...");

        //console.log(req);

        next();

      }
    );

    scServer.on('connection', function (socket) {

      // Server code

      // This is a slightly simplified version of what it might look
      // like if you were using MySQL as a database.

      socket.on('login', function (credentials, respond) {
        var password = credentials.password;
        var username = credentials.username;
        
        socket.isAuthenticated = true;
        
        // user should be instantiated here 

        socket.username = username;

        socket.user = new User(username);



        // allow user to join channel

        // send back confirmation 
        respond();
      });

      socket.on('testtest', (data) => {
        console.log("OK: " + data[0]);
      });

      // actual logic here
      socket.on('enter realm', (data) => {  

        // 1 char for now
        var entityname = data[0];

        var username = socket.username;

        console.log("received enter realm msg");  

        //scServer.exchange.publish('cl_alice123', "testing exchange publish");

        // some test x, y, hp parameters; normally these would be obtained from a database        

        // hard coded
        var x = VALUES.SECTION_WIDTH * 7 + 10;
        var y = VALUES.SECTION_HEIGHT * 7 + 10;
        var hp = 100;

        // lets place it in hard coded section for now

        var col = Math.floor(x / VALUES.SECTION_WIDTH);
        var row = Math.floor(y / VALUES.SECTION_HEIGHT);

        console.log("enter realm: col: " + col + " row: " + row);

        // instantiate char
        //var char = new Char(username, charname, x, y, hp);



        // TODO - each worker should have an up to date array of each section and which worker is responsible for it
        // then publish only to that worker in particular (by using wk_workerID channelName)
        // the workerID is sent by the coordinator server to each worker when it first connects (it is a unique ID, maybe a uuid)

        var channelName = 'wkr_section_' + col + ',' + row;
        console.log("channelName: " + channelName);

        // broadcast these cols and rows on a worker shared channel
        scServer.exchange.publish(channelName, [
           "enter world",
           username,
           entityname,
           x,
           y,
           hp
        ]);

        //process.twoDimensionSections[col][row].addChar(char);

        // first a helper method to convert x,y to col,row is required


        // send a reply about user's position


      });

      // sample connections here

      socket.on('subscribe', (data, res) => {
        console.log("inside subscribe handler " + socket.id + " for channel: " + data);
      });

      // Some sample logic to show how to handle client events,
      // replace this with your own logic

      socket.on('sampleClientEvent', function (data) {
        count++;
        console.log('Handled sampleClientEvent', data);
        scServer.exchange.publish('sample', count);
      });

     // var interval = setInterval(function () {
        /*socket.emit('random', {
          number: Math.floor(Math.random() * 5)
        });
      }, 1000);*/

      socket.on('disconnect', function () {
        //clearInterval(interval);
      });
    });

    /* Connection with coordinator here */

    // todo - attempt reconnection upon the event of a disconnect
    // using setInterval with ping messages sent

    const WebSocket = require('ws');

    var ws = new WebSocket('ws://localhost:7778');

    ws.on('open', () => {
      console.log("on connection");

      ws.send(JSON.stringify({msgCode: "coordinator auth req", secret: "426y098585u2eqwfavsnaerkqq35w"}));
    });

    ws.on('message', dataString => {
      //console.log(data);

      var data = JSON.parse(dataString);

      switch(data.msgCode) {

        case "init sections": {
          // todo, iterate through the sections object and instantiate the sections on the worker side
          // perhaps populate them with test npcs, tiles from a json map

          var sections = data.sections;
          var noOfCols = data.noOfCols;
          var sectionsArr = Object.values(sections);

          for(var i = 0; i < noOfCols; i++) {
            process.twoDimensionSections[i] = [];
          }

          // should receive sections as an array to be honest

          var sectionChannels = [];

          for(var i = 0; i < sectionsArr.length; i++) {
            
            var sectionX = sectionsArr[i].x * VALUES.SECTION_WIDTH;
            var sectionY = sectionsArr[i].y * VALUES.SECTION_HEIGHT;

            console.log("created section for " + sectionsArr[i].num + " at " + sectionX + ", " + sectionY);

            // todo: actually instantiate a section object now and add it to an object
            var section = new Section(sectionsArr[i].num, sectionsArr[i].x, sectionsArr[i].y);

            // add it to both single dimensional array 
            process.oneDimensionSections[sectionsArr[i].num] = section;

            //and two dimensional array
            process.twoDimensionSections[sectionsArr[i].x][sectionsArr[i].y] = section;

            console.log('wkr_section_' + sectionsArr[i].x + ',' + sectionsArr[i].y);

            //scServer.exchange.publish('wkr_section_' + sectionX + ',' + sectionY, "hello");

          }

        } break;

        case "move sections": {

        } break;

      }

      //console.log(data);
    });

    var frameLength = 1000 / 30; // divide by 60 for 60 fps
    var newFrameTime = 0;
    var prevFrameTime = 0;

    const update = (currentTime, deltaTime) => {
      //console.log("updating: " + deltaTime);

      process.oneDimensionSections.forEach(section => {
        section.update(deltaTime);
      });

      // update worlds
     // process.worldManager.update(deltaTime, currentTime);
      //process.userManager.update(deltaTime);
    }

    const timeUpdate = () => {

      var hrTime = process.hrtime()
      var currentTime = hrTime[0] * 1000 + hrTime[1] / 1000000;

      //var currentTime = Date.now();

      if(currentTime > newFrameTime) {
        var deltaTime = currentTime - prevFrameTime;
        deltaTime /= 1000;

        update(currentTime, deltaTime);

        prevFrameTime = currentTime;
        newFrameTime = currentTime + frameLength;
      }  
    }

    setInterval(timeUpdate, 1);


    // run 1 client that attaches to one worker
    // for coordinating mmo server


    // wait some amount of time after startup, then 





















  }
  
}

new Worker();
