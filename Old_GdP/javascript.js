 function mostrarMiniaturas(event) {
        // Limpiar la sección de miniaturas
        document.getElementById("miniaturas").innerHTML = "";
        
        // Obtener la lista de archivos seleccionados
        var archivos = event.target.files;
        
        // Iterar sobre la lista de archivos
        for (var i = 0; i < archivos.length; i++) {
          var archivo = archivos[i];
          
          // Crear un objeto FileReader para leer el archivo
          var lector = new FileReader();
          
          // Agregar un evento load para mostrar la miniatura
          lector.onload = function(evento) {
            var miniatura = document.createElement("img");
            miniatura.src = evento.target.result;
            document.getElementById("miniaturas").appendChild(miniatura);
          };
          
          // Leer el archivo como una URL de datos
          lector.readAsDataURL(archivo);
        }
      }

