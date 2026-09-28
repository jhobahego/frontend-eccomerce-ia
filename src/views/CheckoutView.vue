<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle2, RotateCcw } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'
import { useOrdersStore } from '../stores/orders'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

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
  <main class="mx-auto w-full max-w-3xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Confirmar pedido</h1>
      <p class="text-muted-foreground text-sm">Dirección de envío y pago para cerrar la compra.</p>
    </div>
    <Card v-if="orders.order !== null">
      <CardContent class="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 class="size-10 text-green-600" aria-hidden="true" />
        <p class="text-lg font-semibold">¡Pedido creado!</p>
        <p class="text-sm">
          Número de pedido: <strong>{{ orders.order.order_number }}</strong>
        </p>
        <p class="text-sm">Total: {{ formatAmount(orders.order.total_amount) }}</p>
        <p class="text-sm">
          <RouterLink to="/" class="text-primary font-medium hover:underline"
            >Volver al inicio</RouterLink
          >
        </p>
      </CardContent>
    </Card>
    <template v-else>
      <p v-if="cart.loading || orders.placing" class="text-muted-foreground text-sm">Cargando…</p>
      <Card v-else-if="cart.cart === null || cart.cart.items.length === 0">
        <CardContent class="py-8 text-center text-sm">
          Tu cesta está vacía.
          <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
            >Ver catálogo</RouterLink
          >
        </CardContent>
      </Card>
      <template v-else>
        <Card>
          <CardContent class="font-medium">
            {{ cart.cart.total_items }} artículos — Total:
            {{ formatAmount(cart.cart.total_amount) }}
          </CardContent>
        </Card>
        <Alert v-if="isBlocked" variant="destructive">
          <AlertTitle>Sin disponibilidad</AlertTitle>
          <AlertDescription class="space-y-2">
            <p>Hay artículos sin disponibilidad. Ajusta tu cesta para continuar.</p>
            <ul class="list-disc pl-5">
              <li v-for="issue in cart.validation?.issues ?? []" :key="issue.product_id">
                {{ lineName(issue.product_id) }}: pides {{ issue.requested }}, hay
                {{ issue.available }}
              </li>
            </ul>
            <p>
              <RouterLink to="/cesta" class="font-medium underline">Volver a la cesta</RouterLink>
            </p>
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Envío y facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="confirm">
              <div class="grid gap-1.5 sm:col-span-2">
                <Label for="checkout-address">Dirección de envío</Label>
                <Input
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
                  class="text-destructive text-xs"
                >
                  {{ orders.fieldErrors['shipping_address'] }}
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-city">Ciudad</Label>
                <Input
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
                  class="text-destructive text-xs"
                >
                  {{ orders.fieldErrors['shipping_city'] }}
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-country">País</Label>
                <Input
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
                  class="text-destructive text-xs"
                >
                  {{ orders.fieldErrors['shipping_country'] }}
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-postal">Código postal</Label>
                <Input
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
                  class="text-destructive text-xs"
                >
                  {{ orders.fieldErrors['shipping_postal_code'] }}
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-phone">Teléfono (opcional)</Label>
                <Input
                  id="checkout-phone"
                  v-model="phone"
                  type="tel"
                  name="shipping-phone"
                  autocomplete="tel"
                />
              </div>
              <div class="sm:col-span-2"><Separator /></div>
              <div class="grid gap-1.5 sm:col-span-2">
                <Label for="checkout-billing-address">Dirección de facturación (opcional)</Label>
                <Input id="checkout-billing-address" v-model="billingAddress" type="text" />
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-billing-city">Ciudad de facturación (opcional)</Label>
                <Input id="checkout-billing-city" v-model="billingCity" type="text" />
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-billing-country">País de facturación (opcional)</Label>
                <Input id="checkout-billing-country" v-model="billingCountry" type="text" />
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-billing-postal">Código postal de facturación (opcional)</Label>
                <Input id="checkout-billing-postal" v-model="billingPostalCode" type="text" />
              </div>
              <div class="grid gap-1.5">
                <Label for="checkout-payment">Método de pago</Label>
                <select
                  id="checkout-payment"
                  v-model="paymentMethod"
                  class="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="contrareembolso">Contrareembolso</option>
                </select>
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <Label for="checkout-notes">Notas (opcional)</Label>
                <Textarea
                  id="checkout-notes"
                  v-model="notes"
                  placeholder="Instrucciones de entrega…"
                />
              </div>
              <Alert v-if="orders.error !== null" variant="destructive" class="sm:col-span-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription class="flex flex-wrap items-center gap-3">
                  {{ orders.error.message }}
                  <Button type="button" size="sm" variant="outline" @click="retry()">
                    <RotateCcw class="size-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
              <div class="sm:col-span-2">
                <Button
                  type="submit"
                  :disabled="orders.placing || isBlocked"
                  class="w-full sm:w-auto"
                  >Confirmar pedido</Button
                >
              </div>
            </form>
          </CardContent>
        </Card>
      </template>
    </template>
  </main>
</template>
