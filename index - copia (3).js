//#!/usr/bin/env node
//////////////////////////////////// INICIO ROBOT IN MARS ////////////////////////////////////////////
// Usamos algunas librerías utiles: 
// fs para la lectura y escritura de ficheros en el servidor
// express para generar fácilemnte un API REST
// yargs para el manejo de los argumentos del programa desde la cosnola
// axios es un cliente hhtp

// LIBRERIAS
const fs = require('fs');
const express = require('express')
const app = express()
const axios = require('axios').default;
const { exec } = require("child_process");
// también yargs

// PARAMETROS
const port = 3001
const robotsDB= "C:\\nodejs\\obs_test2\\robots.json"

// Leemos y validamos los argumentos haciendo uso del paquete yargs
var argv = require('yargs/yargs')(process.argv.slice(2))
    .check((argv, options) => {
       const filePaths = argv._
       if ( filePaths.length != 2 && filePaths.length != 0  ) {
          throw new Error("Arguments are 0 or 2 with the path to a valid input file and to a valid output file")
       //} else if (filePaths.length == 2 && !(argv._[0] !== "" && argv._[0] !== "") ){
       //   throw new Error("It has to be a valid file")
       } else {
         return true // tell Yargs that the arguments passed the check
       }
     })
    .argv;

// A continuación si no hay parametros entonces actuamos como un servidor REST API, o si vienen dos parámetros ejectuamos los comandos del robot en el json a serializar como un objeto js cuya salida será otro objeto js que escribiremos a un fichero texto .json

//console.dir(argv);
const num_args= argv._.length;


///////////////// SERVIDOR (listener) //////////////////////
app.listen(port, () => {
 //console.log(`Example app listening on port ${port}`)
});



/////////////////////////////////////////////////
// API REST POST METHOD. Crea el robot. 
// Ejemplo de llamada desde consola: 
// curl -i -X POST "http://localhost:3001/api/robots" -H "Content-Type:application/json" -d @c:\nodejs\obs_test1\robotpost.json
//
app.use(express.json());
app.post('/api/robots', function(req, res) {

  const robotpost = JSON.stringify(req.body.data)
  console.log("req.body.data= " + robotpost  );

  fs.writeFile(robotsDB, robotpost,  err => {
      if (err) {
          console.log('Error writing file robotpost.json');
          res.status(500).json("Error 500: Not created the robot because error writing in fileDB: " + robotpost) 
      } else {
          console.log('Successfully robotpost created with REST POST');
          res.status(201).json(robotpost) 
      }
  })  
})


/////////////////////////////////////////////////
// API REST GEST METHOD. Consultar el robot
// Se puede llamar desde el navegador o desde consola curl -i -X GET "http://localhost:3001/api/robots"
//
app.get('/api/robots', function(req, res) {
  //const robotpost = JSON.stringify(req.body)
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      const myrobot = JSON.parse(data);
      res.status(200).json(myrobot)
    }
  });
})

/////////////////////////////////////////////////
// API REST GEST METHOD. Consultar los comandos
// Se puede llamar desde el navegador o desde consola curl -i -X GET "http://localhost:3001/api/robots"
//
//app.use(express.json());
//app.use(express.json());
app.get('/api/commands', function(req, res) {
  //const DBaux = JSON.parse(req.body.data)
  //const DBaux = JSON.parse(req.body)
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      //console.log("DBaux = " + DBaux);
      //const aux = JSON.stringify(data);
      //console.log("aux = " + aux);
      console.log("data = " + data);
      const myrobotcoms = JSON.parse(data);
      //const coms = myrobot.commands
      //console.log("coms= " + myrobot);
      //res.status(200).json( {myrobot.commands} )
      res.status(200).json( myrobotcoms.commands )
      //res.status(200).json( data.commands );
    }
  });
})

