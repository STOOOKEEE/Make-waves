import { createApp } from "vue";
import App from "./App.vue";
import { reveal } from "./directives/reveal";
import { counter } from "./directives/counter";
import { startPlausible } from "./lib/plausible";
import "./styles/base.css";

startPlausible();

createApp(App)
  .directive("reveal", reveal)
  .directive("count", counter)
  .mount("#app");
