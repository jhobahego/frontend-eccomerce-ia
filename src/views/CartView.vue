<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'

const cart = useCartStore()

function reload(): void {
  void cart.loadCart()
}

function decrease(itemId: number, quantity: number): void {
  void cart.updateLine(itemId, quantity - 1)
}

function increase(itemId: number, quantity: number): void {
  void cart.updateLine(itemId, quantity + 1)
}

function remove(itemId: number): void {
  void cart.removeLine(itemId)
}

function clear(): void {
  void cart.clearCart()
}

onMounted(() => {
  void cart.loadCart()
})
</script>

<template>
  <main>
    <h1>Cesta</h1>
    <p v-if="cart.loading">Cargando…</p>
    <p v-else-if="cart.error !== null" role="alert">
      {{ cart.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <template v-else-if="cart.cart === null || cart.cart.items.length === 0">
      <p>Tu cesta está vacía.</p>
      <p>Empieza por el <RouterLink to="/catalogo">catálogo</RouterLink>.</p>
    </template>
    <template v-else>
      <ul>
        <li v-for="line in cart.cart.items" :key="line.id">
          <h2>{{ line.product.name }}</h2>
          <p>{{ formatAmount(line.unit_price) }} cada uno</p>
          <p>
            <button
              type="button"
              :aria-label="`Quitar uno de ${line.product.name}`"
              @click="decrease(line.id, line.quantity)"
            >
              −
            </button>
            {{ line.quantity }}
            <button
              type="button"
              :aria-label="`Añadir uno de ${line.product.name}`"
              @click="increase(line.id, line.quantity)"
            >
              +
            </button>
          </p>
          <p>Subtotal: {{ formatAmount(line.subtotal) }}</p>
          <button type="button" @click="remove(line.id)">Quitar</button>
        </li>
      </ul>
      <p>{{ cart.cart.total_items }} artículos — Total: {{ formatAmount(cart.cart.total_amount) }}</p>
      <button type="button" @click="clear()">Vaciar cesta</button>
      <p><RouterLink to="/catalogo">Seguir comprando</RouterLink></p>
    </template>
  </main>
</template>