/////////////////////////////////////////////////
// API REST PUT METHOD. Comandos F, B, L, R, S, E
// El comando lo pasamos como parámetro para aprovechar el cuerpo de la función
//
app.get('/api/:comando', function(req, res) {

  var com= req.params.comando;
  // Validamos comando
  if ( ! ['F', 'B', 'R', 'L', 'S', 'E'].includes(com) ) {
    res.status(400).json("comando no conocido: " + com + " comando debe ser: F, B, R, L, S, E. Ver ayuda");
    return
  }
  // Si comando valido continuamos
  // Leemos la "BDD" que es un fichero json, el mismo fichero será 
  // el que se persista con modificaciones acorde a los comandos reciidos
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      // Si lectura correcta creamos objetvo myrobot con JSON.parse
      const myrobot = JSON.parse(data);
      
      let x= myrobot.initialPosition.location.x ;
      let y= myrobot.initialPosition.location.y ;
      let direccion= myrobot.initialPosition.facing ;
      let terreno= myrobot.terrain ;
      let maxX= myrobot.terrain[0].length-1;
      let maxY= myrobot.terrain.length-1;
      let terinit = myrobot.terrain[y][x];
      let bat = myrobot.battery;

      // Comporbamos que tiene batería suficinete para llevar la acción y además
      // tiene 1 más para podr recargar la batería
      // Nunca el robot se debe quedar a cero, mínimo 1 de batería para poder recargar
      // Aún así controlamos por si se produjera un error inesperado que tiene 1 para recargar

      // Check first battery for the action!!!
      if  (!(  ((['F', 'B'].includes(com)) && bat >= 4) || 
            ((['L', 'R'].includes(com)) && bat >= 3) || 
            (com == 'S' &&  bat >= 9 ) ||
            (com == 'E' &&  bat >= 1 )))     {
        console.log("WARNING: SIN BATERÍA PARA REALIZAR ACCIÓN. EJECUTE ACCIÓN 'S' PARA RECARGAR BATERIA.");
      } else { // Tiene batería y ejecutamos acción si no se sale del terreno o tiene un obstaculo

        // Comando recargar
        if (com == 'E') {
          myrobot.battery = bat+9  // Se recargan 10 pero se consume 1 de la acción
        // Comando recoger muestra
        } else if ( com == 'S') {
          // Coger muestra consume 8
          myrobot.battery = bat - 8;
         if (myrobot.hasOwnProperty("SamplesCollected")) { 
            myrobot.SamplesCollected.push(terinit)
          } else {
            myrobot.SamplesCollected = [terinit]
          }
        // Comando Forward o Backward, or turn right or left
        } else if ( ['F','B','L','R'].includes(com) ) {
          var newdir = direccion;
          if (direccion == "East") {
            if ( com == 'F') x++;
            else if (com == 'B') x--;
            else if (com == 'R') newdir="South";
            else if (com == 'L') newdir="North"
          } else if (direccion == "West") {
            if ( com == 'F') x--;
            else if (com == 'B') x++;
            else if (com == 'R') newdir="North";
            else if (com == 'L') newdir="South"
          } else if (direccion == "North") {
            if ( com == 'F') y--;
            else if (com == 'B') y++;
            else if (com == 'R') newdir="East";
            else if (com == 'L') newdir="West"
          } else if (direccion == "South") {
            if ( com == 'F') y++;
            else if (com == 'B') y--;
            else if (com == 'R') newdir="West";
            else if (com == 'L') newdir="East"
          } else {
            console.err("direccion: " + direccion + " no conocida, debe ser East, West, North o South: ")
          }
        
          // Validamos si el movimiento es posible: dentro del terreno y no es obstaculo la siguiente casilla
          if (( 0 <= x  && 0 <= y ) && (x <= maxX && y <= maxY) && (myrobot.terrain[y][x] != "Obs")   ) {
            myrobot.initialPosition.location.x = x;
            myrobot.initialPosition.location.y = y;
            myrobot.battery = myrobot.battery - (['F','B'].includes(com)? 3 : 2); // F,B -3, R,L -2
            myrobot.initialPosition.facing = newdir;
            // Añadimos la casilla visitada solo si F,B
            if (['F','B'].includes(com)) {      
              if (! myrobot.hasOwnProperty("visitedCells")) { // Si no existe, iniciar array
                myrobot.visitedCells = [myrobot.initialPosition.location]
              } else {  // Si existe entonces añadimos la celda visitada
                myrobot.visitedCells.push(myrobot.initialPosition.location)
              }
            }
          } else {
            console.log("No se puede hacer movimiento, aplicar estrategias");
          }
        }
      }
      
      // Persistimos en "BDD", es un fichero texto con formato JSON
      const myrobotOut = JSON.stringify(myrobot);
      fs.writeFile(robotsDB, myrobotOut, err => {
        if (err) {
          console.log('Error writing file', err)
        } else {
          console.log('Successfully wrote file')
        }
      })
      res.status(200).json(myrobot)
    }    
  })
})

