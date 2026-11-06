# language: es
Característica: Gestionar publicaciones
  Como autor
  Quiero crear y eliminar publicaciones
  Para mantener mi contenido actualizado

  Escenario: Crear una nueva publicación
    Cuando Bruno crea una publicación con los siguientes datos:
      | userId | title              | body                                   |
      | 1      | Screenplay pattern | Actors, abilities, tasks and questions |
    Entonces él debería recibir una respuesta con estado 201
    Y él debería ver la publicación con título "Screenplay pattern"

  Escenario: Eliminar una publicación existente
    Cuando Bruno elimina la publicación con id 1
    Entonces él debería recibir una respuesta con estado 200
