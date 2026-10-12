<template>
  <v-app>
    <the-snackbar-queue />
    <v-main>
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import TheSnackbarQueue from "@/components/TheSnackbarQueue.vue";
</script>
