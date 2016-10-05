/*
* Uses data from the micro:bit magnetormeter to display compass directions
*
* Author: Martin Woolley, @bluetooth_mdw
*
* Example:
*
* sudo node compass.js
*
* micro:bit hex file must include the Bluetooth Magnetometer Service
*
* http://bluetooth-mdw.blogspot.co.uk/p/bbc-microbit.html for hex files and micro:bit information
*
*/

var BBCMicrobit = require('bbc-microbit')

var period = 160; // ms
var last_compass_point_name = "";

var COMPASS_POINT_DELTA = 22.5;

var COMPASS_POINTS = [
            "N",
            "NNE",
            "NE",
            "ENE",
            "E",
            "ESE",
            "SE",
            "SSE",
            "S",
            "SSW",
            "SW",
            "WSW",
            "W",
            "WNW",
            "NW",
            "NNW"
    ];

var net = require('net');

var server = net.createServer();
server.on('connection', handleConnection);

server.listen(9000, function() {
    console.log('server listening to %j', server.address());
});

function handleConnection(conn) {
    var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
    var mybit = null;
    console.log('new client connection from %s', remoteAddress);

    conn.on('data', onConnData);
    conn.once('close', onConnClose);
    conn.on('error', onConnError);

    function onConnData(d) {
        console.log('connection data from %s: %j', remoteAddress, d);

    }

    function onConnClose() {
        if (mybit != null){
            mybit.disconnect(function () { console.log("disconnected from microbit")});
            conn = null;
        }
        console.log('connection from %s closed', remoteAddress);

    }

    function onConnError(err) {
        console.log('Connection %s error: %s', remoteAddress, err.message);
    }

    console.log('Scanning for microbit');
    BBCMicrobit.discover(function (microbit) {
        mybit = microbit;
        console.log('\tdiscovered microbit: id = %s, address = %s', microbit.id, microbit.address);

        microbit.on('disconnect', function () {
            console.log('\tmicrobit disconnected!');
            /*process.exit(0);*/
        });

        microbit.on('magnetometerBearingChange', function (bearing) {
            var point_name = compassPoint(bearing);
            if (point_name !== last_compass_point_name) {
                var reply = {compass_point:point_name, bearing:bearing};
                if (conn != null) {
                    conn.write(JSON.stringify(reply)+"\n");
                }
                console.log(JSON.stringify(reply));

                last_compass_point_name = point_name;
            }
        });

        console.log('connecting to microbit');
        microbit.connectAndSetUp(function () {
            console.log('\tconnected to microbit');

            console.log('setting magnetometer period to %d ms', period);
            microbit.writeMagnetometerPeriod(period, function () {
                console.log('\tmagnetometer period set');

                console.log('subscribing to magnetometer bearing');
                microbit.subscribeMagnetometerBearing(function () {
                    console.log('\tsubscribed to magnetometer bearing');
                });
            });
        });
    });
}
function compassPoint(bearing) {
  var d = bearing / COMPASS_POINT_DELTA;
  var name_inx = Math.floor(d);
  if (d - name_inx > 0.5) {
      name_inx++;
  }
  if (name_inx > 15) {
      name_inx = 0;
  }
  return COMPASS_POINTS[name_inx];
}
