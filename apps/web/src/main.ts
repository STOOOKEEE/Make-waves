import { createApp } from "vue";
import App from "./App.vue";
import { reveal } from "./directives/reveal";
import { magnetic } from "./directives/magnetic";
import { counter } from "./directives/counter";
import "./styles/base.css";

createApp(App)
  .directive("reveal", reveal)
  .directive("mag", magnetic)
  .directive("count", counter)
  .mount("#app");
