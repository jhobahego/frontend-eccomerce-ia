<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'
import { useOrdersStore } from '../stores/orders'

const cart = useCartStore()
const orders = useOrdersStore()

const address = ref('')
const city = ref('')
const country = ref('')
const postalCode = ref('')
const phone = ref('')
const billingAddress = ref('')
const billingCity = ref('')
const billingCountry = ref('')
const billingPostalCode = ref('')
const notes = ref('')
const paymentMethod = ref('tarjeta')

const isBlocked = computed(() => cart.validation !== null && !cart.validation.valid)

function lineName(productId: number): string {
  const line = cart.cart?.items.find((entry) => entry.product_id === productId)
  return line?.product.name ?? `Artículo ${productId}`
}

async function confirm(): Promise<void> {
  await orders.placeOrder({
    shipping_address: address.value,
    shipping_city: city.value,
    shipping_country: country.value,
    shipping_postal_code: postalCode.value,
    shipping_phone: phone.value,
    billing_address: billingAddress.value,
    billing_city: billingCity.value,
    billing_country: billingCountry.value,
    billing_postal_code: billingPostalCode.value,
    notes: notes.value,
    payment_method: paymentMethod.value,
  })
}

function retry(): void {
  void confirm()
}

onMounted(() => {
  orders.reset()
  void (async () => {
    await cart.loadCart()
    if ((cart.cart?.items.length ?? 0) > 0) {
      await cart.validateStock()
    }
  })()
})
</script>

<template>
  <main>
    <h1>Confirmar pedido</h1>
    <template v-if="orders.order !== null">
      <p>¡Pedido creado!</p>
      <p>
        Número de pedido: <strong>{{ orders.order.order_number }}</strong>
      </p>
      <p>Total: {{ formatAmount(orders.order.total_amount) }}</p>
      <p><RouterLink to="/">Volver al inicio</RouterLink></p>
    </template>
    <template v-else>
      <p v-if="cart.loading || orders.placing">Cargando…</p>
      <p v-else-if="cart.cart === null || cart.cart.items.length === 0">
        Tu cesta está vacía.
        <RouterLink to="/catalogo">Ver catálogo</RouterLink>
      </p>
      <template v-else>
        <p>
          {{ cart.cart.total_items }} artículos — Total:
          {{ formatAmount(cart.cart.total_amount) }}
        </p>
        <div v-if="isBlocked" role="alert">
          <p>Hay artículos sin disponibilidad. Ajusta tu cesta para continuar.</p>
          <ul>
            <li v-for="issue in cart.validation?.issues ?? []" :key="issue.product_id">
              {{ lineName(issue.product_id) }}: pides {{ issue.requested }}, hay
              {{ issue.available }}
            </li>
          </ul>
          <p><RouterLink to="/cesta">Volver a la cesta</RouterLink></p>
        </div>
        <form @submit.prevent="confirm">
          <div>
            <label for="checkout-address">Dirección de envío</label>
            <input
              id="checkout-address"
              v-model="address"
              type="text"
              name="shipping-address"
              autocomplete="street-address"
              required
              :aria-invalid="orders.fieldErrors['shipping_address'] !== undefined"
              :aria-describedby="
                orders.fieldErrors['shipping_address'] !== undefined
                  ? 'checkout-address-error'
                  : undefined
              "
            />
            <p
              v-if="orders.fieldErrors['shipping_address'] !== undefined"
              id="checkout-address-error"
              role="alert"
            >
              {{ orders.fieldErrors['shipping_address'] }}
            </p>
          </div>
          <div>
            <label for="checkout-city">Ciudad</label>
            <input
              id="checkout-city"
              v-model="city"
              type="text"
              name="shipping-city"
              autocomplete="address-level2"
              required
              :aria-invalid="orders.fieldErrors['shipping_city'] !== undefined"
              :aria-describedby="
                orders.fieldErrors['shipping_city'] !== undefined
                  ? 'checkout-city-error'
                  : undefined
              "
            />
            <p
              v-if="orders.fieldErrors['shipping_city'] !== undefined"
              id="checkout-city-error"
              role="alert"
            >
              {{ orders.fieldErrors['shipping_city'] }}
            </p>
          </div>
          <div>
            <label for="checkout-country">País</label>
            <input
              id="checkout-country"
              v-model="country"
              type="text"
              name="shipping-country"
              autocomplete="country-name"
              required
              :aria-invalid="orders.fieldErrors['shipping_country'] !== undefined"
              :aria-describedby="
                orders.fieldErrors['shipping_country'] !== undefined
                  ? 'checkout-country-error'
                  : undefined
              "
            />
            <p
              v-if="orders.fieldErrors['shipping_country'] !== undefined"
              id="checkout-country-error"
              role="alert"
            >
              {{ orders.fieldErrors['shipping_country'] }}
            </p>
          </div>
          <div>
            <label for="checkout-postal">Código postal</label>
            <input
              id="checkout-postal"
              v-model="postalCode"
              type="text"
              name="shipping-postal"
              autocomplete="postal-code"
              required
              :aria-invalid="orders.fieldErrors['shipping_postal_code'] !== undefined"
              :aria-describedby="
                orders.fieldErrors['shipping_postal_code'] !== undefined
                  ? 'checkout-postal-error'
                  : undefined
              "
            />
            <p
              v-if="orders.fieldErrors['shipping_postal_code'] !== undefined"
              id="checkout-postal-error"
              role="alert"
            >
              {{ orders.fieldErrors['shipping_postal_code'] }}
            </p>
          </div>
          <div>
            <label for="checkout-phone">Teléfono (opcional)</label>
            <input
              id="checkout-phone"
              v-model="phone"
              type="tel"
              name="shipping-phone"
              autocomplete="tel"
            />
          </div>
          <div>
            <label for="checkout-billing-address">Dirección de facturación (opcional)</label>
            <input id="checkout-billing-address" v-model="billingAddress" type="text" />
          </div>
          <div>
            <label for="checkout-billing-city">Ciudad de facturación (opcional)</label>
            <input id="checkout-billing-city" v-model="billingCity" type="text" />
          </div>
          <div>
            <label for="checkout-billing-country">País de facturación (opcional)</label>
            <input id="checkout-billing-country" v-model="billingCountry" type="text" />
          </div>
          <div>
            <label for="checkout-billing-postal">Código postal de facturación (opcional)</label>
            <input id="checkout-billing-postal" v-model="billingPostalCode" type="text" />
          </div>
          <div>
            <label for="checkout-notes">Notas (opcional)</label>
            <textarea id="checkout-notes" v-model="notes" />
          </div>
          <div>
            <label for="checkout-payment">Método de pago</label>
            <select id="checkout-payment" v-model="paymentMethod">
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="contrareembolso">Contrareembolso</option>
            </select>
          </div>
          <p v-if="orders.error !== null" role="alert">
            {{ orders.error.message }}
            <button type="button" @click="retry()">Reintentar</button>
          </p>
          <button type="submit" :disabled="orders.placing || isBlocked">Confirmar pedido</button>
        </form>
      </template>
    </template>
  </main>
</template>
