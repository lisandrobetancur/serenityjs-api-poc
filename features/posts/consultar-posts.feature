# language: es
Característica: Consultar publicaciones
  Como consumidor de la API
  Quiero consultar las publicaciones existentes
  Para mostrarlas en mi aplicación

  Escenario: Listar todas las publicaciones
    Cuando Ana consulta todas las publicaciones
    Entonces ella debería recibir una respuesta con estado 200
    Y ella debería ver al menos una publicación

  Escenario: Consultar una publicación por su identificador
    Cuando Ana consulta la publicación con id 1
    Entonces ella debería recibir una respuesta con estado 200
    Y ella debería ver la publicación con id 1

  Escenario: Consultar una publicación inexistente
    Cuando Ana consulta la publicación con id 999999
    Entonces ella debería recibir una respuesta con estado 404
