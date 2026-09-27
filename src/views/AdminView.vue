<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>Administración</h1>
    <ul>
      <li><RouterLink to="/admin/categorias">Categorías</RouterLink></li>
      <li><RouterLink to="/admin/productos">Productos</RouterLink></li>
      <li><span>Pedidos (próximamente)</span></li>
      <li><span>Usuarios (próximamente)</span></li>
    </ul>
  </main>
</template>
