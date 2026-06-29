import { createApp } from "vue";
import App from "./App.vue";
import { reveal } from "./directives/reveal";
import { counter } from "./directives/counter";
import "./styles/base.css";

createApp(App)
  .directive("reveal", reveal)
  .directive("count", counter)
  .mount("#app");
