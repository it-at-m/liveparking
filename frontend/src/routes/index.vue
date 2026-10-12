<template>
  <v-container class="fill-height">
    <v-row class="text-center">
      <v-col>
        <h1 class="text-display-medium font-weight-bold">
          {{ t("app.name") }}
        </h1>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