/////////////////////////////////////////////////////


// FUNCTIONS TO CALL APIs desde CONSOLA (TERMINAL)
function postRequest(robot, fileOut)
{
  axios.post('http://localhost:3001/api/robots', {
    //robot
    //data: JSON.stringify(robot)
    data : robot
  })
  .then(function (response) {
    
    // Una vez creado el robot en la BDD, recogemos el robot creado primero, luego ejecutamos comandos, y persistimos el resultado
    //console.log("typeof response.data= " + typeof(response.data) + " response.data= " + response.data);
    //const jsonOut = JSON.stringify(response.data);
    const rob = JSON.parse(response.data);
    console.log("typeof rob= " + typeof(rob) + " rob= " + rob);

//    // Ejecutar comandos
//    for (let com in rob.commands) {
//      //var resput= axios.put('http://localhost:3001/api/' + rob.commands[com] , {} );
//      var resput= axios.put('http://localhost:3001/api/E');
//      //console.log('http://localhost:3001/api/' + rob.commands[com] );
//      console.log('http://localhost:3001/api/E');
//      console.log("resput= " + resput);
//    //}; 
       

    // Persistir resultdo
    const jsonOut= JSON.stringify(rob);
    fs.writeFile(fileOut, jsonOut, err => {
    //fs.writeFile(fileOut, JSON.parse(response.data), err => {
      if (err) {
          console.log('Error writing file', err)
      } else {
          console.log('Successfully wrote file= ' + fileOut)
      }
    })
  })
  .catch(function (error) {
    console.log(error);
  })
  .then(function () {
  });
}


//////////////// TEST ROBOT API REST CON FICHERO DE ENTRADA Y RESULTADO EN SALIDA ////////////////
// Si en arugmentos tenemos un fichero de entrada valido ejecutamos los comandos
// y guradamos o bien el fichero del segundo parametro o uno por defecto
// igual que el primero pero con extensión .out
if (num_args == 2) {
  const filejsonIn= argv._[0];
  const filejsonOut=argv._[1];

  // Leemos el fichero de entrada y lo convertimos en un objeto js
  fs.readFile(filejsonIn, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return false;
    } else {
      const robotIn= JSON.parse(data);
      // hacemos la llamada al API REST POST con el robot como objeto, y el nombre del fichero de salida
      postRequest(robotIn, filejsonOut)
    }
  });

/*
  // Ejecutar comandos
  //var rescoms= axios.get('http://localhost:3001/api/commands');
  var rescoms = exec('curl -i -X GET "http://localhost:3001/api/commands"', (error, stdout) => {
    console.log("stdout: " + stdout );
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    } else {
      //console.log("stdout: " + stdout );
      //return stdout.body;
    }
  });
  console.log("rescoms= " + rescoms);
*/

  axios.get('http://localhost:3001/api/commands',{})
  .then(res => {
    //const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
    //console.log('Status Code:', res.status);
    //console.log('Date in Response header:', headerDate);
    //console.log('res.data= ' + res.data);
    const coms = res.data;

    for(com of coms) {
      console.log(`Got com with id: ${com}`);
    }
  })
  .catch(err => {
    console.log('Error: ', err.message);
  });


  //var coms= rescoms.data;
  //console.log("coms= " + coms);
  //console.log("type of coms= " + typeof(coms) + " length= " + coms.length);
  //for (let com in rob.commands) {
  //for (let com in rescoms) {
    //var resput= axios.put('http://localhost:3001/api/' + rob.commands[com] , {} );
    //var resput= axios.put('http://localhost:3001/api/E');
    ////console.log('http://localhost:3001/api/' + rescoms[com] );
    //console.log('http://localhost:3001/api/E');
    //console.log("resput= " + resput);
  //};

  // Matamos al servidor
} 
////////////////////////////////////    FIN ROBOT IN MARS ////////////////////////////////////////////


