<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>Administración</h1>
    <ul>
      <li><RouterLink to="/admin/categorias">Categorías</RouterLink></li>
      <li><RouterLink to="/admin/productos">Productos</RouterLink></li>
      <li><RouterLink to="/admin/pedidos">Pedidos</RouterLink></li>
      <li><RouterLink to="/admin/usuarios">Usuarios</RouterLink></li>
    </ul>
  </main>
</template>
