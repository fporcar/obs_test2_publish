# obs_test2
 obs assignment
Introducción: se ha desarrollado en nodejs, el diseño es REST, la información del robot se persite en un fichero JSON en local que es el que se explota
Instalar con el siguiente comando desde la línea de comandos: npm install . -g
Ejecutar desde la línea de comandos: node obs_test2.js
Ejecutar para testearlo con ficheros desde la líena de comandos node index.js test_run_1.json test_sal_1.json 

El diseño es sencillo: 
BDD: un fichero json en el mismo repositorio que el ejecutable node (index.js). Idealmente habría que ponerlo mongoDB
API REST para añadir, consultar y modificar la información (Apoyandose en Node.js y Express)
Una función de servidor en escuha por el puerto 3001
Una función para ejecuar situaciones del robot proporcionado por fichero y la salida es un fichero

Las apis son:
   URI               METHOD         Acción
  /api/robots        POST           Crea un robot
  /api/robots        GET            Consulta el robot
  /api/:id           PUT            Ejecuta un comando F, B, R, L, S, E,...
  /api/battery       GET            Consulta la batería
  /api/commands      GET            Conslta los comandos (o acciones) del robot
  /api/location      GET            Consulta la localización en el mapa del robot  su dirección (face)
  /api/savefile      POST           Crea el fichero de salida 

La API donde se le da vida al robotes la de ejecución decomandos (/api/:id).

