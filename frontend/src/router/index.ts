import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useUserStore } from "@/stores/user";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { title: "登录", requiresAuth: false },
  },
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: { title: "仪表盘", icon: "DashboardOutlined" },
      },
      {
        path: "elderly",
        name: "Elderly",
        component: () => import("@/views/Elderly.vue"),
        meta: {
          title: "老人管理",
          icon: "UserOutlined",
          roles: ["admin", "worker"],
        },
      },
      {
        path: "orders",
        name: "Orders",
        component: () => import("@/views/Orders.vue"),
        meta: { title: "订单管理", icon: "ShoppingCartOutlined" },
      },
      {
        path: "canteens",
        name: "Canteens",
        component: () => import("@/views/Canteens.vue"),
        meta: { title: "助餐点管理", icon: "ShopOutlined", roles: ["admin"] },
      },
      {
        path: "subsidy",
        name: "Subsidy",
        component: () => import("@/views/Subsidy.vue"),
        meta: {
          title: "补贴报表",
          icon: "FileTextOutlined",
          roles: ["admin", "worker"],
        },
      },
      {
        path: "dishes",
        name: "Dishes",
        component: () => import("@/views/Dishes.vue"),
        meta: {
          title: "菜品库管理",
          icon: "CoffeeOutlined",
          roles: ["admin"],
        },
      },
      {
        path: "menu-scheduling",
        name: "MenuScheduling",
        component: () => import("@/views/MenuScheduling.vue"),
        meta: {
          title: "每周菜单排期",
          icon: "CalendarOutlined",
          roles: ["admin", "canteen"],
        },
      },
      {
        path: "today-menu",
        name: "TodayMenu",
        component: () => import("@/views/TodayMenu.vue"),
        meta: {
          title: "今日菜单",
          icon: "MenuOutlined",
          roles: ["admin", "canteen", "worker"],
        },
      },
      {
        path: "dish-analysis",
        name: "DishAnalysis",
        component: () => import("@/views/DishAnalysis.vue"),
        meta: {
          title: "菜品销量分析",
          icon: "BarChartOutlined",
          roles: ["admin", "canteen"],
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  userStore.initFromStorage();

  if (!userStore.isLoggedIn && to.meta.requiresAuth !== false) {
    next({ path: "/login", query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.roles && userStore.userInfo?.role) {
    const roles = to.meta.roles as string[];
    if (!roles.includes(userStore.userInfo.role)) {
      next("/dashboard");
      return;
    }
  }

  if (to.path === "/login" && userStore.isLoggedIn) {
    next("/dashboard");
    return;
  }

  next();
});

export default router;
