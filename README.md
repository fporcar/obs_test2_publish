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

1) Para instalarlo:

Descargar ficheros del repositorio de github y donde se hayan copiado ejecutar: 
node install . -g

2) Para probarla ejecutar los dos ficheros de pruebas, para terminar Ctrl+C pues se deja en escucha por si se quiere lanzar alguna petición:
node index.js test_run_1.json c:\nodejs\obs_test2\test_sal_1.json  > test1.log 2>&1
node index.js test_run_2.json c:\nodejs\obs_test2\test_sal_2.json  > test2.log 2>&1

3) Para ejecutarlo en producción:
node index.js
O bien 
node index.js mirobot.json resultado.out
Donde mirobot.json sería el fichero que da vida a la primera instancia del robot y el resultado sería el resultado de la ejecución de los comandos si los hubiera.

WARNING!: No ejecutar modo test en entorno productivio pues machacaría el fichero de BDD con el de entrada. Se podría cambiar pero se deja así
por si se quiere inicializar el robot con un fichero desde la línea de comandos y luego dejarlo en escucha.

IMPORTANTE!: Siempre se queda persistido el robot en el fichero robots.json en el mismo directorio que el programa. (

Concertando cita se puede hacer una demo del mismo. 

Autor: Francisco Porcar
