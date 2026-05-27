import { initRouter, registerRoute } from "./router.js";
import { initTheme } from "./theme.js";
import * as home from "./home.js";
import * as compress from "./compress.js";

registerRoute("", home);
registerRoute("compress", compress);

initTheme();
initRouter();
