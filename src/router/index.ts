import { createRouter, createWebHashHistory } from 'vue-router'

import experDefault from '../view/exper/template.vue';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "experment",
      component: experDefault
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("../view/error/index.vue"),
    }
  ]
});

export default router;
