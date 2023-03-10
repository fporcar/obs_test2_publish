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
const axios = require('axios'); //.default;
const { exec } = require("child_process");
const fetch = require('node-fetch');
const path = require('path');
// también yargs

// PARAMETROS
const url = 'http://localhost:3001';
const port = 3001;
const robotsDB= "C:\\nodejs\\obs_test2\\robots.json";

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
// Se puede llamar desde la aplicación usamos axios, o desde el navegador o desde consola curl -i -X GET "http://localhost:3001/api/robots"
//

app.get('/api/commands', function(req, res) {
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      const myrobotcoms = JSON.parse(data);
      res.status(200).json( myrobotcoms.commands )
    }
  });
})

app.get('/api/location', function(req, res) {
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      const myrobotcoms = JSON.parse(data);
      res.status(200).json( myrobotcoms.initialPosition.location )
    }
  });
})




/////////////////////////////////////////////////
// API REST PUT METHOD. Comandos F, B, L, R, S, E
// El comando lo pasamos como parámetro para aprovechar el cuerpo de la función
//

app.put('/api/:comando', function(req, res) {
  
  var com= req.params.comando;
  
  console.log("INICIO ejecutando put http://localhost:3001/api/" + com);
  
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
      console.log("robosDB read, data=" + data);
      const myrobot = JSON.parse(data);
      
      
      const xinit= myrobot.initialPosition.location.x ;
      const yinit= myrobot.initialPosition.location.y ;
      if (! myrobot.hasOwnProperty("VisitedCells")) { // Si no existe, iniciar array
        //myrobot.VisitedCells = [{"x":xinit, "y":yinit}]
        myrobot.VisitedCells = [{"x":xinit, "y":yinit}]
      }
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
          console.log("robot charged battery!= ", myrobot);
          // Persistimos en "BDD", es un fichero texto con formato JSON
          //const myrobotOut = JSON.stringify(myrobot);
          //const myrobotOut = JSON.stringify(myrobot);
          //save(myrobotOut);
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
           // myrobot.battery = myrobot.battery - (['F','B'].includes(com)? 3 : 2); // F,B -3, R,L -2
            if (['F','B'].includes(com)) myrobot.battery = myrobot.battery - 3; else myrobot.battery = myrobot.battery - 2;
            myrobot.initialPosition.facing = newdir;
            // Añadimos la casilla visitada solo si F,B
            if (['F','B'].includes(com)) {      
              //if (! myrobot.hasOwnProperty("VisitedCells")) { // Si no existe, iniciar array
              //  myrobot.VisitedCells = [myrobot.initialPosition.location]
              //}  //  añadimos la nueva celda visitada
              myrobot.VisitedCells.push(myrobot.initialPosition.location)
              //}
            }
          } else {
            console.log("No se puede hacer movimiento, aplicar estrategias");
            console.log('BLOQUEADO. APLICAR ESTRATEGIAS.', err);
            console.log("FIN ejecutando put http://localhost:3001/api/" + com);
            return res.status(206).json(myrobot)
          }
        }
      }
      const myrobotOut = JSON.stringify(myrobot);
     
      fs.writeFile(robotsDB, myrobotOut, err => {
        if (err) {
          console.log('ERROR writing file', err)
          console.log("FIN ejecutando put http://localhost:3001/api/" + com);
          return res.status(400).json(myrobot)
        } else {
          console.log('Successfully wrote file. myrobotOut=' + myrobotOut)
          console.log("FIN ejecutando put http://localhost:3001/api/" + com);
          return res.status(200).json(myrobot)
        }
      })
    }    
  })
})


/////////////////////////////////////////////////
// API REST POST METHOD. savefile
// El fichero de salida lo pasamos como parámetro 
//

app.use(express.json());
//console.log('http://localhost:3001/api/savefile');
app.post('/api/savefile', function(req, res) {

  const fileout = JSON.stringify(req.body.data);
  console.log("api/savefile req.body.data= " + fileout  );
  
  fs.readFile(robotsDB, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(400).json("Error lectura file DB : " + robotsDB)
    } else {
      // Si lectura correcta creamos objetvo myrobot con JSON.parse
      const myrobot = JSON.parse(data);

      // Cambiamos la propiedad initialPosition por FinalPosition 
      myrobot.FinalPosition = myrobot.initialPosition;
      delete myrobot.initialPosition;

      // Persistimos en "BDD", es un fichero texto con formato JSON
      const myrobotOut = JSON.stringify(myrobot);
      const dir= path.dirname(fileout);
      const file= path.basename(fileout);
      
      fs.writeFile(path.join( dir, fileout).replace(/['"]+/g, ''), myrobotOut, err => {
      //fs.writeFile(fileout, myrobotOut, err => {
        if (err) {
          console.log('Error writing file', err);
          res.status(400).json(myrobot)
        } else {
          console.log('Successfully wrote file=' + fileout);
          res.status(200).json(myrobot)
        }
      })
    }
  })
  
})

/////////////////////////////////////////////////////



/////////////////////// EJECUTAR COMANDOS o TAMBIÉN UNA DE LAS ESTRATEGIAS


async function ejecutarcoms2(coms, location, fileOut) {
  
    const estrategias= [['E','R','F'],['E','L','F'],['E','L','L','F'],['E','B','R','F'],['E','B','B','L','F'],['E','F','F'],['E','F','L','F','F']];

    const locaux= location;
    var loc=location;
    //console.log("YYYYYYYYYYYYYYYYYYYYYYYY location= " + location.x + " " +location.y);
    //console.log("OOOOOOOOOOOOOOOOOOOOOOOO coms= " + coms);
    
    
    estrategia = false; // inicialmente no es necesaria
    com=0; // indice comandos
    
    do {
      
      next = true; 
      estrategia = false; // inicialmente no es necesaria
      while (next && com < coms.length ) {
        //axios.put('http://localhost:3001/api/E');
        console.log(com + ' - http://localhost:3001/api/' + coms[com] );
        const out =  await fetch('http://localhost:3001/api/' + coms[com] , { method: 'PUT' })
          .then(  (res) => { 
            console.log('ejecutar comandos. res=' + res); 
            if (res.status == 206) {
              next = false;
              estrategia = true
            };
            return res })
          .catch( (err) =>  { 
            console.log("ejecutar comandos. err=" + err); 
            next=false;
            return err })  
        com++;
      } 
  
      // Ejecutamos estrategias si necesario, el primer bucle es para recorrer
      // la lista de estrategias hasta que se encuentre una que saca del bloqueo al robot.
      // El segundo bucle ejecuta los comandos de la estrategia
      if ( estrategia ) {
        nextest=true;
        est=0; // indice estrategias
        while (nextest && est < estrategias.length ) {
          nextcomest = true;
          est=estrategias[est];  
          comest=0;
          while ( nextcomest && comest < est.length ) {
            console.log(est + ' - http://localhost:3001/api/' + est[comest] );
            const out =  await fetch('http://localhost:3001/api/' + est[comest] , { method: 'PUT' })
              .then(  (res) => { 
                console.log('ejecutar comandos. res=' + res); 
                if (res.status == 206) {
                  nextcomest = false;
                } /*else {
                  estOK=true;
                };*/
                return res })
              .catch( (err) =>  { 
                console.log("ejecutar comandos. err=" + err); 
                nextcomest=false;
                nextest=false;
                next=false;
                return err })  
            comest++;
          }
          if (comest == est.length && nextcomest ) { // Un existo la estrategia, no ejecutamos más.
            nextest= false;
            next= true; // Si quedan comandos continuamos con su ejecución

          }
          est++;
        }
      }
    } while ( next && com < coms.length  )

    // Guardamos resultado en fichero de salido llamando a la api/savefile
    const params = {
      fileout: fileOut,
      param2: 'pruebaparam2'
    };
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify( params )  
    }

    console.log('Hello!!! http://localhost:3001/api/savefile ' + fileOut);
    axios.post('http://localhost:3001/api/savefile', {
      //robot
      //data: JSON.stringify(robot)
      data : fileOut
    })
    .then(function (response)  {
      console.log('response= ' + response);
      return response 
    })
    .catch(function (err)  {
      console.log('err=' + err);
      return err
    } )
    /* const out =  await fetch('http://localhost:3001/api/savefile'  , 
      { method : 'POST',  headers: { 'Content-Type': 'application/json'}, body : { fileout : 'a_ver_porfavor' }  })
      .then(  (res) => { 
        console.log('ejecutar comandos. res=' + res); 
        return res })
      .catch( (err) =>  { 
        console.log("ejecutar comandos. err=" + err); 
        return err }) 
     */
}


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

    // Ejecutar comandos
    var ejecresul=ejecutarcoms2(rob.commands, rob.initialPosition.location, fileOut);
    // Guardar fichero de salida para los tests
    console.log("savefile fileOut=" + fileOut);
    
    //var fileTestOut= savefiletest(fileOut);
  })
  .catch(function (error) {
    console.log(error);
  })

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
  // En modo test matamos al servidor
  // fkill -f :3001
  //exec('fill -f :3001');
  //console.log("pid= "+ process.pid)
  //break;
} 
////////////////////////////////////    FIN ROBOT IN MARS ////////////////////////////////////////////


